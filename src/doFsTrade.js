import { chooseFsTrade } from './trades/chooseFsTrade.js';
import { wethAddress } from './constants.js';
import { setInFs, setContext } from './globals/state.js';
import { doSlowBsTrade } from './doBsTrade.js';
import { logger } from './utils/logger.js';

export const doFsTrade = async (context) => {
  logger.info('[fs] starting');
  setContext(context);

  const trade = await chooseFsTrade(context);
  if (!trade) { logger.info('[fs] no viable route'); return; }

  setInFs(true);
  logger.info(`[fs] amount=${context.amount.toFixed(0)} minOut=${context.minAmountOut.toFixed(0)}`);

  trade(context.amount.decimalPlaces(0), context.minAmountOut, wethAddress, context.token, context.gasEstimation)
    .once('transactionHash', (hash) => logger.info(`[fs] hash=${hash}`))
    .once('receipt', () => {
      setInFs(false);
      logger.success('[fs] confirmed, starting slow bs');
      doSlowBsTrade(context);
    })
    .once('error', (err) => {
      setInFs(false);
      logger.error(`[fs] failed: ${err.message ?? err}`);
    });
};
