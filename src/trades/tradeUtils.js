import BigNumber from 'bignumber.js';

export const genericSend = (wallet, method, gas, gasPrice) => {
  return method.send({
    from: wallet[0].address,
    gas: new BigNumber(gas),
    gasPrice,
    value: 0
  });
};
