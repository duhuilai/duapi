# duapi (Tauri 2)

离线 API 调试与接口文档生成工具（Tauri 2 + React + TypeScript 重构版）。

## 功能

- 接口分组（多级目录）与接口的增删、排序、复制
- HTTP / GraphQL 请求调试（Query、路径参数、请求头、多种请求体、Bearer/Basic/APIKey 认证）
- 请求测试信息保存（响应快照随接口保存）
- 参数说明：从示例 JSON 自动生成（支持任意嵌套层级），可手动增改，请求/响应各自独立
- 接口文档生成：选择主分组下多个接口按排序生成一份文档，文档名默认为分组名
- 文档在线编辑（tiptap 所见即所得），可导出 HTML / Word / Markdown
- 数据导入导出：duapi 备份 JSON（合并/覆盖）、Postman 集合、OpenAPI(JSON/YAML)、curl 命令
- 所有保存/删除操作均有提示，删除需确认
- 左下角显示版本号，可检查 GitHub Releases 新版本，下载（带进度）后一键安装并退出

## 开发

```bash
npm install
npm run tauri dev
```

## 构建

```bash
npm run tauri build
```

产物：`src-tauri/target/release/bundle/nsis/*.exe`

### Windows 部署说明

- 当前默认使用 `x86_64-pc-windows-gnu` 工具链，编译产物会动态依赖 `WebView2Loader.dll`；该 DLL 已作为资源打包到安装目录，释放后与 `duapi.exe` 同目录，无需额外复制。
- NSIS 安装包使用 `offlineInstaller` 模式嵌入 WebView2 运行时安装程序，确保目标机器在无网络环境下也能完成安装。
- 如需生成单文件、不依赖任何 DLL 的可执行文件，可安装 Visual Studio Build Tools 后切换到 MSVC 工具链构建：
  ```bash
  rustup target add x86_64-pc-windows-msvc
  npm run tauri build -- --target x86_64-pc-windows-msvc
  ```

## 数据存储

所有数据保存在本地 `%APPDATA%/com.duhuilai.duapi/data.json`，完全离线运行。
仅“检查更新”功能需要访问 GitHub。
