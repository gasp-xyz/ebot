# E-bot

E-bot began with a practical problem: on Ethereum, a user's trade could be visible to competing bots before it executed. The team built and ran a trading bot to understand how those bots extract value through transaction ordering—known as MEV—and turn that experience into better exchange design.

It watched pending swaps, modeled buying before a user's trade and selling afterward, and executed across Uniswap V2, SushiSwap, and Balancer V1. Separate wallets and a trade-helper contract coordinated both legs, with routes chosen across multiple pools and assets.

The hard part was competing in real time. E-bot sized trades within slippage limits, weighed expected returns against gas costs, adjusted bids as rivals competed, and managed failed transactions and inventory when the planned exit was unavailable.

The research translated trading experience into requirements for fairer DeFi infrastructure: private ordering, fair sequencing, censorship resistance, and execution rules that limit exploitable information. It helped make user protection a concrete protocol-design problem.

This repository preserves an earlier public version. Later internal work added transaction simulation through a dedicated Ethereum node. The approach became obsolete as MEV shifted toward specialized block-building infrastructure; this release documents the engineering and research from that period.

This publication snapshot contains configuration placeholders. It includes no previous deployment addresses, production token/pool datasets, compiled deployment bytecode, wallet keystores, or original Git history. Trading calculations and execution flows retain their historical design.

## Configuration

Use Node.js 20 or later. Install dependencies, then copy the environment template:

```sh
npm install --ignore-scripts
cp .env.example .env
```

Replace the `REPLACE_WITH_*` values in your local `.env`. The template is intentionally not runnable. Missing, malformed, zero, or unreplaced contract addresses fail validation before trading clients are initialized. HTTP/WebSocket endpoints are also validated. `.env` files and wallet keystores are ignored by Git.

| Configuration | Purpose |
| --- | --- |
| `TRADE_CONTRACT_ADDRESS` | Your own deployed trade-helper contract |
| `UNISWAP_ROUTER_ADDRESS`, `SUSHISWAP_ROUTER_ADDRESS`, `BALANCER_ROUTER_ADDRESS` | Routers used for execution and route selection |
| `UNISWAP_FACTORY_ADDRESS`, `SUSHISWAP_FACTORY_ADDRESS` | Factories used to find pools |
| `WETH_ADDRESS`, `DAI_ADDRESS`, `USDC_ADDRESS`, `USDT_ADDRESS`, `WBTC_ADDRESS` | Assets used in trading routes |
| `WS_RPC_URL`, `HTTP_RPC_URL` | Node connections; defaults point to localhost |
| `INFURA_FS_URL`, `INFURA_BS_URL` | Front/back HTTP RPC endpoints; names are retained for compatibility and any compatible provider can be configured |
| `FS_WALLET_PATH`, `BS_WALLET_PATH`, `FS_WALLET_PASSWORD`, `BS_WALLET_PASSWORD` | Local encrypted wallets and their passwords |
| `ETH_GAS_STATION_URL`, `ETH_GAS_STATION_API_KEY` | Gas-price endpoint and optional `api-key` query parameter |
| `TOKEN_LIST_URLS` | Comma-separated token-list HTTP(S) endpoints |

All RPC connections, deployed contracts, and assets must correspond to the same intended chain. Address validation checks format and rejects zero values; it does not establish on-chain identity or ownership.

The gas-price adapter expects JSON fields `safeLow`, `average`, `fast`, and `fastest`, expressed in tenths of a Gwei. Its existing conversion logic is preserved. A different API response format requires an adapter change.

Token-list endpoints must return an object with a `tokens` array whose entries have an `address` string. `npm run token_list` writes `resources/tokens.json`. The published file is an empty allowlist, so no tokens qualify until it is deliberately populated locally. The historical `tokens.json` and `resources/pathlist.json` exports are also empty placeholders. Keep these three files empty in the public repository; `npm run check:publication` rejects populated datasets.

## Solidity deployment inputs

Compile the source for your chosen deployment; the old `.bin` artifacts were removed because they embed the previous configuration. All four sources were checked with Solidity **0.7.4**. Compile each source independently because they reuse interface and contract names. The maintained ABI files include the new constructor inputs and match the compiler output.

Each contract is named `sender`. Supply constructor arguments in this exact order:

| Source directory | Constructor arguments, in order |
| --- | --- |
| `contracts/swapcontract` | None; this older variant already accepts routers dynamically |
| `contracts/swapcontract2` | Uniswap router, SushiSwap router, WETH, CHI |
| `contracts/swapcontract3` | Uniswap router, SushiSwap router, Balancer router, CHI, WETH, DAI, USDC, USDT, WBTC |
| `contracts/arbcontract` | Uniswap router, SushiSwap router, WETH, Aave lending pool, Aave core, Aave native-asset identifier |

Constructor inputs must be nonzero. The deployer remains the owner, and the owner configures the trader through `settrader`. The runtime bot uses the `swapcontract3` ABI. Set `TRADE_CONTRACT_ADDRESS` only after deploying/configuring the intended contract. Constructor values must agree with the JavaScript configuration.

`CHI_ADDRESS`, `AAVE_LENDING_POOL_ADDRESS`, `AAVE_CORE_ADDRESS`, and `AAVE_NATIVE_ASSET_ADDRESS` in `.env.example` document additional deployment inputs. No deployment script automatically reads these fields; pass them to your deployment tool yourself. The old mainnet and testnet address blocks have been removed.

## Maintenance scripts

`takeout` requires `TO_ADDRESS` and `AMOUNT_ETH`; `backswap` and `retries` require `TOKEN`; `hotfix` accepts `TOKEN_IN` and `TOKEN_OUT`. Set the other amounts and execution settings described in the relevant script before use. These commands can submit transactions once configured. Address placeholders are rejected before provider and wallet setup.

`create_wallet` creates a wallet locally without a network provider. It uses `FS_WALLET_PASSWORD` when present, otherwise `BS_WALLET_PASSWORD`, and rejects placeholder passwords. Use `--output` to choose the keystore path. Never publish generated wallet files.

## Verification and publication

```sh
npm test
npm run check:publication
```

Tests run offline and cover configuration handling. The publication check scans candidate Git files for nonzero address literals, embedded external service URLs in JavaScript, local environment/wallet files, compiled artifacts, and populated datasets. The zero-address sentinel remains because it represents a missing pool, not a deployment.

Publish this new repository from its own directory. It has no connection to the original repository, and the original commit history is not included. Create your own empty GitHub repository and add its URL as the new remote when you are ready. Do not copy the original clone's `.git` directory into this one.

## Credits

E-bot was developed by [Stanislav Vozarik](https://stanislavvozarik.com) and the Mangata team.
