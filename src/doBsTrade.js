import BigNumber from 'bignumber.js';
import { setInSlowBs, getInSlowBs, getMaxGasTracked } from './globals/state.js';
import { getTokenAmount } from './tokenAmount.js';
import { chooseBsTrade } from './trades/chooseBsTrade.js';
import { updateEthStatus } from './ethStatus.js';
import { getPrices } from './subscribePrices.js';
import { wethAddress } from './constants.js';
import { logger } from './utils/logger.js';

const POLL_MS      = 1_000;
const MAX_TRIES    = 3_000;
const ADJUST_AFTER = 100;

export const doBsTrade = async (context) => {
  const { chosenBsTrade } = await chooseBsTrade(context);
  if (context.gasPrice.isLessThan(getPrices().fastPrice)) {
    logger.info('[bs] low gas env, skipping fast bs');
  } else {
    executeFastBsTrade(chosenBsTrade, context);
  }
};

export const executeFastBsTrade = async (chosenBsTrade, context) => {
  const amountOut = context.amount.plus(context.profit.times(0.8)).decimalPlaces(0);
  logger.info(`[bs-fast] target=${amountOut.toFixed(0)}`);

  chosenBsTrade(amountOut, context.token, wethAddress, context.gasPrice)
    .once('transactionHash', (hash) => logger.info(`[bs] hash=${hash}`))
    .once('receipt', async () => { logger.success('[bs-fast] confirmed'); await updateEthStatus(); setInSlowBs(false); })
    .once('error', (err) => logger.error(`[bs-fast] failed: ${err.message ?? err}`));
};

export const executeSlowBsTrade = async (chosenBsTrade, context) => {
  const gasPrice  = context.tries === 0 ? context.gasPrice : getPrices().traderPrice;
  const amountOut = context.amount.plus(context.profit.times(0.8)).times(0.98).decimalPlaces(0);
  logger.info(`[bs-slow] try=${context.tries} target=${amountOut.toFixed(0)}`);

  chosenBsTrade(amountOut, context.token, wethAddress, gasPrice)
    .once('transactionHash', (hash) => logger.info(`[bs] hash=${hash}`))
    .once('receipt', async () => { logger.success('[bs-slow] confirmed'); await updateEthStatus(); setInSlowBs(false); })
    .once('error', (err) => { logger.error(`[bs-slow] failed, retrying: ${err.message ?? err}`); doSlowBsTrade(context); });
};

export const doSlowBsTrade = async (context) => {
  context.tries += 1;

  const tokenAmount = await getTokenAmount(context.token);
  if (tokenAmount.isEqualTo(0)) { logger.info('[bs-slow] no tokens, stopping'); setInSlowBs(false); return; }

  if (getInSlowBs()) {
    logger.info(`[bs-slow] try=${context.tries} holding=${tokenAmount.toFixed(0)} minOut=${context.minAmountOut.toFixed(0)}`);
  }

  if (context.tries > ADJUST_AFTER) {
    context.profit = new BigNumber('20000000000000000')
      .plus(new BigNumber(100_000).times(getMaxGasTracked()))
      .plus(new BigNumber(100_000).times(getPrices().traderPrice));
  }

  const expected = reestimate(context, tokenAmount);
  setInSlowBs(true);

  const { chosenBsTrade, price } = await chooseBsTrade(context);
  if (price.isGreaterThan(expected) || context.tries > MAX_TRIES) {
    executeSlowBsTrade(chosenBsTrade, context);
  } else {
    setTimeout(() => doSlowBsTrade(context), POLL_MS);
  }
};

const reestimate = (context, tokenAmount) => {
  const nominal   = context.amount.plus(context.profit.times(0.8));
  const adjusted  = nominal.times(tokenAmount.div(context.minAmountOut)).decimalPlaces(0);
  if (getInSlowBs()) logger.info(`[bs-slow] adjusted target: ${adjusted.toFixed(0)}`);
  return adjusted;
};
