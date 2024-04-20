
import { TypedDataDomain, Wallet, ethers } from 'ethers'
import { AllowanceTransfer, PERMIT2_ADDRESS, PermitSingle } from '@uniswap/permit2-sdk'
import { Permit2Permit } from '@uniswap/universal-router-sdk/dist/utils/inputTokens'
import { UNIVERSAL_ROUTER_ADDRESS } from '@uniswap/universal-router-sdk'

import { ERC20_ABI, PERMIT2_ABI } from './constants'
import { toDeadline, toReadableAmount } from './utils'
import { SwapConfiguration } from './core'


// 1 view network call
export async function getPermitSingle(config: SwapConfiguration, wallet: Wallet) {
    const tokenAddress = config.inputToken.address
    const spenderAddress = UNIVERSAL_ROUTER_ADDRESS(config.env.chainId)

    const permit2Contract = new ethers.Contract(
        PERMIT2_ADDRESS,
        PERMIT2_ABI,
        wallet
    )

    const [ permitAmount, expiration, nonce ] = await permit2Contract.allowance(wallet.address, tokenAddress, spenderAddress)
    // Check amount/expiration here to see if you are already permitted -
    // May not need to generate a new signature.
    // if (permitAmount >= amount && expiration > Date.now()) {
    //     return false
    // }

    const newPermitSingle: PermitSingle = {
        details: {
            token: tokenAddress,
            amount: config.amountIn,
            // You may set your own deadline - we use 30 days.
            expiration: toDeadline(config.permitExpiration),
            nonce: BigInt(nonce),
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
export async function approvePermit2(config: SwapConfiguration, wallet: Wallet, messageArray: Array<string>) {
    const tokenContract = new ethers.Contract(
        config.inputToken.address,
        ERC20_ABI,
        wallet
    )

    const allowance_data = await tokenContract.allowance(wallet.address, PERMIT2_ADDRESS)
    messageArray.push(String(allowance_data))
    const allowance = BigInt(allowance_data)
    messageArray.push("Current Permit2 allowance: ", toReadableAmount(allowance, config.inputToken))

    // If we already have enough allowance
    if (allowance >= config.amountIn) return

    // Need to approve Permit2 to spend the tokens
    messageArray.push("Min. additional allowance required: ", toReadableAmount(config.amountIn - allowance, config.inputToken))

    if (!config.autoApprovePermit2 || !config.permit2ApprovalAmount) {
        messageArray.push("autoApprovePermit2 set to false. Aborting.")
        throw new Error("Not enough allowance for permit2!")
    }
    messageArray.push("Requesting approval for amount: ", toReadableAmount(config.permit2ApprovalAmount, config.inputToken))

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
        throw new Error("Permit2 Approval transaction failed!")
    }
}
