import 'dotenv/config';
import { requireAddress } from './utils/address.js';

export const uniRouter = requireAddress('UNISWAP_ROUTER_ADDRESS');
export const sushiRouter = requireAddress('SUSHISWAP_ROUTER_ADDRESS');
export const balancerRouter = requireAddress('BALANCER_ROUTER_ADDRESS');

export const uniFactory = requireAddress('UNISWAP_FACTORY_ADDRESS');
export const sushiFactory = requireAddress('SUSHISWAP_FACTORY_ADDRESS');

export const daiAddress   = requireAddress('DAI_ADDRESS');
export const usdcAddress  = requireAddress('USDC_ADDRESS');
export const usdtAddress  = requireAddress('USDT_ADDRESS');
export const wbtcAddress  = requireAddress('WBTC_ADDRESS');
export const wethAddress  = requireAddress('WETH_ADDRESS');

export const TRADE_CONTRACT_ADDRESS = requireAddress('TRADE_CONTRACT_ADDRESS');

export const slipFR_expected = 1;
export const slipFR_allowed  = 3;
export const slipBS_expected = 0.5;
export const slipBS_allowed  = 1;

export const UNI_MODE      = 1;
export const SUSHI_MODE    = 2;
export const BALANCER_MODE = 3;
