import { ethers } from "ethers";
import { ChainId, Percent } from '@uniswap/sdk-core'

import { SwapConfiguration } from "../src/core";
import { approvePermit2 } from "../src/permit2";
import { getTokenFromAddr } from "../src/utils";


// MODIFY PARAMETERS
const private_key = "40961c8f3664715cf153b4dff7338fd5bde0fba5fab82965c591d0c79eaa9ef2"
const RPC_URL = "https://sepolia.infura.io/v3/2fac1f67153d4372bd87f46f07edff7b"
const chain_id = ChainId.SEPOLIA
const token_to_approve = getTokenFromAddr("WETH", chain_id)
////


const wallet = new ethers.Wallet(
    private_key,
    new ethers.JsonRpcProvider(
        RPC_URL,
        chain_id,
        {
            staticNetwork: true
        }
    )
)

const config: SwapConfiguration = {
    env: {
        privateKey: private_key,
        rpcUrl: RPC_URL,
        chainId: chain_id
    },
    outputToken: token_to_approve,
    poolFee: 3000,  // FeeAmount.MEDIUM,
    slippageTolerance: new Percent("50", 10_000),  // 50 bips, or 0.50%
    txDeadline: BigInt(1),  // 20 minutes
    permitExpiration: BigInt(1),  // 30 days
    permitSigExpiration: BigInt(1),  // 30 minutes

    inputToken: token_to_approve,
    amountIn: ethers.MaxUint256,  // Value in readable format
    autoApprovePermit2: true,  // false
    permit2ApprovalAmount: ethers.MaxUint256
}

const messageArray = ["Init!"]
try {
    await approvePermit2(config, wallet, messageArray)
} catch (error) {
    console.error(error)
}
console.log(messageArray)
