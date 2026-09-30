import { getFsContract } from '../contracts/tradeContract.js';
import { getFsWallet } from '../wallets.js';
import { daiAddress, usdcAddress, usdtAddress, wbtcAddress } from '../constants.js';
import { genericSend } from './tradeUtils.js';

import { logger } from '../utils/logger.js';

export const getTradeByIndex = (index) => [
  uniTrade, sushiTrade,
  balancer2Trade, balancer3Trade, balancer4Trade, balancer5Trade,
  uniDAITrade, uniUSDCTrade, uniUSDTTrade, uniWBTCTrade,
  sushiDAITrade, sushiUSDCTrade, sushiUSDTTrade, sushiWBTCTrade,
][index] ?? null;

const send = (method, gas, gasPrice) => genericSend(getFsWallet(), method, gas, gasPrice);

export const uniTrade = (amount, minOut, t1, t2, gas) => {
  logger.info(`[fs] uni amount=${amount}`);
  return send(getFsContract().methods.frontUni(amount, minOut, [t1, t2]), 400_000, gas);
};
export const sushiTrade = (amount, minOut, t1, t2, gas) => {
  logger.info(`[fs] sushi amount=${amount}`);
  return send(getFsContract().methods.frontSushi(amount, minOut, [t1, t2]), 400_000, gas);
};

const createBalancerTrade = (pools, gasLimit) => (amount, minOut, _t1, t2, gas) =>
  send(getFsContract().methods.frontBalancer(amount, minOut, t2, pools), gasLimit, gas);

export const balancer2Trade = createBalancerTrade(2, 600_000);
export const balancer3Trade = createBalancerTrade(3, 700_000);
export const balancer4Trade = createBalancerTrade(4, 700_000);
export const balancer5Trade = createBalancerTrade(5, 900_000);

const createFrontAssetTrade = (methodName, assetAddr) => (amount, minOut, t1, t2, gas) =>
  send(getFsContract().methods[methodName](amount, minOut, [t1, assetAddr, t2]), 500_000, gas);

export const uniDAITrade   = createFrontAssetTrade('frontUni',   daiAddress);
export const uniUSDCTrade  = createFrontAssetTrade('frontUni',  usdcAddress);
export const uniUSDTTrade  = createFrontAssetTrade('frontUni',  usdtAddress);
export const uniWBTCTrade  = createFrontAssetTrade('frontUni',  wbtcAddress);

export const sushiDAITrade  = createFrontAssetTrade('frontSushi',  daiAddress);
export const sushiUSDCTrade = createFrontAssetTrade('frontSushi', usdcAddress);
export const sushiUSDTTrade = createFrontAssetTrade('frontSushi', usdtAddress);
export const sushiWBTCTrade = createFrontAssetTrade('frontSushi', wbtcAddress);
