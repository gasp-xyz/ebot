let tokenTracked = null;

export const setTokenTracked = (address) => {
  tokenTracked = address;
};

export const getTokenTracked = () => tokenTracked;
