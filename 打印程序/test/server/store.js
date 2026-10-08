const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const dataDir = path.join(__dirname, '..', 'data');
const dataFile = path.join(dataDir, 'database.json');

const today = new Date().toISOString().slice(0, 10);
const initialData = {
  printers: [],
  templates: [
    {
      id: 'template-default',
      name: '经典信息标签',
      category: '宠物零食',
      width: 50,
      height: 30,
      fontSize: 12,
      showBorder: true,
      fields: ['productName', 'price', 'ingredients', 'productionDate', 'storageMethod'],
      updatedAt: new Date().toISOString(),
    },
  ],
  labels: [
    {
      id: 'label-sample',
      productName: '一口披萨',
      price: '35元/5根',
      ingredients: '樱桃谷鸭鸭胸肉、红薯、西兰花、无盐芝士、富硒鸡蛋黄',
      productionDate: today,
      storageMethod: '常温3个月，开袋后尽快食用，不要受潮。',
      updatedAt: new Date().toISOString(),
    },
  ],
  printRecords: [],
};

async function ensureStore() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(dataFile);
  } catch {
    await fs.writeFile(dataFile, JSON.stringify(initialData, null, 2), 'utf8');
  }
}

async function readStore() {
  await ensureStore();
  return JSON.parse(await fs.readFile(dataFile, 'utf8'));
}

async function writeStore(data) {
  await ensureStore();
  await fs.writeFile(dataFile, JSON.stringify(data, null, 2), 'utf8');
  return data;
}

function makeId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

module.exports = { readStore, writeStore, makeId };
