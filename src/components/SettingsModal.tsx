import React, { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { tempDir, join } from "@tauri-apps/api/path";
import { api } from "../lib/api";
import type { UpdateInfo } from "../types";
import { Modal } from "./ui";
import { useStore } from "../store/AppContext";

const REPO = "duhuilai/duapi";

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const { version, notify } = useStore();
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [percent, setPercent] = useState(0);
  const [target, setTarget] = useState<string | null>(null);
  const [installing, setInstalling] = useState(false);
  const unlistenRef = useRef<(() => void) | null>(null);

  const check = async () => {
    setChecking(true);
    try {
      const r = await api.checkUpdate(REPO);
      setInfo(r);
      if (r.error) notify("检查更新失败：" + r.error, "error");
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      const un = await listen<{ received: number; total: number; percent: number }>(
        "download-progress",
        (e) => {
          if (active) setPercent(e.payload.percent);
        }
      );
      unlistenRef.current = un;
      check();
    })();
    return () => {
      active = false;
      unlistenRef.current?.();
    };
  }, []);

  const download = async () => {
    if (!info?.downloadUrl) return;
    const dir = await tempDir();
    const path = await join(dir, "duapi-setup.exe");
    setTarget(path);
    setDownloading(true);
    setPercent(0);
    try {
      await api.downloadUpdate(info.downloadUrl, path);
      notify("下载完成，可点击安装", "success");
    } catch (e) {
      notify("下载失败：" + String(e), "error");
      setDownloading(false);
    } finally {
      setDownloading(false);
    }
  };

  const install = async () => {
    if (!target) return;
    setInstalling(true);
    try {
      await api.installUpdate(target);
      // Process exits in the Rust side; this line normally not reached.
    } catch (e) {
      notify("安装失败：" + String(e), "error");
      setInstalling(false);
    }
  };

  return (
    <Modal title="关于 / 检查更新" onClose={onClose}>
      <div className="update-box">
        <div className="row">
          <span>当前版本</span>
          <b>v{version}</b>
        </div>
        <div className="row">
          <span>最新版本</span>
          <b>{info ? (info.latest ? "v" + info.latest : "—") : "检查中…"}</b>
        </div>

        {info?.error && (
          <div className="note-box" style={{ color: "var(--delete)" }}>{info.error}</div>
        )}

        {info && !info.error && info.hasUpdate && (
          <>
            <div className="row" style={{ alignItems: "flex-start" }}>
              <span>更新说明</span>
              <div className="note-box" style={{ flex: 1 }}>{info.notes || "（无说明）"}</div>
            </div>
            {!target && (
              <button className="btn primary" disabled={downloading} onClick={download}>
                {downloading ? `下载中… ${percent}%` : "⬇ 下载新版本"}
              </button>
            )}
            {downloading && (
              <div className="progress">
                <div className="bar" style={{ width: percent + "%" }} />
              </div>
            )}
            {target && !downloading && (
              <button className="btn primary" disabled={installing} onClick={install}>
                安装并更新
              </button>
            )}
          </>
        )}

        {info && !info.error && !info.hasUpdate && (
          <div className="note-box" style={{ color: "var(--primary)" }}>
            当前已是最新版本
          </div>
        )}

        <div style={{ marginTop: 14, textAlign: "right" }}>
          <button className="btn ghost" disabled={checking} onClick={check}>
            {checking ? "检查中…" : "重新检查"}
          </button>
        </div>
        <div style={{ marginTop: 10, color: "var(--muted)", fontSize: 11 }}>
          更新源：GitHub Releases（{REPO}）
        </div>
      </div>
    </Modal>
  );
}
