import BigNumber from "bignumber.js";
import { getWeb3Ws } from "./web3api.js";
import ERC20ABI from "./abi/ERC20ABI.js";
import { wethAddress, TRADE_CONTRACT_ADDRESS } from "./constants.js";
import { logger } from "./utils/logger.js";

const UPDATE_INTERVAL_MS = 300_000; // 5 minutes

let ethStatus = new BigNumber('0');

/**
 * Updates the WETH balance of the trade contract from the blockchain.
 * Re-triggers itself periodically to stay in sync.
 */
export const updateEthStatus = async () => {
  try {
    const web3 = getWeb3Ws();
    const wethContract = new web3.eth.Contract(ERC20ABI, wethAddress);
    const balance = await wethContract.methods.balanceOf(TRADE_CONTRACT_ADDRESS).call();

    ethStatus = new BigNumber(balance);
    logger.info(`[bot] balance updated: ${ethStatus.div(1e18).toFixed(4)} WETH`);
  } catch (e) {
    logger.error(`[bot] failed to update balance: ${e.message}`);
  } finally {
    setTimeout(updateEthStatus, UPDATE_INTERVAL_MS);
  }
};

/**
 * Returns the currently tracked WETH balance.
 * @returns {BigNumber}
 */
export const getEthStatus = () => ethStatus;
