
import { ethers } from 'ethers'
import { Percent, Token } from '@uniswap/sdk-core'
import { FeeAmount } from '@uniswap/v3-sdk'
import { SwapRouter, UNIVERSAL_ROUTER_ADDRESS } from '@uniswap/universal-router-sdk'

import { USDT_TOKEN, WETH_TOKEN } from './constants'
import { displayTrade, getCurrencyBalance, toReadableAmount, wrapETH } from './utils'
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
    txDeadline: number;
    permitExpiration: number;
    permitSigExpiration: number;

    // v2 API
    autoApprovePermit2?: boolean;
    permit2ApprovalAmount?: bigint;
    autoWrapETH?: boolean;
    autoUnwrapETH?: boolean;

    // maxFeePerGas: number;
    // maxPriorityFeePerGas: number;
    // maxGasLimit: number;
}

function validateInput(config: SwapConfiguration) {
    // Safety checks
    if (!config.env.rpcUrl) {
        console.error("RPC URL is invalid!")
        return false
    }
    if (!config.env.privateKey) {
        console.error("Private Key is invalid!")
        return false
    }
    if (config.inputToken.equals(config.outputToken)) {
        console.error("Input and Output Tokens cannot be same!")
        return false
    }

    return true
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

export async function swapTokens(CurrentConfig: SwapConfiguration) {
    if (!validateInput(CurrentConfig)) return false
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

    if (!confirmInputTokens(CurrentConfig, inputTokenBalance, wallet)) return false

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
