import {getWeb3Fs} from "./web3api.js";
import ERC20ABI from "./abi/ERC20ABI.js";
import BigNumber from "bignumber.js";
import {TRADE_CONTRACT_ADDRESS} from "./constants.js";

export const getTokenAmount = async (tokenAddress) => {
  const web3 = getWeb3Fs();
  const tokenContract = new web3.eth.Contract(ERC20ABI, tokenAddress);
  const res = await tokenContract.methods.balanceOf(TRADE_CONTRACT_ADDRESS).call();
  if (res !== {}) {
    return new BigNumber(res);
  }
  return new BigNumber(0);
}
