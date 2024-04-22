import { Wallet, ethers } from "ethers";
import { ChainId } from '@uniswap/sdk-core'

import { WETH_ABI, WETH_TOKEN } from "../src/constants";


//// MODIFY PARAMETERS
const private_key = "40961c8f3664715cf153b4dff7338fd5bde0fba5fab82965c591d0c79eaa9ef2"
const amount_to_wrap = 0.1
const RPC_URL = "https://sepolia.infura.io/v3/2fac1f67153d4372bd87f46f07edff7b"
const chain_id = ChainId.SEPOLIA
const tx_type = wrapETH  // unwrapETH
////


// Helper function - for development only
// wraps ETH
async function wrapETH(wallet: Wallet, eth: bigint) {
    const wethContract = new ethers.Contract(
        WETH_TOKEN(chain_id).address,
        WETH_ABI,
        wallet
    )

    const transaction = {
        data: wethContract.interface.encodeFunctionData('deposit'),
        value: eth,
        from: wallet.address,
        to: WETH_TOKEN(chain_id).address,
        // maxFeePerGas: MAX_FEE_PER_GAS,
        // maxPriorityFeePerGas: MAX_PRIORITY_FEE_PER_GAS,
    }

    const tx = await wallet.sendTransaction(transaction)
    const receipt = await tx.wait();
    return !(receipt?.status === 0)
}

// unwraps ETH
async function unwrapETH(wallet: Wallet, eth: bigint) {
    const wethContract = new ethers.Contract(
        WETH_TOKEN(chain_id).address,
        WETH_ABI,
        wallet
    )

    const transaction = {
        data: wethContract.interface.encodeFunctionData('withdraw', [ eth.toString() ]),
        from: wallet.address,
        to: WETH_TOKEN(chain_id).address,
        // maxFeePerGas: MAX_FEE_PER_GAS,
        // maxPriorityFeePerGas: MAX_PRIORITY_FEE_PER_GAS,
    }

    const tx = await wallet.sendTransaction(transaction)
    const receipt = await tx.wait();
    return !(receipt?.status === 0)
}

try {
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

    const _amount = ethers.parseUnits(String(amount_to_wrap), WETH_TOKEN(chain_id).decimals)
    const res = tx_type(wallet, _amount)
    if (!res) {
        console.error("Failed to complete tx!")
    }
} catch (error) {
    console.error(error)
}
