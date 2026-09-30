/**
 * Manual one-shot back-swap — reads current token balance and sells immediately.
 *
 * Usage:
 *   TOKEN=0x...  BS_WALLET_PASSWORD=secret  node scripts/manualbackswap.js
 */
import 'dotenv/config';
import Web3 from 'web3';
import fs from 'fs';
import BigNumber from 'bignumber.js';
import tradehelperABI from '../contracts/swapcontract3/trade_helper.abi.js';
import UniswapFactoryABI from '../src/abi/uniswapFactoryAbi.js';
import UniswapTokenPairABI from '../src/abi/uniswapTokenPairABI.js';
import ERC20ABI from '../src/abi/ERC20ABI.js';
import { config } from '../src/config.js';
import { amountOut } from '../src/supportFns.js';
import { TRADE_CONTRACT_ADDRESS, uniFactory, wethAddress } from '../src/constants.js';

import { logger } from '../src/utils/logger.js';
import { requireAddress } from '../src/utils/address.js';

const TOKEN = requireAddress('TOKEN');
const GAS_PRICE = new BigNumber(parseFloat(process.env.GAS_PRICE_GWEI ?? '50')).times(1e9);
if (!TOKEN) { logger.error('Set TOKEN environment variable'); process.exit(1); }

const web3       = new Web3(config.rpc.infuraBs);
const keystore    = JSON.parse(fs.readFileSync(config.wallets.bsKeystorePath));
const wallet      = web3.eth.accounts.wallet.decrypt(keystore, config.wallets.bsPassword);
const contract    = new web3.eth.Contract(tradehelperABI, TRADE_CONTRACT_ADDRESS);
const tokenERC20  = new web3.eth.Contract(ERC20ABI, TOKEN);
const factory     = new web3.eth.Contract(UniswapFactoryABI, uniFactory);

const run = async () => {
  const pairAddr = await factory.methods.getPair(wethAddress, TOKEN).call();
  const pair = new web3.eth.Contract(UniswapTokenPairABI, pairAddr);
  const [raw, token0] = await Promise.all([pair.methods.getReserves().call(), pair.methods.token0().call()]);

  const flip = wethAddress.toLowerCase() !== token0.toLowerCase();
  const rWeth  = BigNumber(flip ? raw._reserve1 : raw._reserve0);
  const rToken = BigNumber(flip ? raw._reserve0 : raw._reserve1);

  const balance = new BigNumber(await tokenERC20.methods.balanceOf(TRADE_CONTRACT_ADDRESS).call());
  if (balance.isEqualTo(0)) { logger.info('no tokens on contract'); return; }

  const minOut = amountOut(balance, rToken, rWeth, 1);
  logger.info(`selling ${balance.toFixed(0)} tokens, minOut=${minOut.div(1e18).toFixed(6)} ETH`);

  contract.methods.backUni(minOut, [TOKEN, wethAddress])
    .send({ from: wallet[0].address, gas: new BigNumber(350_000), gasPrice: GAS_PRICE, value: 0 })
    .on('transactionHash', hash => logger.info(`pending: ${hash}`))
    .on('receipt',  r => logger.success(`confirmed block: ${r.blockNumber}`))
    .on('error',   err => logger.error(`failed: ${err.message}`));
};

run().catch(err => { console.error(err); process.exit(1); });
