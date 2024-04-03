import { Wallet, ethers } from 'ethers'
import { Token, Currency, TradeType } from '@uniswap/sdk-core'
import { Trade } from '@uniswap/router-sdk'

import {
    ERC20_ABI,
    MAX_DECIMALS,
    MAX_FEE_PER_GAS,
    MAX_PRIORITY_FEE_PER_GAS,
    USDC_TOKEN,
    USDT_TOKEN,
    WBTC_TOKEN,
    WETH_ABI,
    WETH_CONTRACT_ADDRESS,
    WETH_TOKEN
} from './constants'
import { SwapConfiguration } from './UniversalRouter'


export function fromReadableAmount(amount: number, decimals: number) {
    return ethers.parseUnits(amount.toString(), decimals)
}

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export function getTokenFromString(value: string | undefined) {
    const tokensList = [WETH_TOKEN, USDT_TOKEN, USDC_TOKEN, WBTC_TOKEN]
    return tokensList.find((el) => {
        return el.address === value || el.symbol === value
    })
}

// Helper function - for development only
// wraps ETH
export async function wrapETH(wallet: Wallet, eth: bigint) {
    const wethContract = new ethers.Contract(
        WETH_CONTRACT_ADDRESS,
        WETH_ABI,
        wallet
    )

    const transaction = {
        data: wethContract.interface.encodeFunctionData('deposit'),
        value: eth,
        from: wallet.address,
        to: WETH_CONTRACT_ADDRESS,
        // maxFeePerGas: MAX_FEE_PER_GAS,
        // maxPriorityFeePerGas: MAX_PRIORITY_FEE_PER_GAS,
    }

    const tx = await wallet.sendTransaction(transaction)
    const receipt = await tx.wait();
    return !(receipt?.status === 0)
}

/**
 * Converts an amount of a currency into human-readable format
 * @param amount The amount of the currency as a BigNumber
 * @param token The Token of the currency
 * @returns A human readable string adjusting the input amount with 
 *          the necessary decimal places, and adding the symbol.
**/
export function toReadableAmount(amount: bigint, token: Currency) {
    let returnString = ""
    if (amount <= BigInt(0)) {
        returnString += "0." + "0".repeat(MAX_DECIMALS)
    } else {
        const strAmount = amount.toString()
        let dotIndex = strAmount.length - token.decimals
        if (dotIndex < 0) {
            dotIndex = Math.abs(dotIndex)
            returnString += "0." + "0".repeat(dotIndex) + strAmount.slice(0, MAX_DECIMALS-dotIndex)
        } else {
            returnString += strAmount.slice(0, dotIndex) + "." + strAmount.slice(dotIndex, dotIndex+MAX_DECIMALS)
        }
    }
    return returnString + " " + (token.symbol || "Token")
}

export function displayTrade(trade: Trade<Currency, Currency, TradeType>) {
    return `${trade.inputAmount.toExact()} ${
        trade.inputAmount.currency.symbol
    } for ${trade.outputAmount.toExact()} ${trade.outputAmount.currency.symbol}`
}

/**
* Converts an expiration (in milliseconds) to a deadline (in seconds) suitable for the EVM.
* Permit2 expresses expirations as deadlines, but JavaScript usually uses milliseconds,
* so this is provided as a convenience function.
*/
export function toDeadline(expiration: bigint): bigint {
    return (BigInt(Date.now()) + expiration) / BigInt(1000)
}

// 1 network call
// code to easily connect to and get information from a wallet on chain
export async function getCurrencyBalance(wallet: Wallet, token: Token) {
    // Get currency otherwise
    const ERC20Contract = new ethers.Contract(
        token.address,
        ERC20_ABI,
        wallet
    )
    const tokenBalance: string = await ERC20Contract.balanceOf(wallet.address)

    return tokenBalance
}
