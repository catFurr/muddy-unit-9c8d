import { expect, test, describe } from "bun:test";

import { ethers } from "ethers";
import { ChainId, Token } from '@uniswap/sdk-core'
import { WETH_TOKEN } from "../src/constants";
import { toReadableAmount } from "../src/utils";

const noSymbolToken = new Token(
    ChainId.MAINNET,
    '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    5,
)

describe("toReadableAmount", () => {
    test("correct input", () => {
        const result = toReadableAmount(BigInt("1234567891234567891"), WETH_TOKEN)
        expect(result).toBe("1.2345 WETH");
    });

    test("negative input returns 0", () => {
        const result = toReadableAmount(BigInt("-5"), WETH_TOKEN)
        expect(result).toBe("0.0000 WETH");
    });

    test("zero input returns 0", () => {
        const result = toReadableAmount(BigInt("0"), WETH_TOKEN)
        expect(result).toBe("0.0000 WETH");
    });

    test("small input returns decimals", () => {
        const result = toReadableAmount(BigInt("1234567891234567"), WETH_TOKEN)
        expect(result).toBe("0.0012 WETH");
    });

    test("very small input returns decimals", () => {
        const result = toReadableAmount(BigInt("1000"), WETH_TOKEN)
        expect(result).toBe("0.000000000000001 WETH");
    });

    test("very large input", () => {
        const result = toReadableAmount(ethers.MaxUint256, WETH_TOKEN)
        expect(result).toBe("115792089237316195423570985008687907853269984665640564039457.5840 WETH");
    });

    test("symbol-less token returns Token", () => {
        const result = toReadableAmount(BigInt("123456"), noSymbolToken)
        expect(result).toBe("1.2345 Token");
    });

});
