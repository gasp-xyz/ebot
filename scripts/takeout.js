/**
 * Emergency WETH withdrawal from the trade contract.
 *
 * Usage:
 *   TO_ADDRESS=0x...  AMOUNT_ETH=0.5  BS_WALLET_PASSWORD=secret  node scripts/takeout.js
 */
import 'dotenv/config';
import Web3 from 'web3';
import fs from 'fs';
import BigNumber from 'bignumber.js';
import tradehelperABI from '../contracts/swapcontract3/trade_helper.abi.js';
import { config } from '../src/config.js';
import { TRADE_CONTRACT_ADDRESS, wethAddress } from '../src/constants.js';

import { logger } from '../src/utils/logger.js';
import { requireAddress } from '../src/utils/address.js';

const TO_ADDRESS = requireAddress('TO_ADDRESS');
const AMOUNT_WEI = new BigNumber(parseFloat(process.env.AMOUNT_ETH ?? '0')).times(1e18);
const GAS_PRICE  = new BigNumber(parseFloat(process.env.GAS_PRICE_GWEI ?? '70')).times(1e9);

if (!TO_ADDRESS || AMOUNT_WEI.isEqualTo(0)) {
  logger.error('Set TO_ADDRESS and AMOUNT_ETH'); process.exit(1);
}

const web3     = new Web3(config.rpc.infuraBs);
const keystore  = JSON.parse(fs.readFileSync(config.wallets.bsKeystorePath));
const wallet    = web3.eth.accounts.wallet.decrypt(keystore, config.wallets.bsPassword);
const contract  = new web3.eth.Contract(tradehelperABI, TRADE_CONTRACT_ADDRESS);

logger.info(`Withdrawing ${AMOUNT_WEI.div(1e18).toFixed(4)} WETH to ${TO_ADDRESS}`);

contract.methods.homet(TO_ADDRESS, AMOUNT_WEI, wethAddress)
  .send({ from: wallet[0].address, gas: new BigNumber(350_000), gasPrice: GAS_PRICE, value: 0 })
  .on('transactionHash', hash => logger.info(`pending: ${hash}`))
  .on('receipt',  r => logger.success(`confirmed block: ${r.blockNumber}`))
  .on('error',   err => logger.error(`failed: ${err.message}`));
