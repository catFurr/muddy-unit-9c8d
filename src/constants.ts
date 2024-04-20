
import { ChainId, Token } from '@uniswap/sdk-core'

// Addresses
export function POOL_FACTORY_CONTRACT_ADDRESS (chainid: ChainId) {
    let addr = new Map([
        [ChainId.MAINNET, '0x1F98431c8aD98523631AE4a59f267346ea31F984'],
        [ChainId.SEPOLIA, '0x0227628f3F023bb0B980b67D528571c95c6DaC1c']
    ])

    const _addr = addr.get(chainid)
    if (!_addr) throw UNSUPPORTED_CHAIN_ERR(chainid)
    return _addr
}

export function QUOTER_CONTRACT_ADDRESS (chainid: ChainId) {
    let addr = new Map([
        [ChainId.MAINNET, '0x61fFE014bA17989E743c5F6cB21bF9697530B21e'],
        [ChainId.SEPOLIA, '0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3']
    ])

    const _addr = addr.get(chainid)
    if (!_addr) throw UNSUPPORTED_CHAIN_ERR(chainid)
    return _addr
}

export function SWAP_ROUTER_ADDRESS (chainid: ChainId) {
    let addr = new Map([
        [ChainId.MAINNET, '0xE592427A0AEce92De3Edee1F18E0157C05861564'],
    ])

    const _addr = addr.get(chainid)
    if (!_addr) throw UNSUPPORTED_CHAIN_ERR(chainid)
    return _addr
}

export function WETH_CONTRACT_ADDRESS (chainid: ChainId) {
    let addr = new Map([
        [ChainId.MAINNET, '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
        [ChainId.SEPOLIA, '0xfff9976782d46cc05630d1f6ebab18b2324d6b14']
    ])

    const _addr = addr.get(chainid)
    if (!_addr) throw UNSUPPORTED_CHAIN_ERR(chainid)
    return _addr
}


// Transactions
export const MAX_FEE_PER_GAS = 100000000000
export const MAX_PRIORITY_FEE_PER_GAS = 100000000000
export const TOKEN_AMOUNT_TO_APPROVE_FOR_TRANSFER = 2000
export const MAX_DECIMALS = 4

function UNSUPPORTED_CHAIN_ERR (id:ChainId) {
    return new Error("Unsupported chain: "+id)
}

// Currencies and Tokens
export function WETH_TOKEN (chainid: ChainId) {
    return new Token(
        chainid,
        WETH_CONTRACT_ADDRESS(chainid),
        18,
        'WETH',
        'Wrapped Ether'
    )
}

export function USDC_TOKEN (chainid: ChainId) {
    let addr = new Map([
        [ChainId.MAINNET, '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'],
        [ChainId.SEPOLIA, '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238']
    ])

    const _addr = addr.get(chainid)
    if (!_addr) throw UNSUPPORTED_CHAIN_ERR(chainid)
    return new Token(
        chainid,
        _addr,
        6,
        'USDC',
        'USD//C'
    )
}

export function WBTC_TOKEN (chainid: ChainId) {
    let addr = new Map([
        [ChainId.MAINNET, '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'],
        [ChainId.SEPOLIA, '0x29f2D40B0605204364af54EC677bD022dA425d03']
    ])

    const _addr = addr.get(chainid)
    if (!_addr) throw UNSUPPORTED_CHAIN_ERR(chainid)
    return new Token(
        chainid,
        _addr,
        8,
        'WBTC',
        'Wrapped BTC'
    )
}

export function USDT_TOKEN (chainid: ChainId) {
    let addr = new Map([
        [ChainId.MAINNET, '0xdac17f958d2ee523a2206206994597c13d831ec7'],
        [ChainId.SEPOLIA, '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06']
    ])

    const _addr = addr.get(chainid)
    if (!_addr) throw UNSUPPORTED_CHAIN_ERR(chainid)
    return new Token(
        chainid,
        _addr,
        6,
        'USDT',
        'USDT'
    )
}


// ABI's

export const ERC20_ABI = [
    // Read-Only Functions
    'function name() public view returns (string)',
    'function symbol() public view returns (string)',
    'function balanceOf(address _owner) public view returns (uint256 balance)',
    'function decimals() public view returns (uint8)',
    'function totalSupply() public view returns (uint256)',
    'function allowance(address _owner, address _spender) public view returns (uint256 remaining)',

    // Authenticated Functions
    'function transfer(address _to, uint256 _value) public returns (bool success)',
    'function transferFrom(address _from, address _to, uint256 _value) public returns (bool success)',
    'function approve(address _spender, uint256 _value) public returns (bool success)',

    // Events
    'event Transfer(address indexed _from, address indexed _to, uint256 _value)',
    'event Approval(address indexed _owner, address indexed _spender, uint256 _value)'
]

export const WETH_ABI = [
    // Wrap ETH
    'function deposit() payable',

    // Unwrap ETH
    'function withdraw(uint wad) public',
]

export const PERMIT2_ABI = [
    // View allowance
    'function allowance(address, address, address) external view returns (uint160, uint48, uint48)',
]
