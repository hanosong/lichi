# 梨奇宠物零食标签台

React + Node.js 构建的标签管理和易联云云端打印应用。打印请求只会从 Node 服务端调用 `yly-nodejs-sdk`，不会启动或调用本地打印驱动。

## 启动

1. 复制 `.env.example` 为 `.env`
2. 在 `.env` 中填写易联云自有型应用的 `YLY_CLIENT_ID` 和 `YLY_CLIENT_SECRET`
3. 运行：

```bash
npm install
npm run dev
```

浏览器访问 `http://localhost:5173`。

## 从 Word 重新导入标签

项目已从相邻的 `烘干产品` 文件夹导入 63 个标签。文档有更新时运行：

```bash
npm run import:labels
```

导入器识别产品名称、价格/售价、配料、生产日期和保存方式。

## 生产运行

```bash
npm run build
npm start
```

浏览器访问 `http://localhost:3100`。

## 数据与凭据

- 标签、模板、打印机和最近 100 条打印记录保存在 `data/database.json`
- 易联云应用凭据只从服务端环境变量读取
- 打印机终端密钥仅在绑定时发送给易联云，不会写入本地数据文件
- 单次打印数量限制为 1–20 份
