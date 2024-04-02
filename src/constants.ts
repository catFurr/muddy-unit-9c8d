
import { ChainId, Token } from '@uniswap/sdk-core'

// Addresses
export const POOL_FACTORY_CONTRACT_ADDRESS =
'0x1F98431c8aD98523631AE4a59f267346ea31F984'
export const QUOTER_CONTRACT_ADDRESS =
  '0x61fFE014bA17989E743c5F6cB21bF9697530B21e'
export const SWAP_ROUTER_ADDRESS = '0xE592427A0AEce92De3Edee1F18E0157C05861564'
export const WETH_CONTRACT_ADDRESS =
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'


// Transactions
export const MAX_FEE_PER_GAS = 100000000000
export const MAX_PRIORITY_FEE_PER_GAS = 100000000000
export const TOKEN_AMOUNT_TO_APPROVE_FOR_TRANSFER = 2000
export const MAX_DECIMALS = 4

// Currencies and Tokens
export const WETH_TOKEN = new Token(
    ChainId.MAINNET,
    WETH_CONTRACT_ADDRESS,
    18,
    'WETH',
    'Wrapped Ether'
)

export const USDC_TOKEN = new Token(
    ChainId.MAINNET,
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    6,
    'USDC',
    'USD//C'
)

export const WBTC_TOKEN = new Token(
    ChainId.MAINNET,
    '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    8,
    'WBTC',
    'Wrapped BTC'
)

export const USDT_TOKEN = new Token(
    ChainId.MAINNET,
    '0xdac17f958d2ee523a2206206994597c13d831ec7',
    6,
    'USDT',
    'USDT'
)

export const DAI_TOKEN = new Token(
    ChainId.MAINNET,
    '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    18,
    'DAI',
    'Dai Stablecoin'
)

export const UNI_TOKEN = new Token(
    ChainId.MAINNET,
    '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    18,
    'UNI',
    'Uniswap'
)

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
