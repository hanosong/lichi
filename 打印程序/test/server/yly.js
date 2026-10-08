const yly = require('yly-nodejs-sdk');

let tokenCache = null;

function hasCredentials() {
  return Boolean(process.env.YLY_CLIENT_ID && process.env.YLY_CLIENT_SECRET);
}

function getConfig() {
  if (!hasCredentials()) {
    throw new Error('尚未配置易联云应用凭据，请设置 YLY_CLIENT_ID 和 YLY_CLIENT_SECRET。');
  }
  return new yly.Config({
    cid: process.env.YLY_CLIENT_ID,
    secret: process.env.YLY_CLIENT_SECRET,
  });
}

async function getAccessToken() {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.value;
  }
  const result = await new yly.OauthClinet(getConfig()).getToken();
  if (result.error !== 0 || !result.body?.access_token) {
    throw new Error(result.error_description || '获取易联云访问凭据失败');
  }

  tokenCache = {
    value: result.body.access_token,
    expiresAt: Date.now() + Number(result.body.expires_in || 2592000) * 1000,
  };
  return tokenCache.value;
}

async function getClients() {
  const config = getConfig();
  const token = await getAccessToken();
  const rpcClient = new yly.RpcClient(token, config);
  return {
    print: new yly.Print(rpcClient),
    printer: new yly.Printer(rpcClient),
  };
}

function assertSuccess(result, fallbackMessage) {
  if (result?.error !== 0) {
    throw new Error(result?.error_description || fallbackMessage);
  }
  return result;
}

async function addPrinter(machineCode, msign, name) {
  const clients = await getClients();
  return assertSuccess(
    await clients.printer.addPrinter(machineCode, msign, name || ''),
    '添加打印机失败',
  );
}

async function getPrinterStatus(machineCode) {
  const clients = await getClients();
  return assertSuccess(
    await clients.printer.getPrintStatus(machineCode),
    '查询打印机状态失败',
  );
}

async function printText(machineCode, originId, content) {
  const clients = await getClients();
  return assertSuccess(
    await clients.print.index(machineCode, originId, content, 1),
    '提交云端打印任务失败',
  );
}

module.exports = {
  hasCredentials,
  addPrinter,
  getPrinterStatus,
  printText,
};
