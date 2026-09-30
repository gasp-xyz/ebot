import BigNumber from 'bignumber.js';
import { getWeb3Fs } from './web3api.js';
import UniswapFactoryABI from './abi/uniswapFactoryAbi.js';
import UniswapTokenPairABI from './abi/uniswapTokenPairABI.js';
import SushiFactoryABI from './abi/sushiFactoryAbi.js';
import { uniFactory, sushiFactory, UNI_MODE } from './constants.js';
import { FEE_NUMERATOR, FEE_DENOMINATOR, SQ_FEE_NUM, CROSS_PROD, DENOM_SQUARED } from './utils/math.js';

const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';

/**
 * Returns pool reserves for a token pair from both Uniswap and Sushiswap.
 * @param {number} mode - UNI_MODE or SUSHI_MODE (indicates victim trade venue)
 * @param {string} token1address - First token in the pair (usually WETH)
 * @param {string} token2address - Second token in the pair
 * @returns {Promise<Object>} Reserve data for both 'from' (victim) and 'to' (our) venues.
 */
export const getReserves = async (mode, token1address, token2address) => {
  const web3 = getWeb3Fs();
  const factoryFrom = new web3.eth.Contract(
    mode === UNI_MODE ? SushiFactoryABI : UniswapFactoryABI,
    mode === UNI_MODE ? sushiFactory    : uniFactory
  );
  const factoryTo = new web3.eth.Contract(
    mode === UNI_MODE ? UniswapFactoryABI : SushiFactoryABI,
    mode === UNI_MODE ? uniFactory        : sushiFactory
  );

  const [pairFrom, pairTo] = await Promise.all([
    factoryFrom.methods.getPair(token1address, token2address).call(),
    factoryTo.methods.getPair(token1address, token2address).call(),
  ]);

  const readReserves = async (pairAddress) => {
    const pair = new web3.eth.Contract(UniswapTokenPairABI, pairAddress);
    const [raw, token0] = await Promise.all([
      pair.methods.getReserves().call(),
      pair.methods.token0().call(),
    ]);
    const flip = token1address.toLowerCase() !== token0.toLowerCase();
    return {
      reserve1: BigNumber(flip ? raw._reserve1 : raw._reserve0),
      reserve2: BigNumber(flip ? raw._reserve0 : raw._reserve1),
    };
  };

  if (pairFrom === NULL_ADDRESS) {
    const { reserve1, reserve2 } = await readReserves(pairTo);
    return { pairAddress_from: 0, pairAddress_to: pairTo,
             reserve1_from: BigNumber(0), reserve2_from: BigNumber(0),
             reserve1_to: reserve1, reserve2_to: reserve2 };
  }

  const [from, to] = await Promise.all([readReserves(pairFrom), readReserves(pairTo)]);
  return {
    pairAddress_from: pairFrom, pairAddress_to: pairTo,
    reserve1_from: from.reserve1, reserve2_from: from.reserve2,
    reserve1_to: to.reserve1, reserve2_to: to.reserve2,
  };
};

/**
 * Calculates output amount for a swap using the Uniswap V2 constant product formula.
 * @param {BigNumber|string} amountIn - Amount of token entering the swap
 * @param {BigNumber} reserveIn - Reserve of the input token
 * @param {BigNumber} reserveOut - Reserve of the output token
 * @param {number} slip - Slippage percentage (0-100)
 * @returns {BigNumber} Estimated output amount
 */
export const amountOut = (amountIn, reserveIn, reserveOut, slip) => {
  const num = BigNumber(amountIn).times(FEE_NUMERATOR).times(reserveOut);
  const den = reserveIn.times(FEE_DENOMINATOR).plus(BigNumber(amountIn).times(FEE_NUMERATOR));
  return num.div(den).times(BigNumber(100).minus(slip)).div(100).decimalPlaces(0);
};

/**
 * Simulates a sandwich trade (FR -> Victim -> BS) and calculates net profit.
 * @param {BigNumber|string} amountIn_FR - Our front-run amount (WETH)
 * @param {BigNumber|string} amountIn_trade - Victim's trade amount (WETH)
 * @param {BigNumber} reserveIn - Reserve of WETH in the pool
 * @param {BigNumber} reserveOut - Reserve of the target token in the pool
 * @param {number} slipFR - Our front-run slippage %
 * @param {number} slipBS - Our back-swap slippage %
 * @returns {BigNumber} Net profit in WETH
 */
export const expectedProfit = (amountIn_FR, amountIn_trade, reserveIn, reserveOut, slipFR, slipBS) => {
  const aFR = BigNumber(amountIn_FR);
  const aTr = BigNumber(amountIn_trade);
  const rIn = BigNumber(reserveIn);
  const rOut = BigNumber(reserveOut);

  // FR out
  const outFR = aFR.times(FEE_NUMERATOR).times(rOut).div(rIn.times(FEE_DENOMINATOR).plus(aFR.times(FEE_NUMERATOR)));
  const outFR_s = outFR.times(BigNumber(100).minus(slipFR)).div(100);

  // Pool state after FR
  const rIn2  = rIn.plus(aFR);
  const rOut2 = rOut.minus(outFR);

  // Pool state after Victim
  const rIn3  = rIn2.plus(aTr);
  const rOut3 = rOut2.minus(aTr.times(FEE_NUMERATOR).times(rOut2).div(rIn2.times(FEE_DENOMINATOR).plus(aTr.times(FEE_NUMERATOR))));

  // BS out
  const outBS   = outFR_s.times(FEE_NUMERATOR).times(rIn3).div(rOut3.times(FEE_DENOMINATOR).plus(outFR_s.times(FEE_NUMERATOR)));
  const outBS_s = outBS.times(BigNumber(100).minus(slipBS)).div(100);

  return outBS_s.minus(aFR).decimalPlaces(0);
};

/**
 * Solves the quadratic equation to find the maximum front-run amount allowed
 * before the victim's trade would fall below their minAmountOut.
 */
export const max_frontRunAmount = (amountIn, reserveIn, reserveOut, minAmountOut) => {
  const a    = BigNumber(amountIn);
  const rIn  = BigNumber(reserveIn);
  const rOut = BigNumber(reserveOut);
  const minO = BigNumber(minAmountOut);

  const B = SQ_FEE_NUM.negated().times(a).times(minO)
               .minus(CROSS_PROD.times(rIn).times(minO));

  const D = SQ_FEE_NUM.pow(2).times(a).times(a).times(minO).times(minO)
               .plus(CROSS_PROD.pow(2).times(rIn).times(rIn).times(minO).times(minO))
               .minus(BigNumber(4).times(DENOM_SQUARED).times(DENOM_SQUARED).times(rIn).times(rIn).times(minO).times(minO))
               .minus(BigNumber(6).times(FEE_NUMERATOR).times(FEE_DENOMINATOR).times(SQ_FEE_NUM).times(a).times(rIn).times(minO).times(minO)) // approximation term
               .plus(BigNumber(4).times(FEE_NUMERATOR).times(FEE_DENOMINATOR).times(SQ_FEE_NUM).times(rIn).times(rOut).times(a).times(minO));

  return B.plus(D.sqrt()).div(BigNumber(2).times(SQ_FEE_NUM).times(minO));
};
