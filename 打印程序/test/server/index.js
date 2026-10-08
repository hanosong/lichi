const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const { readStore, writeStore, makeId } = require('./store');
const yly = require('./yly');
const { renderPrintContent } = require('./print-format');

const app = express();
const port = Number(process.env.PORT || 3100);

app.use(cors());
app.use(express.json({ limit: '1mb' }));

function fail(res, error, status = 400) {
  console.error(`[api ${status}]`, error.message || error);
  res.status(status).json({ message: error.message || String(error) });
}

app.get('/api/bootstrap', async (_req, res) => {
  const data = await readStore();
  res.json({ ...data, cloudConfigured: yly.hasCredentials() });
});

app.post('/api/printers', async (req, res) => {
  try {
    const { machineCode, msign, name } = req.body;
    if (!machineCode?.trim() || !msign?.trim()) {
      return fail(res, new Error('机器码和终端密钥不能为空'));
    }
    await yly.addPrinter(machineCode.trim(), msign.trim(), name?.trim());
    const data = await readStore();
    const existing = data.printers.find((item) => item.machineCode === machineCode.trim());
    const printer = {
      id: existing?.id || makeId('printer'),
      machineCode: machineCode.trim(),
      name: name?.trim() || `打印机 ${machineCode.trim().slice(-4)}`,
      status: 'unknown',
      addedAt: existing?.addedAt || new Date().toISOString(),
    };
    data.printers = existing
      ? data.printers.map((item) => item.id === existing.id ? printer : item)
      : [...data.printers, printer];
    await writeStore(data);
    res.status(201).json(printer);
  } catch (error) {
    fail(res, error);
  }
});

app.get('/api/printers/:id/status', async (req, res) => {
  try {
    const data = await readStore();
    const printer = data.printers.find((item) => item.id === req.params.id);
    if (!printer) return fail(res, new Error('没有找到该打印机'), 404);
    const result = await yly.getPrinterStatus(printer.machineCode);
    printer.status = String(result.body?.state ?? result.body ?? 'unknown');
    printer.checkedAt = new Date().toISOString();
    await writeStore(data);
    res.json(printer);
  } catch (error) {
    fail(res, error);
  }
});

app.delete('/api/printers/:id', async (req, res) => {
  const data = await readStore();
  data.printers = data.printers.filter((item) => item.id !== req.params.id);
  await writeStore(data);
  res.status(204).end();
});

app.post('/api/templates', async (req, res) => {
  const data = await readStore();
  const now = new Date().toISOString();
  const template = {
    ...req.body,
    id: req.body.id || makeId('template'),
    width: Number(req.body.width || 50),
    height: Number(req.body.height || 30),
    fontSize: Number(req.body.fontSize || 12),
    updatedAt: now,
  };
  const exists = data.templates.some((item) => item.id === template.id);
  data.templates = exists
    ? data.templates.map((item) => item.id === template.id ? template : item)
    : [template, ...data.templates];
  await writeStore(data);
  res.status(exists ? 200 : 201).json(template);
});

app.delete('/api/templates/:id', async (req, res) => {
  const data = await readStore();
  data.templates = data.templates.filter((item) => item.id !== req.params.id);
  await writeStore(data);
  res.status(204).end();
});

app.post('/api/labels', async (req, res) => {
  const data = await readStore();
  const label = {
    ...req.body,
    id: req.body.id || makeId('label'),
    updatedAt: new Date().toISOString(),
  };
  const exists = data.labels.some((item) => item.id === label.id);
  data.labels = exists
    ? data.labels.map((item) => item.id === label.id ? label : item)
    : [label, ...data.labels];
  await writeStore(data);
  res.status(exists ? 200 : 201).json(label);
});

app.delete('/api/labels/:id', async (req, res) => {
  const data = await readStore();
  data.labels = data.labels.filter((item) => item.id !== req.params.id);
  await writeStore(data);
  res.status(204).end();
});

app.post('/api/print', async (req, res) => {
  try {
    const { labelId, templateId, printerId, quantity = 1, paperSize = '60x40' } = req.body;
    const data = await readStore();
    const label = data.labels.find((item) => item.id === labelId);
    const template = data.templates.find((item) => item.id === templateId);
    const printer = data.printers.find((item) => item.id === printerId);
    if (!label || !template || !printer) {
      return fail(res, new Error('请选择有效的标签、模板和打印机'));
    }
    const copies = Math.min(Math.max(Number(quantity) || 1, 1), 20);
    const content = renderPrintContent(label, template, paperSize);
    const results = [];
    for (let index = 0; index < copies; index += 1) {
      const originId = `LQ${Date.now()}${String(index).padStart(2, '0')}`;
      results.push(await yly.printText(printer.machineCode, originId, content));
    }
    const record = {
      id: makeId('print'),
      labelId,
      labelName: label.productName,
      templateName: template.name,
      printerName: printer.name,
      paperSize,
      quantity: copies,
      status: 'submitted',
      createdAt: new Date().toISOString(),
    };
    data.printRecords = [record, ...data.printRecords].slice(0, 100);
    await writeStore(data);
    res.json({ record, results });
  } catch (error) {
    fail(res, error);
  }
});

const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('/{*path}', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(distPath, 'index.html'), (error) => {
    if (error) next();
  });
});

app.use((error, _req, res, _next) => fail(res, error, 500));

const server = app.listen(port, () => {
  console.log(`梨奇标签服务已启动：http://localhost:${port}`);
  console.log(`易联云凭据：${yly.hasCredentials() ? '已加载' : '未加载'}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`端口 ${port} 已被占用，请先关闭旧的 Node 进程后再启动。`);
    process.exit(1);
  }
  console.error(error);
  process.exit(1);
});
