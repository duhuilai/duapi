import React, { useEffect, useRef, useState } from "react";
import { useStore } from "./store/AppContext";
import { Sidebar } from "./components/Sidebar";
import { RequestPanel } from "./components/RequestPanel";
import { ResponsePanel } from "./components/ResponsePanel";
import { DocManager } from "./components/DocManager";
import { SettingsModal } from "./components/SettingsModal";
import { Toasts } from "./components/ui";
import { api } from "./lib/api";
import type { ApiItem, ResponseData, SavedResponse } from "./types";

function IconArrowUp({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
    </svg>
  );
}
function IconArrowDown({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><polyline points="5 12 12 19 19 12" />
    </svg>
  );
}
function IconCopy({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
function IconTrash({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

export default function App() {
  const { data, saveApi, addApi, dupApi, removeApi, moveApi, addDoc, notify } =
    useStore();

  const [view, setView] = useState<"api" | "doc">("api");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedApiId, setSelectedApiId] = useState<string | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [editingApi, setEditingApi] = useState<ApiItem | null>(null);
  const [response, setResponse] = useState<ResponseData | null>(null);
  const [sending, setSending] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [genSignal, setGenSignal] = useState(0);
  const [respWidth, setRespWidth] = useState(380);
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const splitRef = useRef<HTMLDivElement>(null);

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = respWidth;
    const onMove = (ev: MouseEvent) => {
      const container = splitRef.current;
      if (!container) return;
      const total = container.getBoundingClientRect().width;
      let next = startW + (startX - ev.clientX);
      next = Math.max(300, Math.min(total - 440, next));
      setRespWidth(next);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  // Sync the working copy when the selected API changes.
  useEffect(() => {
    if (selectedApiId) {
      const a = data.apis.find((x) => x.id === selectedApiId);
      setEditingApi(a ? { ...a } : null);
      setResponse(null);
    } else {
      setEditingApi(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedApiId]);

  const onSelectFolder = (id: string) => {
    setSelectedFolderId(id);
    setSelectedApiId(null);
    setResponse(null);
  };
  const onSelectApi = (id: string) => {
    setSelectedApiId(id);
    setSelectedFolderId(data.apis.find((a) => a.id === id)?.folderId ?? selectedFolderId);
    setView("api");
    setOpenTabs((tabs) => (tabs.includes(id) ? tabs : [...tabs, id]));
  };
  const closeApiTab = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setOpenTabs((tabs) => {
      const idx = tabs.indexOf(id);
      if (idx === -1) return tabs;
      const next = tabs.filter((t) => t !== id);
      if (selectedApiId === id) {
        const nextId = next[idx - 1] ?? next[idx] ?? null;
        setSelectedApiId(nextId);
        if (!nextId) setResponse(null);
      }
      return next;
    });
  };

  useEffect(() => {
    setOpenTabs((tabs) => tabs.filter((id) => data.apis.some((a) => a.id === id)));
  }, [data.apis]);
  const onSelectDoc = (id: string) => {
    setSelectedDocId(id);
    setView("doc");
  };

  const patchApi = (patch: Partial<ApiItem>) =>
    setEditingApi((prev) => (prev ? { ...prev, ...patch } : prev));

  const onSend = async () => {
    if (!editingApi) return;
    setSending(true);
    const resp = await api.sendRequest(editingApi);
    setResponse(resp);
    const saved: SavedResponse = {
      status: resp.status,
      statusText: resp.statusText,
      headers: resp.headers,
      body: resp.body,
      timeMs: resp.timeMs,
      sizeBytes: resp.sizeBytes,
      contentType: resp.contentType,
      savedAt: new Date().toISOString(),
    };
    setEditingApi((prev) => (prev ? { ...prev, lastResponse: saved } : prev));
    setSending(false);
    if (resp.error) notify("请求出错：" + resp.error, "error");
    else notify(`响应 ${resp.status} · ${resp.timeMs} ms`, "success");
  };

  const onSave = async () => {
    if (editingApi) await saveApi(editingApi);
  };

  const folderApis = (fid: string) =>
    data.apis.filter((a) => a.folderId === fid).sort((a, b) => a.order - b.order);

  const quickGenerate = async (fid: string) => {
    const ids = folderApis(fid).map((a) => a.id);
    const name = data.folders.find((f) => f.id === fid)?.name ?? "接口文档";
    if (ids.length === 0) {
      notify("该分组下没有接口", "info");
      return;
    }
    const doc = await addDoc(fid, name, ids);
    if (doc) onSelectDoc(doc.id);
  };

  return (
    <div className="app">
      <div className="topbar">
        <div className="logo">
          <img className="logo-img" src="/logo.png" alt="duapi" />
          <span>duapi</span>
          <span className="ver-badge">v{data.version || "2.0.0"}</span>
        </div>
        <div className="spacer" />
        <nav>
          <button className={view === "api" ? "active" : ""} onClick={() => setView("api")}>
            工作台
          </button>
          <button className={view === "doc" ? "active" : ""} onClick={() => setView("doc")}>
            接口文档
          </button>
        </nav>
      </div>

      <div className="body">
        {view === "api" && (
          <Sidebar
            selectedFolderId={selectedFolderId}
            selectedApiId={selectedApiId}
            onSelectFolder={onSelectFolder}
            onSelectApi={onSelectApi}
            onCheckUpdate={() => setSettingsOpen(true)}
          />
        )}

        <div className="main">
          {view === "api" ? (
            selectedApiId && editingApi ? (
              <div className="debug-split" ref={splitRef}>
                <div className="debug-left">
                  <ApiTabs
                    tabs={openTabs}
                    activeId={selectedApiId}
                    apis={data.apis}
                    onSelect={onSelectApi}
                    onClose={closeApiTab}
                    onAdd={async () => {
                      const folderId = selectedFolderId ?? data.folders[0]?.id;
                      if (folderId) {
                        const a = await addApi(folderId, "未命名接口");
                        if (a) onSelectApi(a.id);
                      }
                    }}
                  />
                  <RequestPanel
                    api={editingApi}
                    onChange={patchApi}
                    onSend={onSend}
                    onSave={onSave}
                    sending={sending}
                    notify={notify}
                  />
                </div>
                <div className="debug-resizer" onMouseDown={startResize} title="拖拽调整宽度" />
                <div className="debug-right" style={{ width: respWidth }}>
                  <ResponsePanel
                    response={response}
                    sending={sending}
                    api={editingApi}
                    onChange={patchApi}
                    notify={notify}
                  />
                </div>
              </div>
            ) : selectedFolderId ? (
              <FolderView
                folderId={selectedFolderId}
                apis={folderApis(selectedFolderId)}
                onOpenApi={onSelectApi}
                onAddApi={async () => {
                  const a = await addApi(selectedFolderId, "未命名接口");
                  if (a) onSelectApi(a.id);
                }}
                onGenerate={() => quickGenerate(selectedFolderId)}
                onMove={moveApi}
                onDup={dupApi}
                onDelete={removeApi}
              />
            ) : (
              <div className="main-empty">
                <div className="empty-logo">duapi</div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>接口调试工作台</div>
                <div>从左侧选择分组或接口开始，所有数据完全离线保存在本地</div>
              </div>
            )
          ) : (
            <DocManager
              selectedDocId={selectedDocId}
              onSelectDoc={onSelectDoc}
              onCloseDoc={() => setSelectedDocId(null)}
              generateSignal={genSignal}
            />
          )}
        </div>
      </div>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      <Toasts />
    </div>
  );
}

function ApiTabs({
  tabs,
  activeId,
  apis,
  onSelect,
  onClose,
  onAdd,
}: {
  tabs: string[];
  activeId: string | null;
  apis: ApiItem[];
  onSelect: (id: string) => void;
  onClose: (id: string, e?: React.MouseEvent) => void;
  onAdd: () => void;
}) {
  return (
    <div className="api-tabs">
      {tabs.map((id) => {
        const a = apis.find((x) => x.id === id);
        if (!a) return null;
        const active = activeId === id;
        return (
          <div
            key={id}
            className={"api-tab" + (active ? " active" : "")}
            onClick={() => onSelect(id)}
          >
            <span className={"m-tag m-" + a.method.toLowerCase()}>{a.method}</span>
            <span className="t">{a.name}</span>
            <button
              className="x"
              title="关闭标签"
              onClick={(e) => onClose(id, e)}
            >
              ×
            </button>
          </div>
        );
      })}
      <button
        className="api-tab add"
        title="新建接口"
        onClick={onAdd}
      >
        +
      </button>
    </div>
  );
}

function FolderView({
  folderId,
  apis,
  onOpenApi,
  onAddApi,
  onGenerate,
  onMove,
  onDup,
  onDelete,
}: {
  folderId: string;
  apis: ApiItem[];
  onOpenApi: (id: string) => void;
  onAddApi: () => void;
  onGenerate: () => void;
  onMove: (folderId: string, id: string, dir: -1 | 1) => void;
  onDup: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="panel-scroll">
      <div className="page-head">
        <div>
          <h2 className="page-title">分组接口</h2>
          <div className="page-sub">共 {apis.length} 个接口 · 点击行进入调试，可调整排序</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn primary sm" onClick={onAddApi}>新建接口</button>
          <button className="btn sm" onClick={onGenerate}>生成文档</button>
        </div>
      </div>
      {apis.length === 0 && (
        <div className="empty-hint">该分组下暂无接口，点击「新建接口」开始。</div>
      )}
      {apis.length > 0 && (
      <table className="htable data-table">
        <thead>
          <tr>
            <th style={{ width: 90 }}>方法</th>
            <th>名称</th>
            <th>地址</th>
            <th style={{ width: 130 }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {apis.map((a) => (
            <tr key={a.id} style={{ cursor: "pointer" }} onClick={() => onOpenApi(a.id)}>
              <td>
                <span className={"m-tag m-" + a.method.toLowerCase()}>{a.method}</span>
              </td>
              <td>{a.name}</td>
              <td className="mono" style={{ fontSize: 12, color: "var(--text-soft)" }}>{a.url || "—"}</td>
              <td onClick={(e) => e.stopPropagation()}>
                <div className="table-acts">
                  <button className="icon-only" title="上移" onClick={() => onMove(folderId, a.id, -1)}><IconArrowUp /></button>
                  <button className="icon-only" title="下移" onClick={() => onMove(folderId, a.id, 1)}><IconArrowDown /></button>
                  <button className="icon-only" title="复制" onClick={() => onDup(a.id)}><IconCopy /></button>
                  <button className="icon-only danger" title="删除" onClick={() => onDelete(a.id)}><IconTrash /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      )}
    </div>
  );
}
