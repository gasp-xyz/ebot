import BigNumber from 'bignumber.js';
import { daiAddress, sushiRouter, uniRouter, usdcAddress, usdtAddress, wbtcAddress, wethAddress } from '../constants.js';
import { getUniContract } from '../contracts/uniContract.js';
import { getSushiContract } from '../contracts/sushiContract.js';
import { getBalancerContract } from '../contracts/balancerContract.js';
import { getTradeByIndex } from './bsTrades.js';
import { getInSlowBs } from '../globals/state.js';
import { getTokenAmount } from '../tokenAmount.js';
import { getPrices } from '../subscribePrices.js';

import { logger } from '../utils/logger.js';

const ETH = new BigNumber('1000000000000000000');

/**
 * Evaluates multiple trade routes and chooses the most profitable one for the back-swap.
 * Considers gas costs and dex-specific preferences.
 * @param {Object} context - The trade context.
 * @returns {Promise<Object>} The chosen trade function and its raw price.
 */
export const chooseBsTrade = async (context) => {
  const prices   = await fetchPrices(context);
  const adjusted = adjustPrices(prices, context);

  logger.info('[bs] prices: ' + adjusted.map(p => p.div(ETH).decimalPlaces(4)).join('\t'));

  const best = indexOfMax(adjusted);
  return { chosenBsTrade: getTradeByIndex(best), price: prices[best] };
};

export const fetchBsPrices = async (context) => fetchPrices(context);

const fetchPrices = async (context) => {
  const weth        = wethAddress;
  const token       = context.token;
  const tokenAmount = await getTokenAmount(token);

  const uni   = getUniContract();
  const sushi = getSushiContract();
  const bal   = getBalancerContract();

  const results = await Promise.allSettled([
    uni.methods.getAmountsOut(tokenAmount, [token, weth]).call(),
    sushi.methods.getAmountsOut(tokenAmount, [token, weth]).call(),
    bal.methods.viewSplitExactIn(token, weth, tokenAmount, '2').call(),
    bal.methods.viewSplitExactIn(token, weth, tokenAmount, '3').call(),
    bal.methods.viewSplitExactIn(token, weth, tokenAmount, '4').call(),
    bal.methods.viewSplitExactIn(token, weth, tokenAmount, '5').call(),
    uni.methods.getAmountsOut(tokenAmount, [token, daiAddress,  weth]).call(),
    uni.methods.getAmountsOut(tokenAmount, [token, usdcAddress, weth]).call(),
    uni.methods.getAmountsOut(tokenAmount, [token, usdtAddress, weth]).call(),
    uni.methods.getAmountsOut(tokenAmount, [token, wbtcAddress, weth]).call(),
    sushi.methods.getAmountsOut(tokenAmount, [token, daiAddress,  weth]).call(),
    sushi.methods.getAmountsOut(tokenAmount, [token, usdcAddress, weth]).call(),
    sushi.methods.getAmountsOut(tokenAmount, [token, usdtAddress, weth]).call(),
  ]);

  return results.map(r =>
    r.status === 'rejected' ? new BigNumber(0) :
    new BigNumber(r.value.length > 2 ? r.value[2] : r.value[1])
  );
};

const adjustPrices = (prices, context) => {
  const inSlow = getInSlowBs();
  const gp = inSlow ? getPrices().traderPrice : context.gasPrice;
  const p  = [...prices];

  // Deduct extra gas cost for multi-leg routes
  [2, 6, 7, 8, 9, 10, 11, 12].forEach(i => { p[i] = p[i].minus(gp.times(50_000)); });
  p[3] = p[3].minus(gp.times(150_000));
  p[4] = p[4].minus(gp.times(250_000));
  p[5] = p[5].minus(gp.times(350_000));

  if (!inSlow) {
    // Fast BS: heavily prefer same DEX as victim so we trade in the moved pool
    const router = context.router.toLowerCase();
    if (router === uniRouter.toLowerCase())
      [0, 6, 7, 8, 9].forEach(i => { p[i] = p[i].times(100); });
    else if (router === sushiRouter.toLowerCase())
      [1, 10, 11, 12].forEach(i => { p[i] = p[i].times(100); });
  }

  return p;
};

const indexOfMax = (arr) => arr.reduce((best, v, i) => v.isGreaterThan(arr[best]) ? i : best, 0);
export { indexOfMax as getBestTradeIndex };
