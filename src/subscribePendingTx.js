import {getWeb3Ws} from "./web3api.js";
import {processNodeTransaction} from "./processNodeTransaction.js";
import { logger } from "./utils/logger.js";

export const subscribePendingTx = async () => {
  const web3ws = getWeb3Ws();
  web3ws.eth.subscribe('pendingTransactions', function (error, result) {
    if (error) logger.error(`[pending] subscription error: ${error.message}`);
  }).on('data', function (transaction) {
    try {
      processNodeTransaction(transaction);
    } catch (error) {
      logger.error(`[pending] data error: ${error.message}`);
    }
  });
}