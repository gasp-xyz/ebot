import BigNumber from 'bignumber.js';

/**
 * Uniswap V2 Constant Product Formula Constants (0.3% fee)
 */
export const FEE_NUMERATOR = new BigNumber(997);
export const FEE_DENOMINATOR = new BigNumber(1000);

/**
 * Derived constants for max_frontRunAmount formula
 */
export const SQ_FEE_NUM = FEE_NUMERATOR.times(FEE_NUMERATOR); // 994009
export const CROSS_PROD = FEE_DENOMINATOR.times(FEE_DENOMINATOR.plus(FEE_NUMERATOR)); // 1997000
export const DENOM_SQUARED = FEE_DENOMINATOR.times(FEE_DENOMINATOR); // 1000000
