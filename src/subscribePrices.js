import BigNumber from 'bignumber.js';
import { config } from './config.js';
import { logger } from './utils/logger.js';

const GWEI = new BigNumber(1_000_000_000);

let prices = {
  standardPrice: new BigNumber(35).times(GWEI),
  fastPrice:     new BigNumber(52).times(GWEI),
  traderPrice:   new BigNumber(60).times(GWEI),
  maxGasPrice:   new BigNumber(301).times(GWEI),
};

export const getPrices = () => prices;

export const subscribePrices = async () => {
  const url = new URL(config.gasStation.url);
  if (config.gasStation.apiKey) url.searchParams.set('api-key', config.gasStation.apiKey);

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const d = await response.json();
    prices = {
      standardPrice: new BigNumber((d.safeLow + d.average) / 20).times(GWEI),
      fastPrice:     new BigNumber(d.fast / 10).times(GWEI),
      traderPrice:   new BigNumber(d.fastest / 10).times(GWEI),
      maxGasPrice:   new BigNumber(d.fast).times(GWEI),
    };
  } catch (e) {
    logger.error(`[gas] poll failed: ${e.message}`);
  } finally {
    setTimeout(subscribePrices, config.gasStation.pollIntervalMs);
  }
};
