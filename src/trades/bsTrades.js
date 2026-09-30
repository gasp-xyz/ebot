import { getBsContract } from '../contracts/tradeContract.js';
import { getBsWallet } from '../wallets.js';
import { daiAddress, usdcAddress, usdtAddress, wbtcAddress } from '../constants.js';
import { genericSend } from './tradeUtils.js';

export const getTradeByIndex = (index) => [
  uniTrade, sushiTrade,
  balancer2Trade, balancer3Trade, balancer4Trade, balancer5Trade,
  uniDAITrade, uniUSDCTrade, uniUSDTTrade, uniWBTCTrade,
  sushiDAITrade, sushiUSDCTrade, sushiUSDTTrade, sushiWBTCTrade,
][index] ?? null;

const send = (method, gas, gasPrice) => genericSend(getBsWallet(), method, gas, gasPrice);

export const uniTrade   = (minOut, t2, t1, gas) =>
  send(getBsContract().methods.backUni(minOut, [t2, t1]),   400_000, gas);
export const sushiTrade = (minOut, t2, t1, gas) =>
  send(getBsContract().methods.backSushi(minOut, [t2, t1]), 400_000, gas);

const createBalancerTrade = (pools, gasLimit) => (minOut, t2, _t1, gas) =>
  send(getBsContract().methods.backBalancer(minOut, t2, pools), gasLimit, gas);

export const balancer2Trade = createBalancerTrade(2, 400_000);
export const balancer3Trade = createBalancerTrade(3, 500_000);
export const balancer4Trade = createBalancerTrade(4, 600_000);
export const balancer5Trade = createBalancerTrade(5, 700_000);

const createBackAssetTrade = (methodName, assetAddr) => (minOut, t2, t1, gas) =>
  send(getBsContract().methods[methodName](minOut, [t2, assetAddr, t1]), 300_000, gas);

export const uniDAITrade   = createBackAssetTrade('backUni',   daiAddress);
export const uniUSDCTrade  = createBackAssetTrade('backUni',  usdcAddress);
export const uniUSDTTrade  = createBackAssetTrade('backUni',  usdtAddress);
export const uniWBTCTrade  = createBackAssetTrade('backUni',  wbtcAddress);

export const sushiDAITrade  = createBackAssetTrade('backSushi',  daiAddress);
export const sushiUSDCTrade = createBackAssetTrade('backSushi', usdcAddress);
export const sushiUSDTTrade = createBackAssetTrade('backSushi', usdtAddress);
export const sushiWBTCTrade = createBackAssetTrade('backSushi', wbtcAddress);
