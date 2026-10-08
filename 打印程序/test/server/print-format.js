const fieldLabels = {
  productName: '品名',
  price: '价格',
  ingredients: '配料',
  productionDate: '生产日期',
  storageMethod: '保存方式',
};

const SHOP_NAME = '梨奇宠物烘培';
const DEFAULT_FOOTER = '本产品适用于3月龄以上宠物，不可代替主食，不可饲喂反刍动物。';

const PAPER_SIZES = {
  '60x40': { id: '60x40', width: 60, height: 40, label: '60 × 40 mm' },
  '50x30': { id: '50x30', width: 50, height: 30, label: '50 × 30 mm' },
};

function escapePrintText(value) {
  return String(value ?? '')
    .replaceAll('&', '＆')
    .replaceAll('<', '＜')
    .replaceAll('>', '＞');
}

function charWidth(character) {
  return character.codePointAt(0) > 0x7f ? 2 : 1;
}

function textWidth(value) {
  let width = 0;
  for (const character of String(value)) {
    width += charWidth(character);
  }
  return width;
}

function resolvePaper(paperSize, template) {
  if (paperSize && PAPER_SIZES[paperSize]) return PAPER_SIZES[paperSize];
  const fromTemplate = `${Number(template?.width)}x${Number(template?.height)}`;
  if (PAPER_SIZES[fromTemplate]) return PAPER_SIZES[fromTemplate];
  return PAPER_SIZES['60x40'];
}

function lineWidth(paper) {
  return Number(paper.width) <= 50 ? 30 : 32;
}

function padLeft(text, width) {
  return ' '.repeat(Math.max(width - textWidth(text), 0)) + text;
}

function truncateToWidth(text, width) {
  if (textWidth(text) <= width) return text;
  let result = '';
  for (const character of text) {
    if (textWidth(result) + charWidth(character) + 2 > width) break;
    result += character;
  }
  return `${result}…`;
}

function fitOnOneLine(left, right, width) {
  const gap = width - textWidth(left) - textWidth(right);
  if (gap >= 1) return `${left}${' '.repeat(gap)}${right}`;
  if (textWidth(left) + 1 + textWidth(right) <= width) return `${left} ${right}`;
  return `${left} ${truncateToWidth(right, width - textWidth(left) - 1)}`;
}

function formatDate(value) {
  return String(value || '').replaceAll('-', '.');
}

function titleCommand(title, baseWidth, paper) {
  const useDouble = Number(paper.height) >= 40 && textWidth(title) <= Math.floor(baseWidth / 2);
  const scale = useDouble ? 2 : 1.33;
  const innerWidth = Math.max(Math.floor(baseWidth / scale / 2) * 2, 8);
  const tag = useDouble ? 'FS2' : 'FS';
  const left = Math.floor(Math.max(innerWidth - textWidth(title), 0) / 2);
  return `<${tag}>${' '.repeat(left)}${title}</${tag}>`;
}

function wrapFooter(text, width) {
  const source = escapePrintText(text);
  if (textWidth(source) <= width) return [source];

  const maxLines = width <= 30 ? 3 : 2;
  const breakAfter = /[，。、；,.！!]/;
  const lines = [];
  let rest = source;
  while (rest && lines.length < maxLines) {
    if (textWidth(rest) <= width) {
      lines.push(rest);
      rest = '';
      break;
    }
    let taken = '';
    let breakAt = 0;
    for (const character of rest) {
      if (textWidth(taken + character) > width) break;
      taken += character;
      if (breakAfter.test(character)) breakAt = taken.length;
    }
    if (!taken) taken = rest[0];
    else if (breakAt > 0 && lines.length < maxLines - 1) taken = taken.slice(0, breakAt);
    lines.push(taken);
    rest = rest.slice(taken.length);
  }
  if (rest) {
    lines[lines.length - 1] = truncateToWidth(`${lines[lines.length - 1] || ''}${rest}`, width);
  }
  return lines;
}

function footerSpacer(mainCount, footerCount, paper) {
  const tall = Number(paper.height) >= 40;
  const shopMm = 3.2;
  const titleMm = tall ? 7 : 4.2;
  const ruleMm = 1.6;
  const bodyCount = Math.max(mainCount - 3, 0);
  const bodyMm = tall ? 5.8 : 3.3;
  const footerMm = footerCount * (tall ? 3.2 : 2.8);
  const used = shopMm + titleMm + ruleMm + bodyCount * bodyMm + footerMm;
  const leftover = Number(paper.height) - used - 1;
  const blankMm = tall ? 3 : 2.8;
  return Math.max(0, Math.min(1, Math.floor(leftover / blankMm)));
}

function renderPrintContent(label, template = {}, paperSize) {
  const paper = resolvePaper(paperSize, template);
  const width = lineWidth(paper);
  const title = escapePrintText(label.productName || template.name);
  const fields = Array.isArray(template.fields) ? template.fields : [];
  const body = fields
    .filter((field) => field !== 'productName' && label[field])
    .map((field) => {
      const raw = field === 'productionDate' ? formatDate(label[field]) : label[field];
      const line = fitOnOneLine(fieldLabels[field] || field, escapePrintText(raw), width);
      return Number(paper.height) >= 40 ? `<FH>${line}</FH>` : line;
    });
  const footerText = String(label.footer || DEFAULT_FOOTER).trim() || DEFAULT_FOOTER;
  const footer = wrapFooter(footerText, width);
  const main = [
    padLeft(SHOP_NAME, width),
    titleCommand(title, width, paper),
    '-'.repeat(width),
    ...body,
  ];
  const blanks = Array(footerSpacer(main.length, footer.length, paper)).fill('');

  return [...main, ...blanks, ...footer].join('\n');
}

module.exports = {
  SHOP_NAME,
  DEFAULT_FOOTER,
  PAPER_SIZES,
  renderPrintContent,
  escapePrintText,
  resolvePaper,
};
