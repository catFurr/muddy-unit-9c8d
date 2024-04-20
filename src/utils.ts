import { Wallet, ethers } from 'ethers'
import { Token, Currency, TradeType, ChainId } from '@uniswap/sdk-core'
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


export function fromReadableAmount(amount: number, decimals: number) {
    return ethers.parseUnits(amount.toString(), decimals)
}

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export function getTokenFromAddr(addr: string | undefined, chainid: ChainId) {
    if (!addr) throw new Error("Invalid Token(s)!")
    const tokensList = [
        WETH_TOKEN(chainid),
        USDT_TOKEN(chainid),
        USDC_TOKEN(chainid),
        WBTC_TOKEN(chainid)
    ]
    const ret_token = tokensList.find((el) => {
        return el.address === addr || el.symbol === addr
    })
    if (ret_token) return ret_token
    throw new Error("Invalid Token(s)!")
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
