import BigNumber from "bignumber.js";

let fsGasPrice = new BigNumber(100000);

export const setFsGasPrice = (price) => {
  fsGasPrice = price;
};

export const getFsGasPrice = () => {
  return fsGasPrice;
}