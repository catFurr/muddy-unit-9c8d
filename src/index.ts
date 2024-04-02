/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { ethers } from "ethers";
import { ChainId, Percent } from '@uniswap/sdk-core'
import { FeeAmount } from '@uniswap/v3-sdk'
import { USDT_TOKEN, WETH_TOKEN } from "./constants";
import { SwapConfiguration, swapTokens } from "./UniversalRouter";

export interface Env {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	// MY_KV_NAMESPACE: KVNamespace;
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace;
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	// MY_BUCKET: R2Bucket;
	//
	// Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
	// MY_SERVICE: Fetcher;
	//
	// Example binding to a Queue. Learn more at https://developers.cloudflare.com/queues/javascript-apis/
	// MY_QUEUE: Queue;

	// Environment Variables
	PRIVATE_KEY: string;  // ETH ACCOUNT PRIVATE KEY
	MAINNET: string;  // RPC URL
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const config: SwapConfiguration = {
			env: {
				privateKey: env.PRIVATE_KEY || "",
				rpcUrl: "http://127.0.0.1:8545",
				chainId: ChainId.MAINNET
			},
			inputToken: WETH_TOKEN,
			outputToken: USDT_TOKEN,
			amountIn: ethers.parseUnits("1", WETH_TOKEN.decimals),  // Value in readable format
			poolFee: FeeAmount.MEDIUM,
			slippageTolerance: new Percent(50, 10_000),  // 50 bips, or 0.50%
			txDeadline: 1000 * 60 * 20,  // 20 minutes

			permitExpiration: 1000 * 60 * 60 * 24 * 30,  // 30 days
			permitSigExpiration: 1000 * 60 * 30,  // 30 minutes

			autoApprovePermit2: true,
			permit2ApprovalAmount: ethers.MaxUint256,
			autoWrapETH: true
		}

		// Correct the input amount taking into account decimals
		// CurrentConfig.amountIn = ethers.parseUnits(
		//     CurrentConfig.amountIn.toString(),
		//     CurrentConfig.inputToken.decimals
		// )
		// if (!process.env.DEVELOPMENT && !process.env.PRODUCTION && !process.env.TEST) {
		//     console.log("Unknown environment, switching to development mode!")
		//     process.env.DEVELOPMENT = "true"
		// }

		// Configure the RPC in development
		// if (process.env.TEST) {
		//     CurrentConfig.env.rpcUrl = process.env.TESTNET || ""
		// } else if (process.env.DEVELOPMENT) {
		//     CurrentConfig.env.rpcUrl = 'http://127.0.0.1:8545'
		// }
		// console.log("Using RPC URL: ", CurrentConfig.env.rpcUrl)

		await swapTokens(config)

		return new Response('Hello World!');
	},
};
