/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { swapTokens } from "./UniversalRouter";
import { makeConfig } from "./core";

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
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const RES_BAD_REQUEST = new Response("Request does not match criteria!", { status: 400, statusText: "Bad Request" })
		const RES_SRVR_ERROR = new Response("Failed", { status: 500, statusText: "Server Error!" });

		// Some checks
		if (request.method != "POST") return RES_BAD_REQUEST
		if (request.headers.get("content-type") != "application/x-www-form-urlencoded") return RES_BAD_REQUEST

		const messageArray = ["Init!"]
		try {
			const formdata = await request.formData()
			const config = makeConfig(formdata)

			const txHash = await swapTokens(config, messageArray)
			return new Response(txHash);
		} catch(error) {
			console.log(messageArray)
			return new Response(error, { status: 500, statusText: "Server Error" });
		}

	}
};
