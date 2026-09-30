import {getWeb3Fs} from "../web3api.js";
import balancerABI from "../abi/balancerABI.js";
import {balancerRouter} from "../constants.js";

let contract = {};

export const initBalancerContract = () => {
  let web3fs = getWeb3Fs();
  contract = new web3fs.eth.Contract(balancerABI, balancerRouter);
}

export const getBalancerContract = () => {
  if (contract) {
    return contract;
  } else {
    throw Error('Balancer contract is not initialized');
  }
}
