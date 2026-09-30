import {getWeb3Fs} from "../web3api.js";
import {uniRouter} from "../constants.js";
import uniswapRouterABI from "../abi/uniswapRouterABI.js";

let contract = {};

export const initUniContract = () => {
  let web3fs = getWeb3Fs();
  contract = new web3fs.eth.Contract(uniswapRouterABI, uniRouter);
}

export const getUniContract = () => {
  if (contract) {
    return contract;
  } else {
    throw Error('Uniswap contract is not initialized');
  }
}
