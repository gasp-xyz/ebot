import BigNumber from 'bignumber.js';
import { daiAddress, sushiRouter, uniRouter, usdcAddress, usdtAddress, wbtcAddress, wethAddress } from '../constants.js';
import { getUniContract } from '../contracts/uniContract.js';
import { getSushiContract } from '../contracts/sushiContract.js';
import { getBalancerContract } from '../contracts/balancerContract.js';
import { getTradeByIndex } from './fsTrades.js';
import { getContext } from '../globals/state.js';

import { logger } from '../utils/logger.js';

const ETH = new BigNumber('1000000000000000000');

/**
 * Evaluates multiple trade routes and chooses the most profitable one for the front-swap.
 * Applies penalties to routes on the same DEX as the victim to favor cross-DEX arbitrage.
 * @param {Object} context - The trade context.
 * @returns {Promise<Function|null>} The chosen trade function or null if no route is viable.
 */
export const chooseFsTrade = async (context) => {
  const prices    = await fetchPrices(context);
  const penalised = penaliseSameDex(prices, context.router);

  logger.info('[fs] prices: ' + penalised.map(p => p.div(ETH).decimalPlaces(4)).join('\t'));

  const best = indexOfMax(penalised);
  if (penalised[best].isGreaterThan(context.minAmountOut)) {
    logger.info(`[fs] route #${best} price=${penalised[best].div(ETH).decimalPlaces(4)}`);
    return getTradeByIndex(best);
  }
  logger.info('[fs] no route clears minAmountOut');
  return null;
};

const fetchPrices = async (context) => {
  const weth   = wethAddress;
  const token  = context.token;
  const amount = context.amount;
  const gp     = getContext().gasEstimation;
  const hop    = (n) => amount.minus(gp.times(n));

  const uni   = getUniContract();
  const sushi = getSushiContract();
  const bal   = getBalancerContract();

  const results = await Promise.allSettled([
    uni.methods.getAmountsOut(amount, [weth, token]).call(),
    sushi.methods.getAmountsOut(amount, [weth, token]).call(),
    bal.methods.viewSplitExactIn(weth, token, hop(150_000), '2').call(),
    bal.methods.viewSplitExactIn(weth, token, hop(250_000), '3').call(),
    bal.methods.viewSplitExactIn(weth, token, hop(350_000), '4').call(),
    bal.methods.viewSplitExactIn(weth, token, hop(450_000), '5').call(),
    uni.methods.getAmountsOut(hop(150_000), [weth, daiAddress,  token]).call(),
    uni.methods.getAmountsOut(hop(150_000), [weth, usdcAddress, token]).call(),
    uni.methods.getAmountsOut(hop(150_000), [weth, usdtAddress, token]).call(),
    uni.methods.getAmountsOut(hop(150_000), [weth, wbtcAddress, token]).call(),
    sushi.methods.getAmountsOut(hop(150_000), [weth, daiAddress,  token]).call(),
    sushi.methods.getAmountsOut(hop(150_000), [weth, usdcAddress, token]).call(),
    sushi.methods.getAmountsOut(hop(150_000), [weth, usdtAddress, token]).call(),
  ]);

  return results.map(r =>
    r.status === 'rejected' ? new BigNumber(0) :
    new BigNumber(r.value.length > 2 ? r.value[2] : r.value[1])
  );
};

// 2% penalty on routes sharing the same DEX as the victim's trade, so we prefer
// front-running on the opposing pool for cross-DEX arb.
const penaliseSameDex = (prices, router) => {
  const p = [...prices];
  if (router.toLowerCase() === uniRouter.toLowerCase()) {
    [0, 6, 7, 8, 9].forEach(i => { p[i] = p[i].times(0.98).decimalPlaces(0); });
  } else if (router.toLowerCase() === sushiRouter.toLowerCase()) {
    [1, 10, 11, 12].forEach(i => { p[i] = p[i].times(0.98).decimalPlaces(0); });
  }
  return p;
};

const indexOfMax = (arr) => arr.reduce((best, v, i) => v.isGreaterThan(arr[best]) ? i : best, 0);
