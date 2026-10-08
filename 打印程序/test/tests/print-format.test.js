const test = require('node:test');
const assert = require('node:assert/strict');
const { renderPrintContent, escapePrintText, SHOP_NAME } = require('../server/print-format');

const sampleLabel = {
  productName: '一口披萨',
  price: '35元/5根',
  ingredients: '鸭胸肉、红薯',
  productionDate: '2026-06-15',
  storageMethod: '常温3个月',
};

const sampleTemplate = {
  name: '产品标签',
  width: 50,
  height: 30,
  showBorder: true,
  fields: ['productName', 'price', 'ingredients', 'productionDate', 'storageMethod'],
};

function commandFreeWidth(line) {
  return [...line.replace(/<[^>]+>/g, '')].reduce((sum, ch) => sum + (ch.codePointAt(0) > 0x7f ? 2 : 1), 0);
}

test('打印内容使用烘干产品文档字段并格式化日期', () => {
  const content = renderPrintContent(sampleLabel, sampleTemplate, '50x30');

  assert.match(content, /一口披萨/);
  assert.match(content, /价格/);
  assert.match(content, /35元\/5根/);
  assert.match(content, /配料/);
  assert.match(content, /鸭胸肉、红薯/);
  assert.match(content, /生产日期/);
  assert.match(content, /2026\.06\.15/);
  assert.match(content, /保存方式/);
  assert.match(content, /常温3个月/);
});

test('60×40 标题加倍高宽，正文加高，不输出无效宽度指令', () => {
  const content = renderPrintContent(sampleLabel, sampleTemplate, '60x40');

  assert.match(content, /<FS2>[\s\S]*一口披萨[\s\S]*<\/FS2>/);
  assert.match(content, /<FH>价格/);
  assert.doesNotMatch(content, /<W>/i);
  assert.doesNotMatch(content, /<MF>/i);
  assert.doesNotMatch(content, /<BR>/i);
  assert.doesNotMatch(content, /<\/?CB>/i);
});

test('品名只作为标题出现一次，不在正文里重复', () => {
  const content = renderPrintContent(sampleLabel, sampleTemplate, '60x40');
  assert.equal(content.includes('品名'), false);
  assert.equal([...content.matchAll(/一口披萨/g)].length, 1);
});

test('店铺名和每个字段都只占一行，页脚两行贴底且不超出纸宽', () => {
  const content = renderPrintContent(
    {
      productName: '大补小鹌鹑',
      price: '22元/50g',
      ingredients: '刚出生的鹌鹑苗',
      productionDate: '2026-08-20',
      storageMethod: '常温3个月，开袋即食',
    },
    sampleTemplate,
    '60x40',
  );
  const lines = content.split('\n').filter((line) => line.length > 0);
  const footerLines = lines.filter((line) => line.includes('本产品适用于') || line.includes('不可饲喂'));

  assert.equal(lines.filter((line) => line.includes(SHOP_NAME)).length, 1);
  assert.equal(lines.filter((line) => line.includes('大补小鹌鹑')).length, 1);
  assert.ok(lines.some((line) => line.includes('配料') && line.includes('刚出生的鹌鹑苗')));
  assert.ok(lines.some((line) => line.includes('2026.08.20')));
  assert.ok(lines.some((line) => line.includes('保存方式') && line.includes('开袋即食')));
  assert.equal(content.includes('2026.0\n'), false);
  assert.doesNotMatch(content, /<BMP>/i);
  assert.match(content, /本产品适用于3月龄以上宠物，/);
  assert.match(content, /不可饲喂反刍动物/);
  assert.ok(content.indexOf('保存方式') < content.indexOf('本产品适用于'));
  assert.ok(content.endsWith('不可饲喂反刍动物。') || content.trim().endsWith('不可饲喂反刍动物。'));
  assert.equal(footerLines.length, 2);
  assert.ok(footerLines.every((line) => commandFreeWidth(line) <= 32));
  assert.ok(lines.every((line) => commandFreeWidth(line) <= 32));
});

test('字段过长时压缩中间空格，仍然保持一行', () => {
  const content = renderPrintContent(
    {
      ...sampleLabel,
      ingredients: '樱桃谷鸭鸭胸肉、红薯、西兰花',
      storageMethod: '常温3个月，开袋后尽快食用，不要受潮。',
    },
    sampleTemplate,
    '60x40',
  );
  const body = content.split('\n').filter((line) => line.includes('配料') || line.includes('保存方式'));

  assert.equal(body.filter((line) => line.includes('配料')).length, 1);
  assert.equal(body.filter((line) => line.includes('保存方式')).length, 1);
  assert.ok(body.some((line) => line.includes('保存方式') && line.includes('常温3个月')));
});

test('用户内容不能注入易联云打印标签', () => {
  assert.equal(escapePrintText('<FS2>大字</FS2>&'), '＜FS2＞大字＜/FS2＞＆');
  const content = renderPrintContent(
    { ...sampleLabel, productName: '<BR>注入</CB>' },
    sampleTemplate,
    '60x40',
  );
  assert.match(content, /＜BR＞注入＜\/CB＞/);
  assert.doesNotMatch(content, /<BR>注入<\/CB>/);
});
