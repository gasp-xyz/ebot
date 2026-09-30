import tradehelperABI from "../../contracts/swapcontract3/trade_helper.abi.js";
import {getWeb3Fs} from "../web3api.js";
import {TRADE_CONTRACT_ADDRESS} from "../constants.js";
import {getWeb3Bs} from "../web3api.js";

let fsContract = null;
let bsContract = null;

export const initTradeContracts = () => {
  let web3fs = getWeb3Fs();
  let web3bs = getWeb3Bs();
  fsContract = new web3fs.eth.Contract(tradehelperABI, TRADE_CONTRACT_ADDRESS);
  bsContract = new web3bs.eth.Contract(tradehelperABI, TRADE_CONTRACT_ADDRESS);
}

export const getFsContract = () => {
  if (!fsContract) throw new Error('Front-swap contract is not initialized');
  return fsContract;
};

export const getBsContract = () => {
  if (!bsContract) throw new Error('Back-swap contract is not initialized');
  return bsContract;
};
