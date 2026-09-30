import { getWeb3Fs, getWeb3Ws, getWeb3Http } from "./web3api.js";
import { getInFs, getMaxGasTracked, setMaxGasTracked, getContext, setContext } from "./globals/state.js";
import BigNumber from "bignumber.js";
import { logContext } from "./processTrade.js";
import { doFsTrade } from "./doFsTrade.js";
import { TRADE_CONTRACT_ADDRESS } from "./constants.js";
import { logger } from "./utils/logger.js";

//todo alter
const FS_GAS_AMOUNT = new BigNumber(100000);

/**
 * Monitors and processes transactions from the mempool for competitive front-running (auctions).
 * @param {string} txHash - The transaction hash to monitor.
 */
export const processNodeTransaction = async (txHash) => {
  const web3Ws = getWeb3Ws();
  if (getInFs()) {
    const tx = await web3Ws.eth.getTransaction(txHash);
    let context = getContext();
    logContext("context for auction " + context);
    if (await checkTx(tx, context)) {
      const newGasPrice = calculateNewGasPrice(tx, context);
      setMaxGasTracked(newGasPrice);
      context.gasEstimation = newGasPrice;
      logGasPrice(context);
      setContext(context);
      doFsTrade(context);
    }
  }
};

const logGasPrice = (context) => {
  logger.info(
    "DO new trade with higher gas of " +
      getMaxGasTracked() +
      " gwei for total " +
      getMaxGasTracked()
        .times(context.totalGas)
        .div(new BigNumber("1000000000000000000"))
        .decimalPlaces(4) +
      " eth estimated for gas"
  );
};

const calculateNewGasPrice = (tx, context) => {
  if (
    new BigNumber(tx.gasPrice).isGreaterThan(
      context.gasEstimation.times(new BigNumber(1.1))
    )
  ) {
    return new BigNumber(tx.gasPrice).plus(new BigNumber(3)).decimalPlaces(0);
  } else {
    return context.gasEstimation.times(new BigNumber(1.101)).decimalPlaces(0);
  }
};

const checkTx = async (tx, context) => {
  const web3Fs = getWeb3Fs();
  if (
    tx != null &&
    (await txIncludesTokenOrPool(tx, context.pair_address, context.token)) &&
    !isOwn(tx)
  ) {
    const nonce = await web3Fs.eth.getTransactionCount(tx.from);
    let maxGasAffordable = calculateMaxGasAffordable(context);
    logTxToSameToken(tx, nonce, maxGasAffordable);

    if (nonce - tx.nonce < 1) {
      if (
        new BigNumber(tx.gasPrice).isGreaterThan(getMaxGasTracked()) &&
        new BigNumber(tx.gasPrice).isLessThan(maxGasAffordable.div(FS_GAS_AMOUNT))
      ) {
        return true;
      }
    }
  }
  return false;
};

const THRESHOLD_GAS = BigNumber("1200000000000").times(100000);

const calculateMaxGasAffordable = (context) => {
  const profit = BigNumber(context.profit);
  return BigNumber.max(BigNumber.min(profit, THRESHOLD_GAS), profit.div(2));
};

const isOwn = (tx) => {
  return tx.to
    .toString()
    .toLowerCase()
    .includes(TRADE_CONTRACT_ADDRESS.toLowerCase());
};

const txIncludesTokenOrPool = async (tx, pair_address, token2address) => {
  const web3Http = getWeb3Http();

  const txObject = tx.value
    ? {
        from: tx.from,
        to: tx.to,
        data: tx.input,
        value: web3Http.utils.toHex(tx.value),
      }
    : {
        from: tx.from,
        to: tx.to,
        data: tx.input,
      };

  //  console.log(tx.hash);
  const blocknumber = await web3Http.eth.getBlockNumber();
  const blockhash = await web3Http.eth.getBlock(blocknumber);

  return new Promise(function (resolve, reject) {
    web3Http.currentProvider.send(
      {
        method: "debug_traceCall",
        params: [txObject, blockhash.hash, { tracer: "callTracer" }],
        jsonrpc: "2.0",
        id: "2",
      },
      function (err, result) {
        if (err) {
          return reject(err);
        }
        const hasPairAddress = JSON.stringify(result).toLowerCase().includes(pair_address.toLowerCase());
        const hasTokenAddress = tx.input != null && tx.input.toString().toLowerCase().includes(token2address.toLowerCase().substring(2));

        resolve(hasPairAddress || hasTokenAddress);
      }
    );
  });
};

const logTxToSameToken = (tx, nonce, maxGasAffordable) => {
  logger.info(
    `${tx.hash} ${nonce} ${tx.nonce} ${tx.gasPrice / 1000000000}     ${FS_GAS_AMOUNT} ${maxGasAffordable.div(FS_GAS_AMOUNT).div(1000000000)} ${getMaxGasTracked().div(1000000000)}`
  );
};
