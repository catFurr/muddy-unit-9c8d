import { Wallet, ethers } from "ethers";
import { Percent, Token, ChainId } from '@uniswap/sdk-core'
import { FeeAmount } from '@uniswap/v3-sdk'

import { ERC20_ABI, WETH_TOKEN } from "./constants";
import { getTokenFromAddr } from "./utils";

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


// Use the formdata to populate the SwapConfiguration
export function makeConfig(formdata: FormData) {
    const privateKey = formdata.get("privateKey")?.toString() || ""
    const rpcUrl = formdata.get("rpcUrl")?.toString() || ""
    const chainId = ChainId[(formdata.get("ChainId")?.toString().toUpperCase() as keyof typeof ChainId) || "MAINNET"]

    const inputToken = getTokenFromAddr(formdata.get("inputToken")?.toString(), chainId)
    const amountIn = ethers.parseUnits(formdata.get("amountIn")?.toString() || "0", inputToken?.decimals)
    const outputToken = getTokenFromAddr(formdata.get("outputToken")?.toString(), chainId)
    const poolFee = FeeAmount[(formdata.get("poolFee")?.toString().toUpperCase() as keyof typeof FeeAmount) || "MEDIUM"]

    const slippageTolerance = new Percent(formdata.get("slippageTolerance")?.toString() || "50", 10_000)  // 50 bips, or 0.50%
    const txDeadline = BigInt(formdata.get("txDeadline")?.toString() || (1000 * 60 * 20).toString())  // 20 minutes
    const permitExpiration = BigInt(formdata.get("permitExpiration")?.toString() || (1000 * 60 * 60 * 24 * 30).toString())  // 30 days
    const permitSigExpiration = BigInt(formdata.get("permitSigExpiration")?.toString() || (1000 * 60 * 30).toString())  // 30 minutes

    // const autoApprovePermit2 = formdata.get("autoApprovePermit2")?.toString().toUpperCase() === "TRUE"
    // const permit2ApprovalAmount = formdata.get("permit2ApprovalAmount")?.toString() || ethers.MaxUint256.toString()  // ethers.MaxUint256
    // const autoWrapETH = formdata.get("autoWrapETH")?.toString().toUpperCase() === "TRUE"

    // Safety checks
    if (!rpcUrl) {
        throw new Error("RPC URL is invalid!")
    }
    if (!privateKey) {
        throw new Error("Private Key is invalid!")
    }
    if (inputToken.equals(outputToken)) {
        throw new Error("Input and Output Tokens cannot be same!")
    }
    if (amountIn <= BigInt(0)) {
        throw new Error("Input amount must be greater than 0")
    }

    const config: SwapConfiguration = {
        env: {
            privateKey: privateKey,
            rpcUrl: rpcUrl,
            chainId: chainId
        },
        inputToken: inputToken,
        outputToken: outputToken,
        amountIn: amountIn,  // Value in readable format
        poolFee: poolFee,  // FeeAmount.MEDIUM,

        slippageTolerance: slippageTolerance,  // 50 bips, or 0.50%
        txDeadline: txDeadline,  // 20 minutes
        permitExpiration: permitExpiration,  // 30 days
        permitSigExpiration: permitSigExpiration,  // 30 minutes

        // autoApprovePermit2: autoApprovePermit2,  // false
        // permit2ApprovalAmount: BigInt(permit2ApprovalAmount),  // ethers.MaxUint256
        // autoWrapETH: autoWrapETH  // false
    }

    return config
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

    return BigInt(tokenBalance)
}
