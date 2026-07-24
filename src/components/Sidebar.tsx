import React, { useEffect, useState } from "react";
import { useStore } from "../store/AppContext";
import type { ApiItem, Folder } from "../types";
import { ConfirmDialog, PromptModal } from "./ui";

function methodClass(m: string) {
  return "m m-" + m.toLowerCase();
}

function IconFolderPlus({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      <line x1="12" y1="11" x2="12" y2="17" />
      <line x1="9" y1="14" x2="15" y2="14" />
    </svg>
  );
}
function IconFilePlus({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="18" x2="12" y2="12" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </svg>
  );
}
function IconEdit({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}
function IconTrash({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
function IconArrowUp({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  );
}
function IconArrowDown({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  );
}
function IconCopy({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
function IconSearch({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
function IconDownload({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
function IconUpload({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

export function Sidebar({
  selectedFolderId,
  selectedApiId,
  onSelectFolder,
  onSelectApi,
  onCheckUpdate,
}: {
  selectedFolderId: string | null;
  selectedApiId: string | null;
  onSelectFolder: (id: string) => void;
  onSelectApi: (id: string) => void;
  onCheckUpdate: () => void;
}) {
  const { data, addFolder, renameFolder, removeFolder, addApi, saveApi, removeApi, dupApi, moveApi, importData, exportAll } =
    useStore();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [prompt, setPrompt] = useState<null | { kind: "folder" | "rename"; parentId?: string | null; id?: string; def?: string }>(null);
  const [confirm, setConfirm] = useState<null | { id: string; name: string }>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [ctxMenu, setCtxMenu] = useState<null | { x: number; y: number; id: string; name: string }>(null);

  useEffect(() => {
    if (selectedApiId) {
      const folderId = data.apis.find((a) => a.id === selectedApiId)?.folderId;
      if (folderId) setExpanded((s) => new Set(s).add(folderId));
    }
  }, [selectedApiId, data.apis]);

  const toggle = (id: string) =>
    setExpanded((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const rootFolders = data.folders
    .filter((f) => f.parentId === null)
    .sort((a, b) => a.order - b.order);

  const matchesSearch = (name: string) => {
    if (!search.trim()) return true;
    return name.toLowerCase().includes(search.trim().toLowerCase());
  };

  const renderFolder = (f: Folder, depth: number): React.ReactNode => {
    const isOpen = expanded.has(f.id) || (search.trim().length > 0);
    const childFolders = data.folders
      .filter((c) => c.parentId === f.id)
      .sort((a, b) => a.order - b.order);
    const childApis = data.apis
      .filter((a) => a.folderId === f.id)
      .sort((a, b) => a.order - b.order);
    const filteredApis = childApis.filter((a) => matchesSearch(a.name));
    const renderedChildren = childFolders
      .map((c) => renderFolder(c, depth + 1))
      .filter(Boolean);
    const folderMatches = matchesSearch(f.name);
    const hasVisibleChildren = renderedChildren.length > 0 || filteredApis.length > 0;
    if (!folderMatches && !hasVisibleChildren) return null;

    return (
      <div key={f.id}>
        <div
          className={"node-row" + (selectedFolderId === f.id && !selectedApiId ? " selected" : "")}
          style={{ paddingLeft: 6 + depth * 14 }}
          onClick={() => onSelectFolder(f.id)}
        >
          <span className="twist" onClick={(e) => { e.stopPropagation(); toggle(f.id); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.12s", opacity: hasVisibleChildren ? 1 : 0 }}>
              <polyline points="9 6 15 12 9 18" />
            </svg>
          </span>
          <span className="fname folder-name" onDoubleClick={(e) => { e.stopPropagation(); toggle(f.id); }}>{f.name}</span>
          <span className="row-acts" onClick={(e) => e.stopPropagation()}>
            <button className="icon-only" title="新建子分组" onClick={() => setPrompt({ kind: "folder", parentId: f.id })}><IconFolderPlus /></button>
            <button
              className="icon-only"
              title="新建接口"
              onClick={async () => {
                const a = await addApi(f.id, "未命名接口");
                if (a) {
                  setExpanded((s) => new Set(s).add(f.id));
                  onSelectApi(a.id);
                }
              }}
            >
              <IconFilePlus />
            </button>
            <button className="icon-only" title="重命名" onClick={() => setPrompt({ kind: "rename", id: f.id, def: f.name })}><IconEdit /></button>
            <button className="icon-only danger" title="删除分组" onClick={() => setConfirm({ id: f.id, name: f.name })}><IconTrash /></button>
          </span>
        </div>
        {isOpen && (
          <>
            {filteredApis.map((a) => (
              <ApiNode
                key={a.id}
                api={a}
                depth={depth + 1}
                selected={selectedApiId === a.id}
                renaming={renamingId === a.id}
                onSelect={() => onSelectApi(a.id)}
                onStartRename={() => setRenamingId(a.id)}
                onRename={async (name) => {
                  if (name && name !== a.name) {
                    await saveApi({ ...a, name });
                  }
                  setRenamingId(null);
                }}
                onContextMenu={(x, y) => setCtxMenu({ x, y, id: a.id, name: a.name })}
                onUp={() => moveApi(f.id, a.id, -1)}
                onDown={() => moveApi(f.id, a.id, 1)}
                onDup={() => dupApi(a.id)}
                onDelete={() => setConfirm({ id: a.id, name: a.name })}
              />
            ))}
            {renderedChildren}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="sidebar">
      <div className="sidebar-head">
        <h3>接口分组</h3>
        <div className="acts">
          <button className="btn sm primary" title="新建分组" onClick={() => setPrompt({ kind: "folder", parentId: null })}>
            <IconFolderPlus size={13} /> 新建
          </button>
        </div>
      </div>
      <div className="sidebar-search">
        <input
          placeholder="搜索接口 / 分组"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="tree">
        {rootFolders.length === 0 && data.apis.length === 0 ? (
          <div className="tree-empty">暂无分组<br />点击右上角「新建」开始</div>
        ) : (
          rootFolders.map((f) => renderFolder(f, 0)).filter(Boolean)
        )}
      </div>

      {ctxMenu && (
        <>
          <div className="ctx-backdrop" onClick={() => setCtxMenu(null)} />
          <div className="ctx-menu" style={{ left: ctxMenu.x, top: ctxMenu.y }}>
            <button
              onClick={() => {
                setRenamingId(ctxMenu.id);
                setCtxMenu(null);
              }}
            >
              重命名
            </button>
            <button
              className="danger"
              onClick={() => {
                setConfirm({ id: ctxMenu.id, name: ctxMenu.name });
                setCtxMenu(null);
              }}
            >
              删除
            </button>
          </div>
        </>
      )}

      <div className="sidebar-foot">
        <div className="io-row">
          <button className="btn primary" title="从文件导入并合并到现有数据" onClick={() => importData(false)}>
            <IconUpload size={13} /> 导入
          </button>
          <button className="btn" title="导出全部数据备份" onClick={() => exportAll()}>
            <IconDownload size={13} /> 导出
          </button>
        </div>
        <div className="ver-row">
          <span>当前版本 v{data.version || "2.0.0"}</span>
          <a onClick={onCheckUpdate}>发现新版本</a>
        </div>
      </div>

      {prompt && (
        prompt.kind === "folder" ? (
          <PromptModal
            title="新建分组"
            label="分组名称"
            defaultValue="新建分组"
            onOk={(name) => {
              addFolder(name, prompt.parentId ?? null).then(() => {
                if (prompt.parentId) setExpanded((s) => new Set(s).add(prompt.parentId!));
              });
              setPrompt(null);
            }}
            onCancel={() => setPrompt(null)}
          />
        ) : (
          <PromptModal
            title="重命名"
            label="名称"
            defaultValue={prompt.def}
            onOk={(name) => { renameFolder(prompt.id!, name); setPrompt(null); }}
            onCancel={() => setPrompt(null)}
          />
        )
      )}

      {confirm && (
        <ConfirmDialog
          title="确认删除"
          danger
          message={
            <>
              确定要删除 <b>{confirm.name}</b> 吗？
              <br />
              若该分组包含子分组或接口，将一并删除且不可恢复。
            </>
          }
          onConfirm={() => {
            if (data.folders.some((f) => f.id === confirm.id)) removeFolder(confirm.id);
            else removeApi(confirm.id);
            setConfirm(null);
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

function ApiNode({
  api,
  depth,
  selected,
  renaming,
  onSelect,
  onStartRename,
  onRename,
  onContextMenu,
  onUp,
  onDown,
  onDup,
  onDelete,
}: {
  api: ApiItem;
  depth: number;
  selected: boolean;
  renaming: boolean;
  onSelect: () => void;
  onStartRename: () => void;
  onRename: (name: string) => void;
  onContextMenu: (x: number, y: number) => void;
  onUp: () => void;
  onDown: () => void;
  onDup: () => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState(api.name);
  useEffect(() => setDraft(api.name), [api.name]);

  const commit = () => {
    const name = draft.trim();
    if (name) onRename(name);
    else setDraft(api.name);
  };

  if (renaming) {
    return (
      <div
        className={"node-row api-node" + (selected ? " selected" : "")}
        style={{ paddingLeft: 6 + depth * 14 + 18 }}
      >
        <span className={methodClass(api.method)}>{api.method}</span>
        <input
          className="api-rename-input"
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(api.name);
              onRename(api.name);
            }
          }}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    );
  }

  return (
    <div>
      <div
        className={"node-row api-node" + (selected ? " selected" : "")}
        style={{ paddingLeft: 6 + depth * 14 + 18 }}
        onClick={onSelect}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onStartRename();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu(e.clientX, e.clientY);
        }}
        title="双击或右键菜单重命名"
      >
        <span className={methodClass(api.method)}>{api.method}</span>
        <span className="fname">{api.name}</span>
        <span className="row-acts api-acts" onClick={(e) => e.stopPropagation()}>
          <button className="icon-only" title="上移" onClick={onUp}><IconArrowUp /></button>
          <button className="icon-only" title="下移" onClick={onDown}><IconArrowDown /></button>
          <button className="icon-only" title="复制" onClick={onDup}><IconCopy /></button>
          <button className="icon-only" title="重命名" onClick={onStartRename}><IconEdit size={13} /></button>
          <button className="icon-only danger" title="删除" onClick={onDelete}><IconTrash size={13} /></button>
        </span>
      </div>
    </div>
  );
}
