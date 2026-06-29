# duapi — 离线 API 测试工具

> 类 Postman 的跨平台桌面 API 调试工具，专为离线环境设计，内网开发无压力。

<p align="center">
  <img src="public/icon.png" width="128" alt="duapi logo" />
</p>

<p align="center">
  <a href="https://github.com/duhuilai/duapi/releases"><img src="https://img.shields.io/github/v/release/duhuilai/duapi?color=1E40AF" alt="release"></a>
  <a href="https://github.com/duhuilai/duapi/actions"><img src="https://img.shields.io/github/actions/workflow/status/duhuilai/duapi/build.yml" alt="CI"></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="platform">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="license">
</p>

---

## 功能概览

| 模块 | 功能 |
|------|------|
| **接口管理** | 分组树管理、新建/删除/重命名分组和接口、搜索过滤 |
| **请求调试** | 支持 GET/POST/PUT/DELETE/PATCH/HEAD/OPTIONS 方法，URL 参数、Headers、Auth 认证 |
| **请求体** | JSON / Form / Raw 多种格式，Body JSON 自动生成参数 Schema 注释 |
| **响应查看** | JSON 语法高亮、响应 Headers/Cookies 查看、响应时间/状态码展示 |
| **响应 Schema** | 自动解析响应 JSON 生成字段说明表，支持填写字段注释 |
| **文档导出** | 所见即所得富文本编辑器，一键生成 API 文档，支持导出 Markdown / HTML / PDF / Word |
| **环境变量** | `{{base_url}}` 模板变量支持 |
| **离网可用** | 无需网络连接，本地运行，数据本地持久化 |
| **跨平台** | Windows（.exe）、macOS（.dmg / .zip）、Linux（.AppImage）三平台安装包 |

---

## 界面布局

```
┌──────────────┬─────────────────────────────────────┐
│              │  RequestBar (URL + 方法 + 保存/发送)  │
│  接口列表     │  ── 拖拽手柄 ────────────────────── │
│  (可拖宽)    │  RequestTabs                         │
│              │  (Params / Headers / Auth / Body /    │
│  分组管理     │   Pre-script / Tests)                │
│  新建/删除    │  StatusBar                          │
│  搜索/过滤    │  ── 拖拽手柄 ────────────────────── │
│              │  ResponsePanel                       │
│              │  (Body / Headers / Cookies / Schema)  │
└──────────────┴─────────────────────────────────────┘
```

- **侧边栏宽度** 可拖拽调整（180–480px）
- **响应区高度** 可拖拽调整（120–800px）

---

## 技术栈

| 层 | 技术 |
|----|------|
| 桌面框架 | Electron 31 |
| 前端 | React 18 + TypeScript |
| 构建 | Vite 5 |
| 状态管理 | React Context + useReducer |
| 持久化 | localStorage |
| HTTP | Electron IPC 主进程代理 / 浏览器 fetch 回退 |
| 打包 | electron-builder |
| CI/CD | GitHub Actions (macOS + Windows 并行构建) |

---

## 快速开始

### 下载安装

从 [Releases](https://github.com/duhuilai/duapi/releases) 页面下载最新版本：

- **Windows** → `duapi-x.x.x-windows-setup.exe`
- **macOS** → `duapi-x.x.x-mac-arm64.dmg` 或 `.zip`

> **macOS 用户注意**：由于应用未经过 Apple 官方签名，首次打开请**右键**应用图标 → 选择「打开」，或在终端执行 `xattr -cr /Applications/duapi.app`。

### 开发运行

```bash
# 克隆仓库
git clone git@github.com:duhuilai/duapi.git
cd duapi

# 安装依赖
npm install

# 启动开发模式
npm run electron:dev
```

### 构建安装包

```bash
# 构建全部平台
npm run electron:build

# 仅构建 Windows
npm run electron:build:win

# 仅构建 macOS
npm run electron:build:mac
```

---

## 项目结构

```
duApi/
├── electron/
│   ├── main/index.ts        # Electron 主进程（IPC HTTP 代理）
│   └── preload/index.ts     # 预加载脚本（IPC 桥接）
├── src/
│   ├── components/
│   │   ├── Sidebar.tsx       # 左侧接口分组侧边栏
│   │   ├── RequestBar.tsx    # URL 栏 + 方法选择 + 保存/发送
│   │   ├── RequestTabs.tsx   # 请求参数/Headers/Body 等 Tab
│   │   ├── ResponsePanel.tsx # 响应面板（Body/Headers/Cookies/Schema）
│   │   ├── StatusBar.tsx     # 底部状态栏
│   │   ├── ExportPage.tsx    # 文档生成与导出
│   │   ├── WysiwygEditor.tsx # 所见即所得富文本编辑器
│   │   └── Navigation.tsx    # 顶部导航栏
│   ├── store/
│   │   └── ApiContext.tsx    # 全局状态管理 + localStorage 持久化
│   ├── types/
│   │   └── index.ts          # TypeScript 类型定义
│   ├── utils/
│   │   ├── storage.ts        # localStorage 工具
│   │   └── converters.ts     # Markdown ↔ HTML 转换器
│   ├── App.tsx
│   └── main.tsx
├── public/
│   └── icon.png              # 应用图标
├── .github/workflows/
│   └── build.yml             # CI/CD 自动构建流水线
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## 更新日志

### v1.7.2 (2026-06-29)
- ✨ **返回值错误码说明管理** — 每个接口独立管理错误码表（错误码/HTTP状态码/错误信息/详细说明），文档导出自动生成错误码说明表格
- 🎨 Response Schema 标签增加「错误码说明」区域，支持新增/编辑/删除，HTTP 状态码下拉选择

### v1.7.1 (2026-06-29)
- 🎨 **表格框线** — WYSIWYG 编辑器增加 table/th/td 完整边框样式，隔行换色
- ✨ **接口说明** — workspace 顶部新增可折叠「接口说明」编辑区，描述随接口持久化保存
- 🐛 **导出按钮** — 修复导出页 footer 被编辑器挤出屏幕的问题，底部保存/导出按钮常驻可见
- 🎨 **代码块/引用样式** — WYSIWYG 编辑器增加 pre/code/blockquote/hr 完整样式

### v1.7.0 (2026-06-29)
- ✨ **Body JSON 参数 Schema** — 自动解析 Body JSON 生成字段说明表，支持参数注释编辑，文档导出可提取请求体参数
- 🐛 修复 SAVE_ENDPOINT 时 bodyType 丢失的问题

### v1.6.0 (2026-06-29)
- ✨ **所见即所得编辑器** — 文档编辑从纯文本 Markdown 升级为富文本编辑器，支持工具栏一键格式（H1/H2/H3、加粗/斜体/下划线、列表、代码块、表格、分隔线）
- ✨ 新增 `mdToHtml` / `htmlToMd` 双向转换器

### v1.5.1 (2026-06-29)
- 🐛 优化 macOS 构建配置：新增 zip 分发格式，启用 ad-hoc 自签名，禁用 hardened runtime
- 🐛 减少 macOS Gatekeeper 弹窗困扰

### v1.5.0 (2026-06-29)
- ✨ **文档导出全面重构** — 支持生成→编辑→保存→导出完整流程
- ✨ 自动从接口数据（含 Body/Response Schema）拼装 Markdown 文档
- ✨ 支持导出 Markdown / HTML / PDF / Word 四种格式

### v1.4.0 (2026-06-29)
- 🎨 **布局重构** — 响应面板移至请求调试区下方，不再侧边挤窄
- ✨ 侧边栏宽度可拖拽调整（180–480px）
- ✨ 响应区高度可拖拽调整（120–800px）

### v1.3.0 (2026-06-29)
- ✨ **响应参数 Schema** — 新增 Schema 选项卡，自动解析响应 JSON 生成字段路径/类型/示例值
- ✨ 支持为每个字段编辑「必填」标记和「说明」注释
- ✨ `Ctrl+S` 保存时一并持久化响应参数注释

### v1.2.1 (2026-06-29)
- 🐛 **CI 自动同步版本号** — 构建时从 Git tag 读取版本号写入 package.json，安装包文件名不再全是 1.0.0

### v1.2.0 (2026-06-29)
- ✨ **接口保存按钮** — 请求编辑区新增「保存」按钮
- ✨ `Ctrl+S`（macOS 为 `Cmd+S`）快捷键保存接口修改
- 🐛 修复切换接口后编辑内容丢失的问题

### v1.1.1 (2026-06-29)
- 🐛 **修复启动白屏** — 移除对 Google Fonts 的外部依赖，改为系统原生字体，离网环境秒启动

### v1.1.0 (2026-06-29)
- ✨ **分组管理 CRUD** — 左侧新增「＋ 分组」按钮
- ✨ **接口管理 CRUD** — 悬停分组行显示「＋接口」「✕删除分组」
- ✨ 悬停接口行显示「✕删除接口」
- ✨ 双击分组/接口名称支持内联重命名
- 🛡️ 删除操作带确认框，防止误删

### v1.0.0 (2026-06-28)
- 🎉 首个正式版本发布
- ✅ 基础 API 请求调试（GET/POST/PUT/DELETE/PATCH）
- ✅ 请求参数、Headers、Auth（Bearer/Basic）管理
- ✅ JSON 响应语法高亮
- ✅ 环境变量模板 `{{var}}` 支持
- ✅ 数据本地 localStorage 持久化
- ✅ 自定义应用图标
- ✅ GitHub Actions CI/CD 自动构建 macOS / Windows 安装包

---

## License

MIT © [duhuilai](https://github.com/duhuilai)
