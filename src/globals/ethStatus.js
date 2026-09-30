import BigNumber from "bignumber.js";

export var ethStatus = BigNumber(0);

export const setEthStatus = (n) => {
  ethStatus = n;
};
