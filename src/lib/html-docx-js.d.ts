declare module "html-docx-js" {
  interface HtmlDocxOptions {
    orientation?: "portrait" | "landscape";
    margins?: { top?: number; right?: number; bottom?: number; left?: number };
    title?: string;
    author?: string;
  }
  interface HtmlDocx {
    asBlob(html: string, options?: HtmlDocxOptions): Blob;
  }
  const htmlDocx: HtmlDocx;
  export default htmlDocx;
}
