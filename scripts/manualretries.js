/**
 * Polling back-swap — waits for a good price then sells.
 *
 * Usage:
 *   TOKEN=0x...  REQUIRED_ETH=1.05  BS_WALLET_PASSWORD=secret  node scripts/manualretries.js
 *
 * Optional: MAX_TRIES=20000  POLL_MS=2000  GAS_PRICE_GWEI=60
 */
import 'dotenv/config';
import Web3 from 'web3';
import fs from 'fs';
import BigNumber from 'bignumber.js';
import tradehelperABI from '../contracts/swapcontract3/trade_helper.abi.js';
import UniswapTokenPairABI from '../src/abi/uniswapTokenPairABI.js';
import UniswapFactoryABI from '../src/abi/uniswapFactoryAbi.js';
import ERC20ABI from '../src/abi/ERC20ABI.js';
import { config } from '../src/config.js';
import { amountOut } from '../src/supportFns.js';
import { TRADE_CONTRACT_ADDRESS, uniFactory, wethAddress } from '../src/constants.js';

import { logger } from '../src/utils/logger.js';
import { requireAddress } from '../src/utils/address.js';

const TOKEN    = requireAddress('TOKEN');
const REQUIRED = new BigNumber(parseFloat(process.env.REQUIRED_ETH ?? '0')).times(1e18);
const MAX      = parseInt(process.env.MAX_TRIES ?? '20000', 10);
const POLL     = parseInt(process.env.POLL_MS ?? '2000', 10);
const GAS      = new BigNumber(parseFloat(process.env.GAS_PRICE_GWEI ?? '60')).times(1e9);

if (!TOKEN || REQUIRED.isEqualTo(0)) { logger.error('Set TOKEN and REQUIRED_ETH'); process.exit(1); }

const web3      = new Web3(config.rpc.infuraBs);
const keystore   = JSON.parse(fs.readFileSync(config.wallets.bsKeystorePath));
const wallet     = web3.eth.accounts.wallet.decrypt(keystore, config.wallets.bsPassword);
const contract   = new web3.eth.Contract(tradehelperABI, TRADE_CONTRACT_ADDRESS);
const tokenERC20 = new web3.eth.Contract(ERC20ABI, TOKEN);
const factory    = new web3.eth.Contract(UniswapFactoryABI, uniFactory);

let tries = 0;

const poll = async (pairAddr, balance) => {
  const pair = new web3.eth.Contract(UniswapTokenPairABI, pairAddr);
  const [raw, token0] = await Promise.all([pair.methods.getReserves().call(), pair.methods.token0().call()]);
  const flip   = wethAddress.toLowerCase() !== token0.toLowerCase();
  const rWeth  = BigNumber(flip ? raw._reserve1 : raw._reserve0);
  const rToken = BigNumber(flip ? raw._reserve0 : raw._reserve1);

  const out    = amountOut(balance, rToken, rWeth, 1);
  const ok     = out.isGreaterThan(REQUIRED);
  const forced = tries >= MAX;

  logger.info(`${tries}/${MAX} | req=${REQUIRED.div(1e18).toFixed(4)} | curr=${out.div(1e18).toFixed(6)}${ok ? ' ✓' : ''}`);

  if (ok || forced) {
    const minOut = forced ? out.times(0.98).decimalPlaces(0) : REQUIRED;
    contract.methods.backUni(minOut, [TOKEN, wethAddress])
      .send({ from: wallet[0].address, gas: new BigNumber(350_000), gasPrice: GAS, value: 0 })
      .on('transactionHash', hash => logger.info(`pending: ${hash}`))
      .on('receipt',  r => logger.success(`confirmed block: ${r.blockNumber}`))
      .on('error',   err => { logger.warn(`tx failed, retrying poll: ${err.message}`); tries--; setTimeout(() => poll(pairAddr, balance), POLL); });
  } else {
    tries++;
    setTimeout(() => poll(pairAddr, balance), POLL);
  }
};

const run = async () => {
  const balance = new BigNumber(await tokenERC20.methods.balanceOf(TRADE_CONTRACT_ADDRESS).call());
  if (balance.isEqualTo(0)) { logger.info('no tokens on contract'); return; }
  logger.info(`balance=${balance.toFixed(0)}`);
  const pairAddr = await factory.methods.getPair(wethAddress, TOKEN).call();
  poll(pairAddr, balance);
};

run().catch(err => { logger.error(`fatal: ${err.message}`); process.exit(1); });
