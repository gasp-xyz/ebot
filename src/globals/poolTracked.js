let poolTracked = null;

export const setPoolTracked = (address) => {
  poolTracked = address;
};

export const getPoolTracked = () => poolTracked;
