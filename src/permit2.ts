
import { TypedDataDomain, Wallet, ethers } from 'ethers'
import { AllowanceProvider, AllowanceTransfer, PERMIT2_ADDRESS, PermitSingle } from '@uniswap/permit2-sdk'
import { Permit2Permit } from '@uniswap/universal-router-sdk/dist/utils/inputTokens'

import { ERC20_ABI } from './constants'
import { toDeadline, toReadableAmount } from './utils'
import { SwapConfiguration } from './UniversalRouter'
import { UNIVERSAL_ROUTER_ADDRESS } from '@uniswap/universal-router-sdk'


// 1 view network call
export async function getPermitSingle(config: SwapConfiguration, wallet: Wallet) {
    const tokenAddress = config.inputToken.address
    const spenderAddress = UNIVERSAL_ROUTER_ADDRESS(config.env.chainId)

    const nonce = await wallet.getNonce()
    // const allowanceProvider = new AllowanceProvider(wallet.provider, PERMIT2_ADDRESS)
    // const { amount: permitAmount, expiration, nonce } = await allowanceProvider.getAllowanceData(tokenAddress, wallet.address, spenderAddress);

    // Check amount/expiration here to see if you are already permitted -
    // May not need to generate a new signature.
    // if (permitAmount >= amount && expiration > Date.now()) {
    //     return false
    // }
    // console.log("permitAmount: ", toReadableAmount(permitAmount, config.inputToken))
    // console.log("expiration: ", expiration)

    const newPermitSingle: PermitSingle = {
        details: {
            token: tokenAddress,
            amount: config.amountIn,
            // You may set your own deadline - we use 30 days.
            expiration: toDeadline(config.permitExpiration),
            nonce,
        },
        spender: spenderAddress,
        // You may set your own deadline - we use 30 minutes.
        sigDeadline: toDeadline(config.permitSigExpiration)
    }

    const { domain, types, values } = AllowanceTransfer.getPermitData(newPermitSingle, PERMIT2_ADDRESS, config.env.chainId)

    // We use an ethers signer to sign this data:
    const _domain: TypedDataDomain = {
        ...domain,
        chainId: domain.chainId?.toString(),
        salt: domain.salt?.toString()
    }
    const signature = await wallet.signTypedData(_domain, types, values)

    const newPermit: Permit2Permit = {
        ...newPermitSingle,
        signature
    }

    return newPermit
}

// 1 view call
// 1 transaction - min. 4 network calls
export async function approvePermit2(config: SwapConfiguration, wallet: Wallet) {
    const tokenContract = new ethers.Contract(
        config.inputToken.address,
        ERC20_ABI,
        wallet
    )

    const allowance = BigInt(await tokenContract.allowance(wallet.address, PERMIT2_ADDRESS))
    console.log("Current Permit2 allowance: ", toReadableAmount(allowance, config.inputToken))

    // If we already have enough allowance
    if (allowance >= config.amountIn) return true

    // Need to approve Permit2 to spend the tokens
    console.error("Not enough allowance!")
    console.log("Min. additional allowance required: ", toReadableAmount(config.amountIn - allowance, config.inputToken))

    if (!config.autoApprovePermit2 || !config.permit2ApprovalAmount) {
        console.log("autoApprovePermit2 set to false. Aborting.")
        return false
    }
    console.log("Requesting approval for amount: ", toReadableAmount(config.permit2ApprovalAmount, config.inputToken))

    // TODO: Confirm we have enough ETH for the tx!
    // maxFeePerGas: MAX_FEE_PER_GAS,
    // maxPriorityFeePerGas: MAX_PRIORITY_FEE_PER_GAS,

    // Grant allowance for specified amount
    const transaction = await tokenContract.approve(
        PERMIT2_ADDRESS,
        config.permit2ApprovalAmount
    )

    const receipt = await transaction.wait();
    if (receipt.status === 0) {
        console.error("Approval transaction failed!")
        return false
    }
    return true
}
