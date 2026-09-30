/**
 * Emergency manual token→ETH swap via Uniswap router.
 * Use to recover tokens stuck in a wallet, bypassing the trade contract.
 *
 * Usage:
 *   TOKEN_IN=0x...  TOKEN_OUT=0x...  AMOUNT_IN=1.5  MIN_ETH_OUT=0.04  \
 *   FS_WALLET_PASSWORD=secret  node scripts/hotfix.js
 */
import 'dotenv/config';
import Web3 from 'web3';
import fs from 'fs';
import BigNumber from 'bignumber.js';
import UniswapRouterABI from '../src/abi/uniswapRouterABI.js';
import { config } from '../src/config.js';
import { uniRouter, wethAddress } from '../src/constants.js';

import { logger } from '../src/utils/logger.js';
import { requireAddress } from '../src/utils/address.js';

const TOKEN_IN    = process.env.TOKEN_IN == null ? wethAddress : requireAddress('TOKEN_IN');
const TOKEN_OUT   = process.env.TOKEN_OUT == null ? wethAddress : requireAddress('TOKEN_OUT');
const AMOUNT_IN   = new BigNumber(parseFloat(process.env.AMOUNT_IN   ?? '0')).times(1e18);
const MIN_ETH_OUT = new BigNumber(parseFloat(process.env.MIN_ETH_OUT ?? '0')).times(1e18);
const GAS_PRICE   = new BigNumber(parseFloat(process.env.GAS_PRICE_GWEI ?? '25')).times(1e9);

if (AMOUNT_IN.isEqualTo(0)) {
  logger.error('Set AMOUNT_IN (token amount in human units, e.g. 20)'); process.exit(1);
}

const web3    = new Web3(config.rpc.infuraFs);
const keystore = JSON.parse(fs.readFileSync(config.wallets.fsKeystorePath));
const wallet   = web3.eth.accounts.wallet.decrypt(keystore, config.wallets.fsPassword);
const router   = new web3.eth.Contract(UniswapRouterABI, uniRouter);
const deadline = BigNumber(Date.now()).dividedToIntegerBy(1000).plus(600);

router.methods
  .swapExactTokensForETHSupportingFeeOnTransferTokens(
    AMOUNT_IN, MIN_ETH_OUT, [TOKEN_IN, TOKEN_OUT], wallet[0].address, deadline
  )
  .send({ from: wallet[0].address, gas: new BigNumber(300_000), gasPrice: GAS_PRICE, value: 0 })
  .on('transactionHash', hash => logger.info(`pending: ${hash}`))
  .on('receipt',  r => logger.success(`confirmed block: ${r.blockNumber}`))
  .on('error',   err => logger.error(`failed: ${err.message}`));
