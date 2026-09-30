import fs from 'fs';
import abiDecoder from 'abi-decoder';
import BigNumber from 'bignumber.js';
import _ from 'lodash';

import {
  slipFR_allowed, slipFR_expected,
  SUSHI_MODE, sushiRouter, UNI_MODE, uniRouter,
} from './constants.js';
import sushiRouterABI from './abi/sushiRouterABI.js';
import { amountOut, expectedProfit, getReserves, max_frontRunAmount } from './supportFns.js';
import { setMaxGasTracked } from './globals/state.js';
import { getPrices } from './subscribePrices.js';
import { doFsTrade } from './doFsTrade.js';
import { doBsTrade } from './doBsTrade.js';
import { getInSlowBs, getInFs } from './globals/state.js';
import { getEthStatus } from './ethStatus.js';
import { logger } from './utils/logger.js';

const ETH  = new BigNumber('1000000000000000000');
const GWEI = new BigNumber('1000000000');
const MIN_PROFIT = new BigNumber('4000000000000000000'); // 4 ETH minimum

let allowedTokens = new Set();

const loadTokens = () => {
  try {
    const data = JSON.parse(fs.readFileSync('resources/tokens.json'));
    allowedTokens = new Set(data.map(t => t.toLowerCase()));
    logger.info(`[bot] loaded ${allowedTokens.size} tokens`);
  } catch (e) {
    logger.error(`[bot] failed to load tokens: ${e.message}`);
  }
};

loadTokens();
export { loadTokens as reloadTokens };

/**
 * Entry point for processing incoming trades from webhooks.
 * Orchestrates the front-swap and back-swap execution.
 * @param {Object} req - The Express request object containing trade details.
 */
export const processTrade = async (req) => {
  try {
    const augmented = augmentRequest(req);
    if (!augmented) return;

    const context = await createContext(augmented);
    if (!context) return;

    logContext(context);

    if (checkContext(context)) {
      logger.success('[trade] opportunity found, executing');
      setMaxGasTracked(new BigNumber(0));
      doFsTrade(context);
      doBsTrade(context);
    }
  } catch (e) {
    logger.error(`[trade] error: ${e.message}`);
  }
};

/**
 * Logs the context details for an identified trade opportunity.
 * @param {Object} context - The trade context object.
 */
export const logContext = (context) => {
  if (getInFs() || getInSlowBs()) return;
  logger.info(
    `[trade] profit ${fmt(context.profit)} ETH | amount ${fmt(context.amount)} ETH` +
    ` | gas ${context.gasEstimation.div(GWEI).decimalPlaces(2)} Gwei` +
    ` | ${routerLabel(context.router)} | ${context.token}`
  );
};

// Uniswap webhooks come pre-decoded; Sushi shares signatures but needs manual decode.
/**
 * Enriches the request with contract details and decodes input if necessary.
 * @private
 */
const augmentRequest = (req) => {
  if (isUni(req.body.to)) return req;
  if (isSushi(req.body.to)) {
    abiDecoder.addABI(sushiRouterABI);
    const decoded = abiDecoder.decodeMethod(req.body.input);
    _.set(req, 'body.contractCall.contractAddress', req.body.to);
    _.set(req, 'body.contractCall.methodName', decoded.name);
    _.set(req, 'body.contractCall.params.amountOutMin', decoded.params[0].value);
    _.set(req, 'body.contractCall.params.path', decoded.params[1].value);
    _.set(req, 'body.contractCall.params.deadline', decoded.params[3].value);
    return req;
  }
  return null;
};

/**
 * Creates a comprehensive trade context including profit estimation and gas costs.
 * @private
 */
const createContext = async (req) => {
  if (req.body.contractCall.methodName !== 'swapExactETHForTokens') return null;

  const token1 = req.body.contractCall.params.path[0]; // WETH
  const token2 = req.body.contractCall.params.path[1]; // target token

  const mode = isUni(req.body.to) ? UNI_MODE : SUSHI_MODE;
  const tokenAllowed = allowedTokens.has(token2.toLowerCase());

  const reserves = await getReserves(mode, token1, token2);
  const r1 = BigNumber(reserves.reserve1_to);
  const r2 = BigNumber(reserves.reserve2_to);

  const victimValue = BigNumber(req.body.value);
  const victimMinOut = BigNumber(req.body.contractCall.params.amountOutMin ?? 0);

  let maxFrAmount = victimMinOut.isGreaterThan(0)
    ? max_frontRunAmount(victimValue, r1, r2, victimMinOut).decimalPlaces(0)
    : new BigNumber(0);

  const maxProfit = expectedProfit(maxFrAmount, victimValue, r1, r2, 0, 0);

  const { traderPrice } = getPrices();
  const ourGasPrice = traderPrice.times(2);
  const gasFr    = ourGasPrice.times(100_000);
  const gasBs    = traderPrice.times(100_000);
  const totalGas = gasFr.plus(gasBs);

  const ethBalance  = getEthStatus();
  const finalAmount = ethBalance.isGreaterThan(maxFrAmount)
    ? maxFrAmount.decimalPlaces(0)
    : ethBalance.decimalPlaces(0);

  const minAmountOut = amountOut(finalAmount, r1, r2, slipFR_allowed);

  let profit = expectedProfit(finalAmount, victimValue, r1, r2, slipFR_expected, 0);
  if (profit.isLessThan(0)) profit = new BigNumber(0);

  const maxAffordableGas = profit.minus(MIN_PROFIT).minus(gasBs).div(GWEI);

  const deadline = BigNumber(req.body.contractCall.params.deadline).minus(5);
  const notExpired = BigNumber(Date.now()).dividedToIntegerBy(1000).isLessThan(deadline);

  setMaxGasTracked(ourGasPrice);

  return {
    amount: finalAmount, minAmountOut, profit,
    gasPrice: BigNumber(req.body.gasPrice), gasEstimation: ourGasPrice,
    totalGas, maxAffordableGas, notExpired,
    status: req.body.status, tokenAllowed,
    router: req.body.to, token: token2,
    pair_address: reserves.pairAddress_to,
    maxFrontRunAmount: maxFrAmount, hash: req.body.hash,
    tries: 0,
  };
};

const checkContext = (ctx) =>
  ctx.amount.isGreaterThan(0) &&
  ctx.profit.isGreaterThan(ctx.totalGas.times(2)) &&
  ctx.notExpired && ctx.status === 'pending' &&
  ctx.tokenAllowed && !getInSlowBs() && !getInFs();

const isUni   = (addr) => addr.toLowerCase() === uniRouter.toLowerCase();
const isSushi = (addr) => addr.toLowerCase() === sushiRouter.toLowerCase();
const routerLabel = (addr) => isUni(addr) ? 'Uniswap' : 'Sushiswap';
const fmt = (bn) => bn.div(ETH).decimalPlaces(4).toFixed(4);
