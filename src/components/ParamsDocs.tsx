import React, { useState } from "react";
import { api } from "../lib/api";
import type { ParamDoc } from "../types";
import { newId } from "../types";

function depthOf(path: string): number {
  const parts = path.split(".").filter((p) => p.length > 0);
  return Math.max(0, parts.length - 1);
}

export function ParamsDocs({
  title,
  docs,
  sample,
  rootPath = "",
  onChange,
  notify,
  showGenerate = true,
  showSampleColumn = true,
}: {
  title: string;
  docs: ParamDoc[];
  sample: string;
  rootPath?: string;
  onChange: (docs: ParamDoc[]) => void;
  notify?: (msg: string, kind?: "info" | "success" | "error") => void;
  showGenerate?: boolean;
  showSampleColumn?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const update = (id: string, patch: Partial<ParamDoc>) =>
    onChange(docs.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  const remove = (id: string) => onChange(docs.filter((d) => d.id !== id));

  const move = (id: string, dir: -1 | 1) => {
    const idx = docs.findIndex((d) => d.id === id);
    if (idx < 0) return;
    const next = idx + dir;
    if (next < 0 || next >= docs.length) return;
    const arr = [...docs];
    [arr[idx], arr[next]] = [arr[next], arr[idx]];
    onChange(arr);
  };

  const insertAfter = (id: string) => {
    const idx = docs.findIndex((d) => d.id === id);
    if (idx < 0) return;
    const d: ParamDoc = {
      id: newId(),
      path: "",
      typeName: "string",
      required: false,
      description: "",
      sample: "",
      depth: 0,
    };
    const arr = [...docs];
    arr.splice(idx + 1, 0, d);
    onChange(arr);
  };

  const addManual = () => {
    const d: ParamDoc = {
      id: newId(),
      path: "",
      typeName: "string",
      required: false,
      description: "",
      sample: "",
      depth: 0,
    };
    onChange([...docs, d]);
  };

  const generate = async () => {
    const src = sample.trim();
    if (!src) {
      setError("");
      notify?.("暂无可用示例 JSON（请求体/响应体为空），请先发送请求或填写请求体", "info");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const generated = await api.generateParamDocs(src, rootPath);
      if (generated.length === 0) {
        notify?.("未能从 JSON 解析出字段，请检查 JSON 格式", "info");
        return;
      }
      // Merge: keep existing descriptions/required/sample by path; add new entries.
      const existingById = new Map(docs.map((d) => [d.path, d]));
      const merged: ParamDoc[] = [];
      const seen = new Set<string>();
      for (const g of generated) {
        seen.add(g.path);
        const ex = existingById.get(g.path);
        merged.push({
          ...g,
          description: ex ? ex.description : "",
          required: ex ? ex.required : false,
          sample: ex && ex.sample ? ex.sample : g.sample,
        });
      }
      for (const d of docs) {
        if (!seen.has(d.path)) merged.push(d); // keep manually-added
      }
      onChange(merged);
      notify?.(`已根据 JSON 生成 ${generated.length} 个参数说明`, "success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      notify?.(`生成失败：${msg}`, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pd-wrap">
      <div className="pd-head">
        <div className="pd-title-row">
          <label>{title}</label>
          {!showGenerate && (
            <button className="btn sm" onClick={addManual} disabled={busy}>
              手动新增
            </button>
          )}
        </div>
        {showGenerate && (
          <div className="pd-toolbar">
            <span className="pd-hint">根据请求体/响应体示例自动生成参数说明</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn sm primary" disabled={busy || !sample.trim()} onClick={generate}>
                {busy ? "生成中…" : "从 JSON 生成"}
              </button>
              <button className="btn sm" onClick={addManual} disabled={busy}>
                手动新增
              </button>
            </div>
          </div>
        )}
        {error && <div className="pd-error">⚠ {error}</div>}
      </div>

      <div className="pd-body">
        {docs.length > 0 ? (
          <table className="pd-table">
            <thead>
              <tr>
                <th style={{ width: showSampleColumn ? "26%" : "30%" }}>参数路径</th>
                <th style={{ width: "14%" }}>类型</th>
                <th style={{ width: "8%" }}>必填</th>
                <th style={{ width: showSampleColumn ? "34%" : "46%" }}>说明</th>
                {showSampleColumn && <th style={{ width: "14%" }}>示例</th>}
                <th style={{ width: 92, whiteSpace: "nowrap" }}></th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d, i) => (
                <tr key={d.id}>
                  <td>
                    <input
                      value={d.path}
                      onChange={(e) =>
                        update(d.id, { path: e.target.value, depth: depthOf(e.target.value) })
                      }
                    />
                  </td>
                  <td>
                    <input
                      value={d.typeName}
                      onChange={(e) => update(d.id, { typeName: e.target.value })}
                    />
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={d.required}
                      onChange={(e) => update(d.id, { required: e.target.checked })}
                    />
                  </td>
                  <td>
                    <input
                      value={d.description}
                      placeholder="参数说明"
                      onChange={(e) => update(d.id, { description: e.target.value })}
                    />
                  </td>
                  {showSampleColumn && (
                    <td>
                      <input
                        value={d.sample}
                        placeholder="示例值"
                        onChange={(e) => update(d.id, { sample: e.target.value })}
                      />
                    </td>
                  )}
                  <td>
                    <div className="pd-actions">
                      <button className="btn sm" disabled={i === 0} onClick={() => move(d.id, -1)} title="上移">
                        ↑
                      </button>
                      <button className="btn sm" disabled={i === docs.length - 1} onClick={() => move(d.id, 1)} title="下移">
                        ↓
                      </button>
                      <button className="btn sm" onClick={() => insertAfter(d.id)} title="插入参数">
                        +
                      </button>
                      <button className="btn sm danger" onClick={() => remove(d.id)} title="删除">
                        ×
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="pd-empty">
            {showGenerate
              ? "尚未生成参数说明。点击「从 JSON 生成」从请求体/响应体示例提取，或点击「手动新增」。"
              : "尚未添加参数说明。点击「手动新增」开始填写。"}
          </div>
        )}
      </div>
    </div>
  );
}
