import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from './api';

const fieldOptions = [
  ['productName', '品名'],
  ['price', '价格'],
  ['ingredients', '配料'],
  ['productionDate', '生产日期'],
  ['storageMethod', '保存方式'],
];
const fieldName = Object.fromEntries(fieldOptions);
const SHOP_NAME = '梨奇宠物烘培';
const DEFAULT_FOOTER = '本产品适用于3月龄以上宠物，不可代替主食，不可饲喂反刍动物。';
const PAPER_PRESETS = [
  { id: '60x40', width: 60, height: 40, title: '60 × 40 mm', note: '当前用纸' },
  { id: '50x30', width: 50, height: 30, title: '50 × 30 mm', note: '小标签' },
];

const emptyLabel = {
  productName: '',
  price: '',
  ingredients: '',
  productionDate: new Date().toISOString().slice(0, 10),
  storageMethod: '常温3个月，开袋后尽快食用，不要受潮。',
  footer: DEFAULT_FOOTER,
};

const emptyTemplate = {
  name: '新标签模板',
  category: '宠物零食',
  width: 60,
  height: 40,
  fontSize: 12,
  showBorder: true,
  fields: ['productName', 'price', 'ingredients', 'productionDate', 'storageMethod'],
};

const defaultPrinterForm = {
  machineCode: '4004879269',
  msign: '543181724010',
  name: 'lichi01',
};

function Icon({ name, size = 18 }) {
  const paths = {
    printer: <><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14" rx="1"/></>,
    tag: <><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/></>,
    search: <><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    refresh: <><path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 4v5h5"/><path d="M4 13a8.1 8.1 0 0 0 15.5 2M20 20v-5h-5"/></>,
    edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></>,
    trash: <><path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    cloud: <><path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9Z"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    close: <path d="M18 6 6 18M6 6l12 12"/>,
    history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Modal({ title, onClose, children, wide = false }) {
  return createPortal(
    <div className="dialog-mask" onMouseDown={onClose}>
      <section className={`modal ${wide ? 'modal-wide' : ''}`} onMouseDown={(event) => event.stopPropagation()}>
        <header><div><span className="eyebrow">梨奇标签台</span><h2>{title}</h2></div><button className="icon-btn" onClick={onClose}><Icon name="close"/></button></header>
        {children}
      </section>
    </div>,
    document.body,
  );
}

function LabelPreview({ label, template, paper, compact = false }) {
  const data = { ...emptyLabel, ...label };
  const width = paper?.width || template.width || 60;
  const height = paper?.height || template.height || 40;
  const fields = (template.fields || []).filter((field) => field !== 'productName');
  return (
    <div className={`label-preview ${compact ? 'compact' : ''}`} style={{ '--label-font': `${height >= 40 ? 14 : 11}px`, aspectRatio: `${width}/${height}` }}>
      <div className="label-inner">
        <span className="shop-name">{SHOP_NAME}</span>
        <strong className="label-title">{data.productName || '宠物零食名称'}</strong>
        <div className="preview-rule"/>
        <div className="label-body">
          {fields.map((field) => (
            <p key={field}><span>{fieldName[field] || field}</span><b>{field === 'productionDate' && data[field] ? data[field].replaceAll('-', '.') : data[field] || '—'}</b></p>
          ))}
        </div>
        <p className="label-footer">{(data.footer || DEFAULT_FOOTER).replace('，', '，\n')}</p>
      </div>
    </div>
  );
}

function PrinterPage({ data, reload, notify }) {
  const [selectedId, setSelectedId] = useState(data.templates[0]?.id);
  const [draft, setDraft] = useState(data.templates[0] || emptyTemplate);
  const [showPrinter, setShowPrinter] = useState(false);
  const [printerForm, setPrinterForm] = useState(defaultPrinterForm);
  const [busy, setBusy] = useState(false);

  function openPrinterModal() {
    setPrinterForm({ ...defaultPrinterForm });
    setShowPrinter(true);
  }

  useEffect(() => {
    const selected = data.templates.find((item) => item.id === selectedId);
    if (selected) setDraft(selected);
  }, [selectedId, data.templates]);

  async function saveTemplate() {
    if (!draft.name.trim()) return notify('请填写模板名称', 'error');
    setBusy(true);
    try {
      const saved = await api.saveTemplate(draft);
      setSelectedId(saved.id);
      await reload();
      notify('模板已保存');
    } catch (error) { notify(error.message, 'error'); }
    finally { setBusy(false); }
  }

  async function addPrinter(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.addPrinter(printerForm);
      setShowPrinter(false);
      setPrinterForm(defaultPrinterForm);
      await reload();
      notify('打印机已通过云端绑定');
    } catch (error) { notify(error.message, 'error'); }
    finally { setBusy(false); }
  }

  async function checkPrinter(id) {
    setBusy(true);
    try {
      await api.checkPrinter(id);
      await reload();
      notify('打印机状态已更新');
    } catch (error) { notify(error.message, 'error'); }
    finally { setBusy(false); }
  }

  return (
    <>
      <div className="page-heading">
        <div><span className="eyebrow">PRINT STUDIO</span><h1>打印机控制</h1><p>管理云端设备，设计属于梨奇的标签样式。</p></div>
        <button type="button" className="primary-btn" onClick={openPrinterModal}><Icon name="plus"/>添加打印机</button>
      </div>

      {!data.cloudConfigured && <div className="notice"><span className="notice-icon"><Icon name="cloud"/></span><div><strong>易联云尚未连接</strong><p>请在服务端环境变量中配置应用 ID 和应用密钥。系统不会调用本地打印驱动。</p></div><span className="status-pill warning">待配置</span></div>}

      <section className="section-block">
        <div className="section-title"><div><h2>云端打印机</h2><p>{data.printers.length ? `已绑定 ${data.printers.length} 台设备` : '还没有绑定设备'}</p></div></div>
        <div className="printer-grid">
          {data.printers.map((printer) => (
            <article className="printer-card" key={printer.id}>
              <div className="device-icon"><Icon name="printer" size={24}/></div>
              <div className="device-main"><div><h3>{printer.name}</h3><p>{printer.machineCode}</p></div><span className={`status-dot ${printer.status === 'online' ? 'online' : ''}`}>{printer.status === 'online' ? '在线' : printer.status === 'unknown' ? '未检测' : printer.status}</span></div>
              <button className="soft-btn" disabled={busy || !data.cloudConfigured} onClick={() => checkPrinter(printer.id)}><Icon name="refresh"/>检测状态</button>
            </article>
          ))}
          {!data.printers.length && <button type="button" className="empty-printer" onClick={openPrinterModal}><span><Icon name="plus"/></span><strong>绑定第一台打印机</strong><small>使用机器码和终端密钥连接易联云</small></button>}
        </div>
      </section>

      <section className="template-studio">
        <aside className="template-list">
          <div className="panel-title"><div><span className="eyebrow">TEMPLATES</span><h2>标签模板</h2></div><button className="icon-btn warm" onClick={() => { setSelectedId(null); setDraft(emptyTemplate); }}><Icon name="plus"/></button></div>
          {data.templates.map((template) => <button key={template.id} className={`template-item ${selectedId === template.id ? 'active' : ''}`} onClick={() => setSelectedId(template.id)}><span className="mini-label"/><span><strong>{template.name}</strong><small>{template.width} × {template.height} mm</small></span><Icon name="chevron" size={16}/></button>)}
        </aside>

        <div className="template-editor">
          <div className="editor-head"><div><span className="eyebrow">EDITOR</span><h2>模板设置</h2></div><button className="primary-btn" disabled={busy} onClick={saveTemplate}><Icon name="check"/>{busy ? '保存中…' : '保存模板'}</button></div>
          <div className="editor-layout">
            <div className="form-stack">
              <label>模板名称<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })}/></label>
              <div className="form-row"><label>宽度（mm）<input type="number" min="20" max="100" value={draft.width} onChange={(event) => setDraft({ ...draft, width: event.target.value })}/></label><label>高度（mm）<input type="number" min="15" max="100" value={draft.height} onChange={(event) => setDraft({ ...draft, height: event.target.value })}/></label></div>
              <label>字号 <span className="range-value">{draft.fontSize}px</span><input className="range" type="range" min="9" max="18" value={draft.fontSize} onChange={(event) => setDraft({ ...draft, fontSize: event.target.value })}/></label>
              <div><span className="input-label">显示字段</span><div className="field-pills">{fieldOptions.map(([key, title]) => <button key={key} className={(draft.fields || []).includes(key) ? 'selected' : ''} onClick={() => setDraft({ ...draft, fields: (draft.fields || []).includes(key) ? draft.fields.filter((item) => item !== key) : [...(draft.fields || []), key] })}>{title}</button>)}</div></div>
            </div>
            <div className="preview-stage"><div className="preview-caption"><span>实时预览</span><small>右上角为店铺名，打印时按所选纸张铺满</small></div><LabelPreview label={data.labels[0]} template={draft}/><div className="size-note">{draft.width} mm × {draft.height} mm</div></div>
          </div>
        </div>
      </section>

      {showPrinter && <Modal title="绑定易联云打印机" onClose={() => setShowPrinter(false)}><form className="modal-form" onSubmit={addPrinter}><div className="form-note"><Icon name="cloud"/><span>信息只会发送至 Node 服务端和易联云云端，不调用本地驱动。</span></div><label>打印机名称<input placeholder="例如：包装台打印机" value={printerForm.name} onChange={(event) => setPrinterForm({ ...printerForm, name: event.target.value })}/></label><label>机器码<input required placeholder="打印机底部的机器码" value={printerForm.machineCode} onChange={(event) => setPrinterForm({ ...printerForm, machineCode: event.target.value })}/></label><label>终端密钥<input required type="password" placeholder="仅用于本次绑定，不会保存" value={printerForm.msign} onChange={(event) => setPrinterForm({ ...printerForm, msign: event.target.value })}/></label><footer><button type="button" className="text-btn" onClick={() => setShowPrinter(false)}>取消</button><button className="primary-btn" disabled={busy}>{busy ? '正在连接…' : '连接云端'}</button></footer></form></Modal>}
    </>
  );
}

function LabelsPage({ data, reload, notify }) {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [printing, setPrinting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [printForm, setPrintForm] = useState({ printerId: data.printers[0]?.id || '', templateId: data.templates[0]?.id || '', quantity: 1, paperSize: '60x40' });

  const labels = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return data.labels;
    return data.labels.filter((item) => Object.values(item).some((value) => String(value).toLowerCase().includes(keyword)));
  }, [data.labels, search]);

  async function saveLabel(event) {
    event.preventDefault();
    if (!editing.productName.trim()) return notify('请填写产品名称', 'error');
    setBusy(true);
    try { await api.saveLabel(editing); setEditing(null); await reload(); notify('标签已保存'); }
    catch (error) { notify(error.message, 'error'); }
    finally { setBusy(false); }
  }

  async function removeLabel(label) {
    if (!window.confirm(`确定删除“${label.productName}”吗？`)) return;
    try { await api.removeLabel(label.id); await reload(); notify('标签已删除'); }
    catch (error) { notify(error.message, 'error'); }
  }

  async function submitPrint(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.print({ labelId: printing.id, ...printForm });
      setPrinting(null);
      await reload();
      notify('打印任务已提交到易联云');
    } catch (error) { notify(error.message, 'error'); }
    finally { setBusy(false); }
  }

  const selectedTemplate = data.templates.find((item) => item.id === printForm.templateId) || data.templates[0] || emptyTemplate;
  const selectedPaper = PAPER_PRESETS.find((item) => item.id === printForm.paperSize) || PAPER_PRESETS[0];

  return (
    <>
      <div className="page-heading">
        <div><span className="eyebrow">LABEL LIBRARY</span><h1>标签管理</h1><p>查找、编辑并打印你的宠物零食标签。</p></div>
        <button className="primary-btn" onClick={() => setEditing({ ...emptyLabel })}><Icon name="plus"/>新建标签</button>
      </div>

      <div className="stats-row">
        <div><span className="stat-icon peach"><Icon name="tag"/></span><p><b>{data.labels.length}</b><small>全部标签</small></p></div>
        <div><span className="stat-icon sage"><Icon name="printer"/></span><p><b>{data.printRecords.length}</b><small>打印记录</small></p></div>
        <div><span className="stat-icon cream"><Icon name="history"/></span><p><b>{data.labels.filter((item) => item.productionDate === new Date().toISOString().slice(0, 10)).length}</b><small>今日新增</small></p></div>
      </div>

      <section className="table-panel">
        <div className="table-toolbar"><div className="search-box"><Icon name="search"/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索品名、配料、价格或保存方式…"/>{search && <button onClick={() => setSearch('')}><Icon name="close" size={15}/></button>}</div><span>找到 {labels.length} 个标签</span></div>
        <div className="table-scroll"><table><thead><tr><th>产品标签</th><th>配料</th><th>生产日期</th><th>保存方式</th><th>价格</th><th>最后更新</th><th className="actions">操作</th></tr></thead><tbody>
          {labels.map((label) => <tr key={label.id}><td><div className="product-cell"><span>{label.productName.slice(0, 1)}</span><div><strong>{label.productName}</strong><small>烘干产品</small></div></div></td><td><strong className="cell-main truncate-cell">{label.ingredients || '—'}</strong></td><td>{label.productionDate ? label.productionDate.replaceAll('-', '.') : '—'}</td><td><span className="truncate-cell">{label.storageMethod || '—'}</span></td><td><strong className="price">{label.price || '—'}</strong></td><td><small>{new Date(label.updatedAt).toLocaleDateString('zh-CN')}</small></td><td className="actions"><button className="table-icon" title="编辑" onClick={() => setEditing({ ...emptyLabel, ...label, footer: label.footer || DEFAULT_FOOTER })}><Icon name="edit" size={16}/></button><button className="table-icon danger" title="删除" onClick={() => removeLabel(label)}><Icon name="trash" size={16}/></button><button className="print-btn" onClick={() => { setPrintForm({ printerId: data.printers[0]?.id || '', templateId: data.templates[0]?.id || '', quantity: 1, paperSize: '60x40' }); setPrinting(label); }}><Icon name="printer" size={16}/>打印</button></td></tr>)}
          {!labels.length && <tr><td colSpan="7"><div className="empty-state"><span><Icon name="search" size={26}/></span><strong>没有找到匹配的标签</strong><p>换个关键词，或者新建一个标签。</p></div></td></tr>}
        </tbody></table></div>
      </section>

      {editing && <Modal title={editing.id ? '编辑产品标签' : '新建产品标签'} onClose={() => setEditing(null)} wide><form className="modal-form label-form" onSubmit={saveLabel}><div className="form-grid">{fieldOptions.map(([key, title]) => <label key={key} className={key === 'ingredients' || key === 'storageMethod' ? 'span-2' : ''}>{title}{key === 'ingredients' || key === 'storageMethod' ? <textarea rows="2" value={editing[key] || ''} onChange={(event) => setEditing({ ...editing, [key]: event.target.value })}/> : <input required={key === 'productName'} type={key === 'productionDate' ? 'date' : 'text'} placeholder={key === 'price' ? '例如：35元/5根' : ''} value={editing[key] || ''} onChange={(event) => setEditing({ ...editing, [key]: event.target.value })}/>}</label>)}<label className="span-2">页脚说明<textarea rows="2" value={editing.footer || ''} onChange={(event) => setEditing({ ...editing, footer: event.target.value })}/></label></div><footer><button type="button" className="text-btn" onClick={() => setEditing(null)}>取消</button><button className="primary-btn" disabled={busy}>{busy ? '保存中…' : '保存标签'}</button></footer></form></Modal>}

      {printing && <Modal title="确认云端打印" onClose={() => setPrinting(null)} wide><form className="print-dialog" onSubmit={submitPrint}><div className="print-preview-wrap"><span className="eyebrow">PRINT PREVIEW</span><LabelPreview label={printing} template={selectedTemplate} paper={selectedPaper}/><p>预览按 {selectedPaper.title} 排版，右上角为店铺名。</p></div><div className="print-options"><h3>{printing.productName}</h3><p>打印任务将直接提交至易联云，不使用本地驱动。</p><div><span className="input-label">纸张尺寸</span><div className="paper-sizes">{PAPER_PRESETS.map((item) => <button type="button" key={item.id} className={printForm.paperSize === item.id ? 'paper-size selected' : 'paper-size'} onClick={() => setPrintForm({ ...printForm, paperSize: item.id })}><strong>{item.title}</strong><small>{item.note}</small></button>)}</div></div><label>选择打印机<select required value={printForm.printerId} onChange={(event) => setPrintForm({ ...printForm, printerId: event.target.value })}><option value="">请选择</option>{data.printers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>选择模板<select required value={printForm.templateId} onChange={(event) => setPrintForm({ ...printForm, templateId: event.target.value })}>{data.templates.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>打印数量<input type="number" min="1" max="20" value={printForm.quantity} onChange={(event) => setPrintForm({ ...printForm, quantity: event.target.value })}/></label>{!data.cloudConfigured && <div className="inline-warning">请先配置易联云应用凭据</div>}{!data.printers.length && <div className="inline-warning">请先在“打印机控制”中绑定设备</div>}<footer><button type="button" className="text-btn" onClick={() => setPrinting(null)}>取消</button><button className="primary-btn" disabled={busy || !data.cloudConfigured || !data.printers.length}><Icon name="printer"/>{busy ? '提交中…' : '确认打印'}</button></footer></div></form></Modal>}
    </>
  );
}

export default function App() {
  const [page, setPage] = useState('printers');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  async function reload() {
    try { setData(await api.bootstrap()); setError(''); }
    catch (requestError) { setError(requestError.message); }
  }

  useEffect(() => { reload(); }, []);

  function notify(message, type = 'success') {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3200);
  }

  if (!data) return <div className="app-loading"><span className="brand-mark">梨</span><p>{error || '正在整理标签台…'}</p>{error && <button className="soft-btn" onClick={reload}>重新连接</button>}</div>;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">梨</span><div><strong>梨奇标签台</strong><small>LIQI PRINT STUDIO</small></div></div>
        <nav><span className="nav-caption">工作台</span><button className={page === 'printers' ? 'active' : ''} onClick={() => setPage('printers')}><Icon name="printer"/><span>打印机控制</span></button><button className={page === 'labels' ? 'active' : ''} onClick={() => setPage('labels')}><Icon name="tag"/><span>标签管理</span><i>{data.labels.length}</i></button></nav>
        <div className="sidebar-foot"><div className={`cloud-state ${data.cloudConfigured ? 'ready' : ''}`}><Icon name="cloud"/><span><strong>{data.cloudConfigured ? '云端已配置' : '云端待配置'}</strong><small>易联云 · 自有型应用</small></span></div><p>只连接云端接口<br/>不会启动本地驱动</p></div>
      </aside>
      <main className="main-content">
        {page === 'printers' ? <PrinterPage data={data} reload={reload} notify={notify}/> : <LabelsPage data={data} reload={reload} notify={notify}/>}
      </main>
      {toast && <div className={`toast ${toast.type}`}><span><Icon name={toast.type === 'error' ? 'close' : 'check'} size={16}/></span>{toast.message}</div>}
    </div>
  );
}
