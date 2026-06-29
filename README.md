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

### v0.0.5 (2026-06-29)
- ✨ **文档编辑器全面升级** — 替换为 TipTap 专业富文本编辑器（基于 ProseMirror）
  - 🔤 **文字样式**：加粗 / 斜体 / 下划线 / 删除线 / 文字颜色 / 高亮 / 清除格式
  - 📐 **段落对齐**：左对齐 / 居中 / 右对齐
  - 🔗 **链接/图片**：支持插入超链接、远程图片
  - ↩️ **撤销/重做**：独立按钮 + Ctrl+Z / Ctrl+Y 快捷键
  - 🎯 **工具栏分组**：标题 / 样式 / 对齐 / 列表 / 插入 — 五大功能区分组排列，选中态高亮

### v0.0.4 (2026-06-29)
- 📝 **文档格式严格模板化** — 按「喀斯玛平台对接」Word 模板重组生成格式：分组名→H1、接口说明/地址/方式/参数类型→独立 H2 区块、请求头列名统一、Body 参数改为字段名/字段说明/字段类型/是否必填、响应拆分成功/失败编码、错误码精简为接口返回码/接口返回描述两列

### v0.0.3 (2026-06-29)
- 🐛 **Release Notes 修复** — CI 发布流程改用 tag 注释作为 Release 内容，不再被 "Full Changelog" 覆盖

### v0.0.2 (2026-06-29)
- ✨ **保存提示** — 保存按钮点击后显示「✓ 已保存」绿色反馈，Ctrl+S 保存弹出底部 Toast 确认
- 🎨 **表格列竖线** — 所有 Schema 表格（响应参数、Body 参数、错误码）增加列竖线，拖拽定位更精准
- 🔧 **移除分组图标** — 侧边栏分组名称前的无意义字母图标已移除
- 🐛 **拖拽方向修正** — 工作区上下分栏拖拽方向修正，向上拖 → 响应面板增高
- 🐛 **错误码崩溃修复** — 修复旧数据接口点击「添加错误码」后程序白屏的严重 bug
- 🐛 **文档表格空列修复** — 修复生成的 Markdown 文档中表格前后多余的空白列
- ✨ **返回结果示例** — 发送请求后自动保存响应结果到接口，文档导出时增加「返回结果示例」代码块
- 📝 **文档格式优化** — 接口文档结构重组为：描述→接口地址→请求头→请求参数→请求示例→请求体参数→响应参数→返回示例→错误码

### v0.0.1 (2026-06-28)

**API 请求调试**
- 支持 GET / POST / PUT / DELETE / PATCH / HEAD / OPTIONS 全部方法
- URL 参数、Headers、Auth 认证（Bearer Token / Basic Auth）
- JSON / Form / Raw 多种请求体格式
- 请求和响应 JSON 语法高亮展示
- 响应 Headers / Cookies 面板查看
- 底部状态栏展示响应时间、状态码、响应大小

**Schema 自动解析**
- 响应 Body 自动解析 JSON 结构，生成字段路径 / 类型 / 示例值说明表
- 请求 Body JSON 自动生成参数 Schema 说明表
- 支持为每个字段编辑「必填」标记和「说明」注释
- 所有 Schema 表格支持列宽拖拽自由调整

**错误码管理**
- 每个接口独立管理错误码表（错误码 / HTTP 状态码 / 错误信息 / 详细说明）
- 支持新增、编辑、删除错误码条目
- 文档导出时自动生成错误码说明表格

**接口管理**
- 分组树管理：新建 / 重命名 / 删除分组，支持无限嵌套
- 接口管理：新建 / 重命名 / 删除接口，支持搜索过滤
- 搜索时自动展开匹配的分组，橙色高亮定位到匹配接口
- 接口保存按钮 + `Ctrl+S` 快捷键保存
- 接口说明字段，可折叠编辑区描述接口用途

**文档导出**
- 所见即所得富文本编辑器，工具栏支持 H1-H3、加粗、斜体、下划线、列表、代码块、表格、分隔线
- 一键从接口数据生成 Markdown 文档（含请求参数 / Body / 响应 Schema / 错误码）
- 支持导出 Markdown / HTML / PDF / Word 四种格式
- 表格、代码块完整 CSS 样式（框线、隔行换色）

**布局与交互**
- 侧边栏宽度可拖拽调整（180–480px）
- 响应区高度可拖拽调整（120–800px）
- 响应面板「📋 复制」按钮一键复制响应内容到剪贴板

**模板变量**
- `{{var}}` 语法支持环境变量模板解析

**跨平台构建**
- Windows（NSIS 安装包 .exe）
- macOS（DMG + ZIP 分发）
- GitHub Actions CI/CD 自动化构建发布
- 离网环境零依赖运行，数据本地 localStorage 持久化

---

## License

MIT © [duhuilai](https://github.com/duhuilai)
