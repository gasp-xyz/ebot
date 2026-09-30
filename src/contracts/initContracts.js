import {initUniContract} from "./uniContract.js";
import {initSushiContract} from "./sushiContract.js";
import {initBalancerContract} from "./balancerContract.js";
import {initTradeContracts} from "./tradeContract.js";

export const initContracts = () => {
  initTradeContracts();
  initUniContract();
  initSushiContract();
  initBalancerContract();
}