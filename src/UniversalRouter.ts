
import { ethers } from 'ethers'
import { Percent, Token, ChainId } from '@uniswap/sdk-core'
import { FeeAmount } from '@uniswap/v3-sdk'
import { SwapRouter, UNIVERSAL_ROUTER_ADDRESS } from '@uniswap/universal-router-sdk'

import { USDC_TOKEN, USDT_TOKEN, WBTC_TOKEN, WETH_TOKEN } from './constants'
import { displayTrade, getCurrencyBalance, getTokenFromString, toReadableAmount, wrapETH } from './utils'
import { approvePermit2, getPermitSingle } from './permit2'
import { createRoute, createTrade } from './v3SinglePoolTrade'
import { Wallet } from 'ethers'


export interface EnvironmentConfig {
    privateKey: string
    rpcUrl: string
    chainId: number
}

export interface SwapConfiguration {
    env: EnvironmentConfig,
    inputToken: Token;
    outputToken: Token;
    amountIn: bigint;
	poolFee: FeeAmount;

    slippageTolerance: Percent;
    txDeadline: bigint;
    permitExpiration: bigint;
    permitSigExpiration: bigint;

    // v2 API
    autoApprovePermit2?: boolean;
    permit2ApprovalAmount?: bigint;
    autoWrapETH?: boolean;
    autoUnwrapETH?: boolean;

    // maxFeePerGas: number;
    // maxPriorityFeePerGas: number;
    // maxGasLimit: number;
}

async function confirmInputTokens(config: SwapConfiguration, inputTokenBalance: bigint, wallet: Wallet) {
    // Check if there is enough input Token balance
    if (inputTokenBalance < config.amountIn) {
        // We don't have enough tokens to swap
        const requiredAmount = config.amountIn - inputTokenBalance
        console.error("Not enough input Tokens!")
        console.log("Additional amount needed: ", toReadableAmount(requiredAmount, config.inputToken))

        // if input Token is WETH, wrap the required amount of ETH
        if (config.inputToken.equals(WETH_TOKEN) && config.autoWrapETH) {
            console.log("Attempting to wrap required ETH")
            const isSuccess = await wrapETH(wallet, requiredAmount)
            if (!isSuccess) {
                console.error("Failed to wrap ETH. Aborting.")
                return false
            }
            console.log("Successfully wrapped required ETH.")
        } else {
            console.log("autoWrapETH set to false. Aborting.")
            return false
        }
    }

    // Grant allowance to Permit2
    const isApproved = await approvePermit2(config, wallet)
    if (!isApproved) {
        console.error("Failed to grant Permit2 allowance!")
        return false
    }

    return true
}


// Use the formdata to populate the SwapConfiguration
export function makeConfig(formdata: FormData) {
    const privateKey = formdata.get("privateKey")?.toString() || ""
    const rpcUrl = formdata.get("rpcUrl")?.toString() || ""
    const chainId = (formdata.get("ChainId")?.toString().toUpperCase() as keyof typeof ChainId) || "MAINNET"

    const amountIn = formdata.get("amountIn")?.toString() || "0" // Value in readable format
    const inputToken = getTokenFromString(formdata.get("inputToken")?.toString())
    const outputToken = getTokenFromString(formdata.get("outputToken")?.toString())
    if (!inputToken || !outputToken) throw new Error("Invalid input or output Token(s)!")

    const poolFee = (formdata.get("poolFee")?.toString().toUpperCase() as keyof typeof FeeAmount) || "MEDIUM"
    const slippageTolerance = formdata.get("slippageTolerance")?.toString() || "50"  // 50 bips, or 0.50%
    const txDeadline = formdata.get("txDeadline")?.toString() || (1000 * 60 * 20).toString()  // 20 minutes

    const permitExpiration = formdata.get("permitExpiration")?.toString() || (1000 * 60 * 60 * 24 * 30).toString()  // 30 days
    const permitSigExpiration = formdata.get("permitSigExpiration")?.toString() || (1000 * 60 * 30).toString()  // 30 minutes

    const autoApprovePermit2 = formdata.get("autoApprovePermit2")?.toString().toUpperCase() === "TRUE"
    const permit2ApprovalAmount = formdata.get("permit2ApprovalAmount")?.toString() || ethers.MaxUint256.toString()  // ethers.MaxUint256
    const autoWrapETH = formdata.get("autoWrapETH")?.toString().toUpperCase() === "TRUE"

    const config: SwapConfiguration = {
        env: {
            privateKey: privateKey,
            rpcUrl: rpcUrl,
            chainId: ChainId[chainId]
        },
        inputToken: inputToken,
        outputToken: outputToken,
        amountIn: ethers.parseUnits(amountIn, inputToken.decimals),  // Value in readable format
        poolFee: FeeAmount[poolFee],  // FeeAmount.MEDIUM,
        slippageTolerance: new Percent(slippageTolerance, 10_000),  // 50 bips, or 0.50%
        txDeadline: BigInt(txDeadline),  // 20 minutes

        permitExpiration: BigInt(permitExpiration),  // 30 days
        permitSigExpiration: BigInt(permitSigExpiration),  // 30 minutes

        autoApprovePermit2: autoApprovePermit2,  // false
        permit2ApprovalAmount: BigInt(permit2ApprovalAmount),  // ethers.MaxUint256
        autoWrapETH: autoWrapETH  // false
    }

    // Safety checks
    if (!config.env.rpcUrl) {
        throw new Error("RPC URL is invalid!")
    }
    if (!config.env.privateKey) {
        throw new Error("Private Key is invalid!")
    }
    if (config.inputToken.equals(config.outputToken)) {
        throw new Error("Input and Output Tokens cannot be same!")
    }
    if (config.amountIn <= BigInt(0)) {
        throw new Error("Input amount must be greater than 0")
    }

    return config
}

export async function swapTokens(CurrentConfig: SwapConfiguration) {
    console.log("Using RPC URL: ", CurrentConfig.env.rpcUrl)
    // Create a wallet using private key
    const wallet = new ethers.Wallet(
        CurrentConfig.env.privateKey,
        new ethers.JsonRpcProvider(CurrentConfig.env.rpcUrl, CurrentConfig.env.chainId, {
            staticNetwork: true
        })
    )

    // Get the user's balance for input Token
    const inputTokenBalance = BigInt(await getCurrencyBalance(wallet, CurrentConfig.inputToken))
    console.log("Input token balance: ", toReadableAmount(inputTokenBalance, CurrentConfig.inputToken))

    if (!await confirmInputTokens(CurrentConfig, inputTokenBalance, wallet)) return false

    // Get the user's balance for output Token
    const outputTokenBalance = BigInt(await getCurrencyBalance(wallet, CurrentConfig.outputToken))
    console.log("Output token balance: ", toReadableAmount(outputTokenBalance, CurrentConfig.outputToken))

    // Create Permit2 single Permit
    const permit = await getPermitSingle(CurrentConfig, wallet)
    if (!permit) return false

    // Construct route between input and output Tokens
    const route = await createRoute(CurrentConfig, wallet)
    const trade = await createTrade(route, CurrentConfig, permit)
    console.log(displayTrade(trade.trade))

    // Use the raw calldata and value returned to call into Universal Swap Router contracts
    const { calldata: data, value } = SwapRouter.swapCallParameters(trade)
    const tx = {
        from: wallet.address,
        to: UNIVERSAL_ROUTER_ADDRESS(CurrentConfig.env.chainId),
        data,
        value
    }

    // TODO: Confirm we have enough ETH for the tx!
    // maxFeePerGas: MAX_FEE_PER_GAS,
    // maxPriorityFeePerGas: MAX_PRIORITY_FEE_PER_GAS,


    // Send Tx to Universal Router and confirm
    const transaction = await wallet.sendTransaction(tx)
    const receipt = await transaction.wait()
    if (receipt?.status === 0) {
        console.error("Swap transaction failed!")
        return false
    }

    // check if the balance of output token increased
    const newOutputTokenBalance = BigInt(await getCurrencyBalance(wallet, CurrentConfig.outputToken))
    console.log("New output token balance: ", toReadableAmount(newOutputTokenBalance, CurrentConfig.outputToken))

    if (newOutputTokenBalance - outputTokenBalance != BigInt(trade.trade.outputAmount.numerator.toString())) {
        return false
    }

    return true
}
