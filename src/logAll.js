import fs from 'fs';

const LOG_FILE = 'mempoolLog.csv';

const HEADERS = [
  'status','hash','value','gas','gasPrice','gasUsed','failureReason',
  'timeStamp','timePending','blockHash','blockNumber','transactionIndex','input',
  'contractType','contractAddress','methodName','amountOutMin','path_0','path_1','deadline',
  'token1','token2','pairAddress_to',
  'reserve1_from_pending','reserve2_from_pending','reserve1_to_pending','reserve2_to_pending',
  'reserve1_from','reserve2_from','reserve1_to','reserve2_to',
  'totalGas','frontRunAmount_max','profitAfterGas_max',
  'finalAmount','minAmountOut_final','expectedProfit_final','expectedProfit_0slip','expectedProfit_1slip',
  'profitAfterGas_final','spotTime','tokenAllowed','acc',
  'price_0','price_1','price_2','price_3','price_4','price_5','price_6',
];

const s = (v) => (v !== undefined && v !== null ? String(v) : '');

const logAll = (req, data, spotTime, prices = []) => {
  const body   = req.body ?? {};
  const call   = body.contractCall ?? {};
  const params = call.params ?? {};
  const path   = params.path ?? [];

  const row = [
    s(body.status), s(body.hash), s(body.value), s(body.gas), s(body.gasPrice),
    s(body.gasUsed), s(body.failureReason), s(body.timeStamp), s(body.timePending),
    s(body.blockHash), s(body.blockNumber), s(body.transactionIndex), s(body.input),
    s(call.contractType), s(call.contractAddress), s(call.methodName),
    s(params.amountOutMin), s(path[0]), s(path[1]), s(params.deadline),
    s(data.token1), s(data.token2), s(data.pairAddress_to),
    s(data.reserve1_from_pending), s(data.reserve2_from_pending),
    s(data.reserve1_to_pending), s(data.reserve2_to_pending),
    s(data.reserve1_from), s(data.reserve2_from), s(data.reserve1_to), s(data.reserve2_to),
    s(data.totalGas), s(data.frontRunAmount_max), s(data.profitAfterGas_max),
    s(data.finalAmount), s(data.minAmountOut_final), s(data.expectedProfit_final),
    s(data.expectedProfit_0), s(data.expectedProfit_1), s(data.profitAfterGas_final),
    s(spotTime), s(data.tokenAllowed), s(data.acc),
    ...Array.from({ length: 7 }, (_, i) => s(prices[i])),
  ].join(',') + '\r\n';

  fs.stat(LOG_FILE, (err) => {
    if (err?.code === 'ENOENT')
      fs.appendFile(LOG_FILE, HEADERS.join(',') + '\r\n', () => {});
    fs.appendFile(LOG_FILE, row, (e) => { if (e) console.error('[log] write error:', e); });
  });
};

export default logAll;
