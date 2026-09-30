import {getWeb3Fs} from "../web3api.js";
import {sushiRouter} from "../constants.js";
import sushiRouterABI from "../abi/sushiRouterABI.js";

let contract = {};

export const initSushiContract = () => {
  let web3fs = getWeb3Fs();
  contract = new web3fs.eth.Contract(sushiRouterABI, sushiRouter);
}

export const getSushiContract = () => {
  if (contract) {
    return contract;
  } else {
    throw Error('Sushiswap contract is not initialized');
  }
}
