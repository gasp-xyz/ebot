import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import { requireEnv, readHttpUrl, validateUrl } from '../src/utils/env.js';
import { requireAddress } from '../src/utils/address.js';

const temporaryDirectory = mkdtempSync(path.join(tmpdir(), 'ebot-config-test-'));
after(() => rmSync(temporaryDirectory, { recursive: true, force: true }));

const addressVariables = {
  uniRouter: 'UNISWAP_ROUTER_ADDRESS',
  sushiRouter: 'SUSHISWAP_ROUTER_ADDRESS',
  balancerRouter: 'BALANCER_ROUTER_ADDRESS',
  uniFactory: 'UNISWAP_FACTORY_ADDRESS',
  sushiFactory: 'SUSHISWAP_FACTORY_ADDRESS',
  daiAddress: 'DAI_ADDRESS',
  usdcAddress: 'USDC_ADDRESS',
  usdtAddress: 'USDT_ADDRESS',
  wbtcAddress: 'WBTC_ADDRESS',
  wethAddress: 'WETH_ADDRESS',
  TRADE_CONTRACT_ADDRESS: 'TRADE_CONTRACT_ADDRESS',
};

// Distinct artificial fixtures are constructed locally; no deployed address is used.
const syntheticAddress = (index = 0) => `0x${(index + 17).toString(16).repeat(20)}`;
const addressEnvironment = Object.fromEntries(
  Object.values(addressVariables).map((name, index) => [name, syntheticAddress(index)]),
);
const serviceEnvironment = {
  INFURA_FS_URL: 'https://front-rpc.example.test/api',
  INFURA_BS_URL: 'https://back-rpc.example.test/api',
  ETH_GAS_STATION_URL: 'https://gas.example.test/prices',
  FS_WALLET_PASSWORD: 'front-wallet-test-fixture',
  BS_WALLET_PASSWORD: 'back-wallet-test-fixture',
};

const withEnvironmentValue = (name, value, callback) => {
  const previous = process.env[name];
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
  try {
    return callback();
  } finally {
    if (previous === undefined) delete process.env[name];
    else process.env[name] = previous;
  }
};

const assertSafeFailure = (callback, name, value) => {
  assert.throws(callback, (error) => {
    assert.ok(error.message.includes(name), 'The error must identify the environment variable');
    if (value?.trim()) {
      assert.ok(!error.message.includes(value), 'The error must not print the supplied value');
    }
    return true;
  });
};

const importInChild = (relativeFile, environment, exportName) => {
  const moduleUrl = new URL(relativeFile, new URL('../', import.meta.url));
  const selection = exportName ? `module[${JSON.stringify(exportName)}]` : 'module';
  return spawnSync(process.execPath, [
    '--input-type=module',
    '--eval',
    `const module = await import(${JSON.stringify(moduleUrl.href)}); console.log(JSON.stringify(${selection}));`,
  ], {
    cwd: temporaryDirectory,
    // Do not inherit wallet credentials, NODE_OPTIONS, or a developer's .env file.
    env: {
      DOTENV_CONFIG_PATH: path.join(temporaryDirectory, 'absent.env'),
      DOTENV_CONFIG_QUIET: 'true',
      ...environment,
    },
    encoding: 'utf8',
    timeout: 10_000,
  });
};

test('required environment values reject missing, blank, and placeholder inputs safely', () => {
  const name = 'EBOT_REQUIRED_TEST_VALUE';
  for (const value of [undefined, '', ' \t\n ', 'YOUR_VALUE', 'REPLACE_WITH_VALUE', '<insert-value>']) {
    withEnvironmentValue(name, value, () => assertSafeFailure(() => requireEnv(name), name, value));
  }
  withEnvironmentValue(name, '  meaningful password whitespace  ', () => {
    assert.equal(requireEnv(name), '  meaningful password whitespace  ');
  });
});

test('every unreplaced environment-template value is rejected', () => {
  const template = readFileSync(new URL('../.env.example', import.meta.url), 'utf8');
  const placeholders = template.split(/\r?\n/)
    .map(line => line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/))
    .filter(match => match && /REPLACE_|YOUR_|[<>]/i.test(match[2]));
  assert.ok(placeholders.length > 0, 'The public template must contain placeholders');
  for (const [, name, value] of placeholders) {
    withEnvironmentValue(name, value, () => assertSafeFailure(() => requireEnv(name), name, value));
  }
});

test('HTTP URLs reject malformed inputs, reserved placeholders, and unsupported protocols', () => {
  const name = 'EBOT_HTTP_TEST_URL';
  const invalid = [
    undefined, '', '   ', 'YOUR_HTTP_URL', 'REPLACE_WITH_HTTP_URL',
    'https://rpc.example.test/YOUR_KEY', 'https://rpc.example.test/<api-key>',
    'https://example.invalid/api', 'https://sub.example.invalid/api',
    'https://EXAMPLE.INVALID./api', 'https:rpc.example.test',
    'http:/rpc.example.test', 'https://', 'not a URL',
    'ftp://rpc.example.test/api', 'file:///tmp/private', 'wss://rpc.example.test/ws',
    'https://user:credential-must-stay-private@',
  ];
  for (const value of invalid) {
    withEnvironmentValue(name, value, () => assertSafeFailure(() => readHttpUrl(name), name, value));
  }
  assertSafeFailure(
    () => validateUrl(name, 'ftp://user:credential-must-stay-private@rpc.example.test/api'),
    name,
    'credential-must-stay-private',
  );
});

test('HTTP and WebSocket validation accepts only the intended protocols', () => {
  const name = 'EBOT_HTTP_TEST_URL';
  for (const value of ['http://localhost:8545', 'https://rpc.example.test:8443/api?token=test-fixture']) {
    withEnvironmentValue(name, ` ${value} `, () => assert.equal(readHttpUrl(name), value));
  }
  for (const value of ['ws://localhost:8545', 'wss://rpc.example.test/ws']) {
    assert.equal(validateUrl('WS_RPC_URL', value, ['ws:', 'wss:']), value);
  }
  assertSafeFailure(
    () => validateUrl('WS_RPC_URL', 'https://rpc.example.test/ws', ['ws:', 'wss:']),
    'WS_RPC_URL',
    'https://rpc.example.test/ws',
  );
});

test('deployment addresses reject missing, placeholder, short, zero, and malformed values', () => {
  const name = 'EBOT_DEPLOYMENT_TEST_ADDRESS';
  const invalid = [
    undefined, '', '   ', 'YOUR_ADDRESS', 'REPLACE_WITH_ADDRESS', '<address>',
    '0x1234', `0x${'0'.repeat(40)}`, `0x${'g'.repeat(40)}`,
    syntheticAddress().slice(2), `${syntheticAddress()}00`,
  ];
  for (const value of invalid) {
    withEnvironmentValue(name, value, () => assertSafeFailure(() => requireAddress(name), name, value));
  }
  const address = syntheticAddress(10);
  withEnvironmentValue(name, ` ${address} `, () => assert.equal(requireAddress(name), address));
});

test('all 11 address exports use their corresponding environment variables', () => {
  assert.equal(Object.keys(addressVariables).length, 11);
  const child = importInChild('src/constants.js', addressEnvironment);
  assert.ifError(child.error);
  assert.equal(child.status, 0, child.stderr);
  const constants = JSON.parse(child.stdout.trim());
  for (const [exportName, variableName] of Object.entries(addressVariables)) {
    assert.equal(constants[exportName], addressEnvironment[variableName], `${exportName} must use ${variableName}`);
  }
});

test('omitting any deployment address fails the constants import before startup', () => {
  for (const name of Object.values(addressVariables)) {
    const environment = { ...addressEnvironment };
    delete environment[name];
    const child = importInChild('src/constants.js', environment);
    assert.ifError(child.error);
    assert.notEqual(child.status, 0, `${name} must be required`);
    assert.ok(child.stderr.includes(name), `${name} must be identified in the error`);
    assert.equal(child.stdout, '', 'No configuration should be exported after failure');
  }
});

test('service configuration keeps localhost defaults and uses supplied external URLs', () => {
  const child = importInChild('src/config.js', serviceEnvironment, 'config');
  assert.ifError(child.error);
  assert.equal(child.status, 0, child.stderr);
  const config = JSON.parse(child.stdout.trim());
  assert.equal(config.rpc.wsUrl, 'ws://localhost:8545');
  assert.equal(config.rpc.httpUrl, 'http://localhost:8545');
  assert.equal(config.rpc.infuraFs, serviceEnvironment.INFURA_FS_URL);
  assert.equal(config.rpc.infuraBs, serviceEnvironment.INFURA_BS_URL);
  assert.equal(config.gasStation.url, serviceEnvironment.ETH_GAS_STATION_URL);
});

test('missing service URLs or wallet passwords fail configuration import before startup', () => {
  for (const name of Object.keys(serviceEnvironment)) {
    const environment = { ...serviceEnvironment };
    delete environment[name];
    const child = importInChild('src/config.js', environment, 'config');
    assert.ifError(child.error);
    assert.notEqual(child.status, 0, `${name} must be required`);
    assert.ok(child.stderr.includes(name), `${name} must be identified in the error`);
    assert.equal(child.stdout, '');
  }
});

test('explicit malformed local RPC settings fail instead of silently using defaults', () => {
  for (const name of ['WS_RPC_URL', 'HTTP_RPC_URL']) {
    const value = 'ftp://user:rpc-secret-fixture@rpc.example.test/api';
    const child = importInChild('src/config.js', { ...serviceEnvironment, [name]: value }, 'config');
    assert.ifError(child.error);
    assert.notEqual(child.status, 0);
    assert.ok(child.stderr.includes(name));
    assert.ok(!child.stderr.includes('rpc-secret-fixture'));
    assert.equal(child.stdout, '');
  }
});
