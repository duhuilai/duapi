import React, { useEffect, useState } from "react";
import type { ApiItem } from "../types";
import { METHODS, PROTOCOLS, BODY_TYPES } from "../types";
import { KeyValueEditor } from "./KeyValueEditor";
import { ParamsDocs } from "./ParamsDocs";

type Tab = "params" | "headers" | "body" | "auth";

export function RequestPanel({
  api,
  onChange,
  onSend,
  onSave,
  sending,
  notify,
}: {
  api: ApiItem;
  onChange: (patch: Partial<ApiItem>) => void;
  onSend: () => void;
  onSave: () => void;
  sending: boolean;
  notify?: (msg: string, kind?: "info" | "success" | "error") => void;
}) {
  const [tab, setTab] = useState<Tab>("params");

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}>
      <div className="reqbar">
        <select
          className={"method-select m-" + api.method.toLowerCase()}
          value={api.method}
          onChange={(e) => onChange({ method: e.target.value })}
        >
          {METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select
          className="method-select"
          style={{ width: 82 }}
          value={api.protocol}
          onChange={(e) => onChange({ protocol: e.target.value })}
          title="协议"
        >
          {PROTOCOLS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <input
          className="url-input"
          placeholder="https://api.example.com/path"
          value={api.url}
          onChange={(e) => onChange({ url: e.target.value })}
        />
        <button className="btn primary" onClick={onSend} disabled={sending}>
          {sending ? "发送中…" : "→ 发送"}
        </button>
        <button className="btn" onClick={onSave}>
          保存
        </button>
      </div>

      <div className="api-desc-bar">
        <input
          className="input"
          placeholder="接口说明：填写接口用途、注意事项等"
          value={api.description || ""}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </div>

      <div className="tabs">
        {(["params", "headers", "body", "auth"] as Tab[]).map((t) => (
          <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
            {LABELS[t]}
          </button>
        ))}
      </div>

      <div className="panel-scroll">
        {tab === "params" && (
          <KeyValueEditor
            title="Query 参数"
            items={api.query}
            onChange={(query) => onChange({ query })}
          />
        )}

        {tab === "headers" && (
          <KeyValueEditor
            title="请求头"
            items={api.headers}
            onChange={(headers) => onChange({ headers })}
          />
        )}

        {tab === "body" && (
          <div className="field">
            <div className="body-type-tabs">
              {BODY_TYPES.map((b) => (
                <button
                  key={b}
                  className={api.bodyType === b ? "active" : ""}
                  onClick={() => onChange({ bodyType: b })}
                  disabled={api.protocol === "graphql"}
                >
                  {BODY_LABELS[b]}
                </button>
              ))}
            </div>
            {api.protocol === "graphql" && (
              <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 6 }}>
                GraphQL 模式将以 POST 发送，请求体为 {"{ query: <下方内容> }"}。
              </div>
            )}
            <label style={{ marginTop: 12 }}>请求体内容</label>
            <textarea
              className="input mono"
              style={{ minHeight: 260 }}
              value={api.bodyRaw}
              placeholder='{\n  "key": "value"\n}'
              onChange={(e) => onChange({ bodyRaw: e.target.value })}
            />
          </div>
        )}

        {tab === "auth" && (
          <div className="field">
            <label>认证方式</label>
            <select
              className="input"
              value={api.auth.authType}
              onChange={(e) =>
                onChange({ auth: { ...api.auth, authType: e.target.value } })
              }
            >
              <option value="none">无</option>
              <option value="bearer">Bearer Token</option>
              <option value="basic">Basic Auth</option>
              <option value="apikey">API Key</option>
            </select>

            {api.auth.authType === "bearer" && (
              <div className="field" style={{ marginTop: 12 }}>
                <label>Token</label>
                <input
                  className="input"
                  value={api.auth.token}
                  onChange={(e) => onChange({ auth: { ...api.auth, token: e.target.value } })}
                />
              </div>
            )}
            {api.auth.authType === "basic" && (
              <div className="row2" style={{ marginTop: 12 }}>
                <div>
                  <label>用户名</label>
                  <input
                    className="input"
                    value={api.auth.username}
                    onChange={(e) => onChange({ auth: { ...api.auth, username: e.target.value } })}
                  />
                </div>
                <div>
                  <label>密码</label>
                  <input
                    className="input"
                    type="password"
                    value={api.auth.password}
                    onChange={(e) => onChange({ auth: { ...api.auth, password: e.target.value } })}
                  />
                </div>
              </div>
            )}
            {api.auth.authType === "apikey" && (
              <div className="row2" style={{ marginTop: 12 }}>
                <div>
                  <label>Key 名称</label>
                  <input
                    className="input"
                    value={api.auth.key}
                    onChange={(e) => onChange({ auth: { ...api.auth, key: e.target.value } })}
                  />
                </div>
                <div>
                  <label>Value</label>
                  <input
                    className="input"
                    value={api.auth.value}
                    onChange={(e) => onChange({ auth: { ...api.auth, value: e.target.value } })}
                  />
                </div>
                <div>
                  <label>位置</label>
                  <select
                    className="input"
                    value={api.auth.addTo}
                    onChange={(e) => onChange({ auth: { ...api.auth, addTo: e.target.value } })}
                  >
                    <option value="header">Header</option>
                    <option value="query">Query</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 请求参数说明：放在接口下半部分 */}
      <div className="docs-pane">
        <ParamsDocs
          title="请求参数说明"
          docs={api.requestDocs}
          sample={api.bodyType === "json" || api.bodyType === "graphql" ? api.bodyRaw : ""}
          onChange={(requestDocs) => onChange({ requestDocs })}
          notify={notify}
        />
      </div>
    </div>
  );
}

const LABELS: Record<Tab, string> = {
  params: "Query参数",
  headers: "请求头",
  body: "Body",
  auth: "认证",
};

const BODY_LABELS: Record<string, string> = {
  none: "无",
  json: "JSON",
  form_data: "Form Data",
  form_urlencoded: "Form URL",
  raw: "Raw",
  graphql: "GraphQL",
};
