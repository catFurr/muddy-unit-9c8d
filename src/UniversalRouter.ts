
import { ethers, Wallet } from 'ethers'
import { SwapRouter, UNIVERSAL_ROUTER_ADDRESS } from '@uniswap/universal-router-sdk'

import { USDC_TOKEN, USDT_TOKEN, WBTC_TOKEN, WETH_TOKEN } from './constants'
import { displayTrade, toReadableAmount } from './utils'
import { approvePermit2, getPermitSingle } from './permit2'
import { createRoute, createTrade } from './v3SinglePoolTrade'
import { SwapConfiguration, getCurrencyBalance, wrapETH } from './core'


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

    return true
}


export async function swapTokens(CurrentConfig: SwapConfiguration, messageArray: Array<string>) {
    messageArray.push("Using RPC URL: ", CurrentConfig.env.rpcUrl)
    // Create a wallet using private key
    const wallet = new ethers.Wallet(
        CurrentConfig.env.privateKey,
        new ethers.JsonRpcProvider(CurrentConfig.env.rpcUrl, CurrentConfig.env.chainId, {
            staticNetwork: true
        })
    )

    // Get the user's balance for input Token
    const inputTokenBalance = await getCurrencyBalance(wallet, CurrentConfig.inputToken)
    messageArray.push("Input token balance: ", toReadableAmount(inputTokenBalance, CurrentConfig.inputToken))

    if (inputTokenBalance < CurrentConfig.amountIn) {
        throw new Error("Input token balance insufficient!")
    }
    await approvePermit2(CurrentConfig, wallet)

    // Get the user's balance for output Token
    const outputTokenBalance = await getCurrencyBalance(wallet, CurrentConfig.outputToken)
    messageArray.push("Output token balance: ", toReadableAmount(outputTokenBalance, CurrentConfig.outputToken))

    // Create Permit2 single Permit
    const permit = await getPermitSingle(CurrentConfig, wallet)
    if (!permit) {
        throw new Error("Failed to create permit signature!")
    }

    // Construct route between input and output Tokens
    const route = await createRoute(CurrentConfig, wallet)
    const trade = await createTrade(route, CurrentConfig, permit)
    messageArray.push(displayTrade(trade.trade))

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
        messageArray.push("ERROR: Swap transaction failed!")
        throw new Error("Transaction receipt has non-zero status, tx hash: " + transaction.hash)
    }

    // check if the balance of output token increased
    const newOutputTokenBalance = await getCurrencyBalance(wallet, CurrentConfig.outputToken)
    messageArray.push("New output token balance: ", toReadableAmount(newOutputTokenBalance, CurrentConfig.outputToken))

    if (newOutputTokenBalance - outputTokenBalance != BigInt(trade.trade.outputAmount.numerator.toString())) {
        throw new Error("Output Token balance did not increase as expected!")
    }

}
