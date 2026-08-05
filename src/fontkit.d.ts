// @pdf-lib/fontkit 的官方类型只导出了具名 `create`，未声明 default 导出，
// 但运行时 ESM 构建（dist/fontkit.es.js）是 `export default fontkit`。
// 这里补一个 default 导出，让 TS 的 `import fontkit from "@pdf-lib/fontkit"` 通过。
declare module "@pdf-lib/fontkit" {
  const fontkit: {
    create(buffer: Uint8Array, postscriptName?: string): any;
  };
  export default fontkit;
}
