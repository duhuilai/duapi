import React, { useState } from "react";
import type { ApiItem, KeyValue, ResponseData } from "../types";
import { ParamsDocs } from "./ParamsDocs";

function pretty(body: string): string {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}

function IconCopy({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function ResponsePanel({
  response,
  sending,
  api,
  onChange,
  notify,
}: {
  response: ResponseData | null;
  sending?: boolean;
  api?: ApiItem | null;
  onChange?: (patch: Partial<ApiItem>) => void;
  notify?: (msg: string, kind?: "info" | "success" | "error") => void;
}) {
  const [tab, setTab] = useState<"body" | "headers" | "cookie">("body");
  const [copied, setCopied] = useState(false);

  const doCopy = async () => {
    if (!response?.body) return;
    try {
      await navigator.clipboard.writeText(response.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };

  const cookies = response?.headers.filter((h) => h.key.toLowerCase() === "set-cookie") ?? [];

  return (
    <div className="resp-panel">
      <div className="resp-title">响应结果</div>

      {!response ? (
        <div className="resp-empty">
          {sending ? "请求发送中，请稍候…" : "发送请求后，响应结果将显示在这里。"}
        </div>
      ) : (
        <div className="resp-split">
          <div className="resp-upper">
            <div className="resp-head">
              {response.error ? (
                <span className="status-pill status-5">错误</span>
              ) : (
                <span className={"status-pill status-" + String(response.status).charAt(0)}>
                  {response.status} {response.statusText}
                </span>
              )}
              <span className="resp-meta">耗时 {response.timeMs} ms</span>
              <span className="resp-meta">大小 {formatBytes(response.sizeBytes)}</span>
              <span className="resp-meta">类型 {response.contentType || "—"}</span>
              {response.error && (
                <span className="resp-meta" style={{ color: "var(--delete)" }}>
                  {response.error}
                </span>
              )}
            </div>
            <div className="resp-tabs">
              <button className={tab === "body" ? "active" : ""} onClick={() => setTab("body")}>
                Body
              </button>
              <button className={tab === "headers" ? "active" : ""} onClick={() => setTab("headers")}>
                响应头 ({response.headers.length})
              </button>
              <button className={tab === "cookie" ? "active" : ""} onClick={() => setTab("cookie")}>
                Cookie ({cookies.length})
              </button>
            </div>
            <div className="resp-body">
              {tab === "body" ? (
                <>
                  <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px 14px 0" }}>
                    <button className="btn sm" onClick={doCopy} disabled={!response.body}>
                      <IconCopy size={13} /> {copied ? "已复制" : "复制"}
                    </button>
                  </div>
                  <pre className="code-block" style={{ margin: "8px 14px 14px" }}>
                    {response.error ? response.error : pretty(response.body)}
                  </pre>
                </>
              ) : tab === "headers" ? (
                <table className="htable" style={{ margin: 14 }}>
                  <thead>
                    <tr>
                      <th>Header</th>
                      <th>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {response.headers.map((h, i) => (
                      <tr key={i}>
                        <td className="mono">{h.key}</td>
                        <td className="mono">{h.value}</td>
                      </tr>
                    ))}
                    {response.headers.length === 0 && (
                      <tr>
                        <td colSpan={2} style={{ color: "var(--muted)" }}>
                          无响应头
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="htable" style={{ margin: 14 }}>
                  <thead>
                    <tr>
                      <th>Set-Cookie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cookies.map((h, i) => (
                      <tr key={i}>
                        <td className="mono">{h.value}</td>
                      </tr>
                    ))}
                    {cookies.length === 0 && (
                      <tr>
                        <td style={{ color: "var(--muted)" }}>无 Cookie</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
            <div className="resp-foot">
              <span>{response.error ? "请求失败" : response.ok ? "请求成功" : "请求异常"}</span>
              <span>·</span>
              <span>耗时 {response.timeMs} ms</span>
              <span>·</span>
              <span>返回 {formatBytes(response.sizeBytes)}</span>
              <span>·</span>
              <span>编码 {charsetOf(response.contentType)}</span>
              {serverOf(response.headers) && (
                <>
                  <span>·</span>
                  <span>服务器 {serverOf(response.headers)}</span>
                </>
              )}
            </div>
          </div>

          {/* 响应参数说明：响应结果下半部分 */}
          <div className="docs-pane">
            {api && onChange ? (
              <ParamsDocs
                title="响应参数说明"
                docs={api.responseDocs}
                sample={response?.body ?? ""}
                rootPath=""
                onChange={(responseDocs) => onChange({ responseDocs })}
                notify={notify}
                showGenerate={false}
                showSampleColumn={false}
              />
            ) : (
              <div style={{ padding: 14, color: "var(--muted)", fontSize: 12 }}>
                请选择接口以编辑响应参数说明。
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
  return (n / 1024 / 1024).toFixed(1) + " MB";
}

function charsetOf(ct: string): string {
  const m = ct.match(/charset=([\w-]+)/i);
  return m ? m[1].toUpperCase() : "UTF-8";
}

function serverOf(headers: KeyValue[]): string | null {
  const h = headers.find((h) => h.key.toLowerCase() === "server");
  return h?.value || null;
}
