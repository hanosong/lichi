const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const mammoth = require('mammoth');

const sourceDir = process.env.LABEL_DOCS_DIR
  ? path.resolve(process.env.LABEL_DOCS_DIR)
  : path.resolve(__dirname, '..', '..', '..', '烘干产品');
const databaseFile = path.resolve(__dirname, '..', 'data', 'database.json');

function valueAfter(text, label) {
  const pattern = new RegExp(`${label}[：:]\\s*([^\\r\\n]+)`);
  return text.match(pattern)?.[1]?.trim() || '';
}

function parseLabel(text, fileName) {
  const nameAndPrice = valueAfter(text, '产品名称');
  const priceMarker = nameAndPrice.search(/[￥¥]/);
  const inlinePrice = nameAndPrice.match(/\s+(\d+(?:\.\d+)?元(?:\/\S+)?)\s*$/);
  const productName = (
    priceMarker >= 0
      ? nameAndPrice.slice(0, priceMarker)
      : inlinePrice
        ? nameAndPrice.slice(0, inlinePrice.index)
        : nameAndPrice
  ).trim();
  const price = (
    priceMarker >= 0
      ? nameAndPrice.slice(priceMarker + 1)
      : inlinePrice?.[1] || valueAfter(text, '售价') || valueAfter(text, '价格')
  ).trim();
  const rawDate = valueAfter(text, '生产日期');

  if (!productName) {
    throw new Error(`${fileName}：没有找到产品名称`);
  }

  return {
    id: `label-doc-${crypto.createHash('sha1').update(fileName).digest('hex').slice(0, 12)}`,
    productName,
    price,
    ingredients: valueAfter(text, '配料'),
    productionDate: rawDate.replaceAll('.', '-'),
    storageMethod: valueAfter(text, '保存方式'),
    sourceFile: fileName,
    updatedAt: new Date().toISOString(),
  };
}

async function main() {
  const files = (await fs.readdir(sourceDir))
    .filter((file) => file.toLowerCase().endsWith('.docx') && !file.startsWith('~$'))
    .sort((a, b) => a.localeCompare(b, 'zh-CN'));
  const labels = [];
  const failures = [];

  for (const file of files) {
    try {
      const result = await mammoth.extractRawText({ path: path.join(sourceDir, file) });
      labels.push(parseLabel(result.value, file));
    } catch (error) {
      failures.push(error.message);
    }
  }

  const database = JSON.parse(await fs.readFile(databaseFile, 'utf8'));
  database.labels = labels;
  await fs.writeFile(databaseFile, JSON.stringify(database, null, 2), 'utf8');

  console.log(`已导入 ${labels.length} 个标签，失败 ${failures.length} 个。`);
  for (const failure of failures) console.warn(failure);
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
