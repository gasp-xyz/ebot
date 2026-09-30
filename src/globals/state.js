import BigNumber from 'bignumber.js';

let inFs = false;
let inSlowBs = false;
let maxGasTracked = new BigNumber(0);
let context = null;

export const getInFs = () => inFs;
export const setInFs = (val) => { inFs = val; };

export const getInSlowBs = () => inSlowBs;
export const setInSlowBs = (val) => { inSlowBs = val; };

export const getMaxGasTracked = () => maxGasTracked;
export const setMaxGasTracked = (val) => { maxGasTracked = val; };

export const getContext = () => context;
export const setContext = (val) => { context = val; };
