import React from "react";
import type { KeyValue } from "../types";
import { newId } from "../types";

export function KeyValueEditor({
  title,
  items,
  onChange,
  keyPlaceholder = "Key",
  valuePlaceholder = "Value",
}: {
  title: string;
  items: KeyValue[];
  onChange: (items: KeyValue[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}) {
  const update = (id: string, patch: Partial<KeyValue>) =>
    onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const add = () =>
    onChange([...items, { id: newId(), key: "", value: "", enabled: true }]);
  const remove = (id: string) => onChange(items.filter((it) => it.id !== id));

  return (
    <div className="field">
      <label>{title}</label>
      <table className="kv-table">
        <thead>
          <tr>
            <th className="cb"></th>
            <th>{keyPlaceholder}</th>
            <th>{valuePlaceholder}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id}>
              <td className="cb">
                <input
                  type="checkbox"
                  checked={it.enabled}
                  onChange={(e) => update(it.id, { enabled: e.target.checked })}
                />
              </td>
              <td>
                <input
                  value={it.key}
                  placeholder={keyPlaceholder}
                  onChange={(e) => update(it.id, { key: e.target.value })}
                />
              </td>
              <td>
                <input
                  value={it.value}
                  placeholder={valuePlaceholder}
                  onChange={(e) => update(it.id, { value: e.target.value })}
                />
              </td>
              <td>
                <button className="btn sm danger" onClick={() => remove(it.id)}>
                  删除
                </button>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={4} style={{ color: "var(--muted)", padding: "8px" }}>
                暂无内容
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="kv-actions">
        <button className="btn sm" onClick={add}>
          添加一行
        </button>
      </div>
    </div>
  );
}
