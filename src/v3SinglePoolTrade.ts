import JSBI from 'jsbi'
import { Wallet, ethers } from 'ethers'
import { TradeType, CurrencyAmount, Token } from '@uniswap/sdk-core'
import { Pool, Route, TickMath, TICK_SPACINGS, Trade as V3TradeSDK, computePoolAddress, nearestUsableTick } from '@uniswap/v3-sdk'
import { Trade as RouterTrade } from '@uniswap/router-sdk'
import { SwapOptions, UniswapTrade } from '@uniswap/universal-router-sdk'
import { Permit2Permit } from '@uniswap/universal-router-sdk/dist/utils/inputTokens'
import IUniswapV3PoolABI from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json'

import { POOL_FACTORY_CONTRACT_ADDRESS } from './constants'
import { toDeadline } from './utils'
import { SwapConfiguration } from './core'


// 2 network calls
async function getPool(wallet: Wallet, config: SwapConfiguration) {
    const currentPoolAddress = computePoolAddress({
        factoryAddress: POOL_FACTORY_CONTRACT_ADDRESS(config.env.chainId),
        tokenA: config.inputToken,
        tokenB: config.outputToken,
        fee: config.poolFee
    })
	console.log(currentPoolAddress)

    const poolContract = new ethers.Contract(
        currentPoolAddress,
        IUniswapV3PoolABI.abi,
        wallet
    )

    let [liquidity, slot0] =
    await Promise.all([
        poolContract.liquidity(),
        poolContract.slot0(),
    ])
	let { sqrtPriceX96, tick } = slot0
	liquidity = JSBI.BigInt(liquidity.toString())
	sqrtPriceX96 = JSBI.BigInt(sqrtPriceX96.toString())

	const pool = new Pool(
		config.inputToken,
		config.outputToken,
		config.poolFee,
		sqrtPriceX96,
		liquidity,
		Number(tick),
		[
			{
				index: nearestUsableTick(TickMath.MIN_TICK, TICK_SPACINGS[config.poolFee]),
				liquidityNet: liquidity,
				liquidityGross: liquidity,
			},
			{
				index: nearestUsableTick(TickMath.MAX_TICK, TICK_SPACINGS[config.poolFee]),
				liquidityNet: JSBI.multiply(liquidity, JSBI.BigInt('-1')),
				liquidityGross: liquidity,
			},
	  	]
	)

    return pool
}

export async function createRoute(config: SwapConfiguration, wallet: Wallet) {
	const pool = await getPool(wallet, config)

    // TODO: use smart-order-router

	const swapRoute = new Route(
        [pool],
        config.inputToken,
        config.outputToken
    )

	return swapRoute
}

export async function createTrade(route: Route<Token, Token>, config: SwapConfiguration, permit: Permit2Permit) {
	const newTrade = await V3TradeSDK.fromRoute(
		route,
		CurrencyAmount.fromRawAmount(
			config.inputToken,
			config.amountIn.toString()
		),
		TradeType.EXACT_INPUT
	)

	const options: SwapOptions = {
		inputTokenPermit: permit,
		slippageTolerance: config.slippageTolerance,
		deadlineOrPreviousBlockhash: toDeadline(config.txDeadline).toString(),
		// recipient: ""
	}

	const routerTrade = new UniswapTrade(
		new RouterTrade({
			v2Routes: [],
			v3Routes: [{
				routev3: newTrade.route,
				inputAmount: newTrade.inputAmount,
				outputAmount: newTrade.outputAmount
			}],
			tradeType: TradeType.EXACT_INPUT
		}),
		options
	)

	return routerTrade
}
