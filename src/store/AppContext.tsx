import React, { createContext, useContext, useEffect, useState } from "react";
import { save, open } from "@tauri-apps/plugin-dialog";
import { api } from "../lib/api";
import type { ApiItem, AppData, Folder, DocItem } from "../types";

export type ToastKind = "info" | "success" | "error";
export interface Toast {
  id: number;
  msg: string;
  kind: ToastKind;
}

interface StoreValue {
  data: AppData;
  loading: boolean;
  refresh: () => Promise<void>;
  notify: (msg: string, kind?: ToastKind) => void;
  toasts: Toast[];

  addFolder: (name: string, parentId: string | null) => Promise<void>;
  renameFolder: (id: string, name: string) => Promise<void>;
  removeFolder: (id: string) => Promise<void>;

  addApi: (folderId: string, name: string) => Promise<ApiItem | undefined>;
  saveApi: (item: ApiItem) => Promise<void>;
  removeApi: (id: string) => Promise<void>;
  dupApi: (id: string) => Promise<void>;
  moveApi: (folderId: string, id: string, dir: -1 | 1) => Promise<void>;

  addDoc: (folderId: string, title: string, apiIds: string[]) => Promise<DocItem | undefined>;
  saveDoc: (id: string, title: string, content: string) => Promise<void>;
  renameDoc: (id: string, title: string) => Promise<void>;
  removeDoc: (id: string) => Promise<void>;

  exportAll: () => Promise<void>;
  exportSelection: (apiIds: string[], docIds: string[]) => Promise<void>;
  importData: (overwrite: boolean) => Promise<void>;

  version: string;
}

const StoreContext = createContext<StoreValue | null>(null);

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within AppProvider");
  return ctx;
}

let toastSeq = 1;

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>({
    folders: [],
    apis: [],
    docs: [],
    version: "",
  });
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [version, setVersion] = useState("");

  const notify = (msg: string, kind: ToastKind = "info") => {
    const id = toastSeq++;
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  };

  const refresh = async () => {
    const d = await api.getAppData();
    setData(d);
  };

  useEffect(() => {
    (async () => {
      try {
        await refresh();
        setVersion(await api.getVersion());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const addFolder = async (name: string, parentId: string | null) => {
    await api.createFolder(name, parentId);
    notify("已创建分组", "success");
    await refresh();
  };
  const renameFolder = async (id: string, name: string) => {
    await api.renameFolder(id, name);
    await refresh();
  };
  const removeFolder = async (id: string) => {
    await api.deleteFolder(id);
    notify("已删除分组", "success");
    await refresh();
  };

  const addApi = async (folderId: string, name: string) => {
    const a = await api.createApi(folderId, name);
    notify("已创建接口", "success");
    await refresh();
    return a;
  };
  const saveApi = async (item: ApiItem) => {
    await api.updateApi(item);
    notify("接口已保存", "success");
    await refresh();
  };
  const removeApi = async (id: string) => {
    await api.deleteApi(id);
    notify("已删除接口", "success");
    await refresh();
  };
  const dupApi = async (id: string) => {
    await api.duplicateApi(id);
    notify("已复制接口", "success");
    await refresh();
  };
  const moveApi = async (folderId: string, id: string, dir: -1 | 1) => {
    const sibs = data.apis
      .filter((a) => a.folderId === folderId)
      .sort((a, b) => a.order - b.order);
    const idx = sibs.findIndex((a) => a.id === id);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= sibs.length) return;
    const ids = sibs.map((a) => a.id);
    [ids[idx], ids[swap]] = [ids[swap], ids[idx]];
    await api.reorderApis(folderId, ids);
    await refresh();
  };

  const addDoc = async (folderId: string, title: string, apiIds: string[]) => {
    const doc = await api.createDoc(folderId, title, apiIds);
    notify("文档已生成", "success");
    await refresh();
    return doc;
  };
  const saveDoc = async (id: string, title: string, content: string) => {
    await api.updateDoc(id, title, content);
    notify("文档已保存", "success");
    await refresh();
  };
  const renameDoc = async (id: string, title: string) => {
    await api.renameDoc(id, title);
    await refresh();
  };
  const removeDoc = async (id: string) => {
    await api.deleteDoc(id);
    notify("已删除文档", "success");
    await refresh();
  };

  const exportAll = async () => {
    const json = await api.exportAll();
    const path = await saveFile("duapi-backup.json", json, "json", "JSON 备份");
    if (path) notify("已导出全部数据", "success");
  };
  const exportSelection = async (apiIds: string[], docIds: string[]) => {
    const json = await api.exportSelection(apiIds, docIds);
    const path = await saveFile("duapi-selection.json", json, "json", "JSON 备份");
    if (path) notify("已导出选中数据", "success");
  };
  const importData = async (overwrite: boolean) => {
    const path = await openFile();
    if (!path) return;
    try {
      const content = await api.readTextFile(path);
      const fmt = detectFormat(content);
      let res;
      if (fmt === "duapi") {
        res = overwrite
          ? await api.importAll(content)
          : await api.importSelection(content);
      } else {
        // Postman / OpenAPI / curl -> always merge by name
        res = await api.importFromFormat(content, fmt);
      }
      notify(
        `导入完成（${fmt}）：分组 ${res.folders}，接口 ${res.apis}，文档 ${res.docs}`,
        "success"
      );
      await refresh();
    } catch (e) {
      notify("导入失败：" + String(e), "error");
    }
  };

  const value: StoreValue = {
    data,
    loading,
    refresh,
    notify,
    toasts,
    addFolder,
    renameFolder,
    removeFolder,
    addApi,
    saveApi,
    removeApi,
    dupApi,
    moveApi,
    addDoc,
    saveDoc,
    renameDoc,
    removeDoc,
    exportAll,
    exportSelection,
    importData,
    version,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

// ---- dialog helpers ----
function detectFormat(content: string): string {
  const t = content.trimStart().toLowerCase();
  if (t.startsWith("curl")) return "curl";
  // YAML OpenAPI / Swagger (not valid JSON, so detect by keywords first)
  if (/^(openapi|swagger)\s*:/m.test(content)) return "openapi";
  try {
    const v = JSON.parse(content);
    if (v && v.info && Array.isArray(v.item)) return "postman";
    if ((v.openapi || v.swagger) && v.paths) return "openapi";
    if (v.folders || v.apis) return "duapi";
  } catch {
    /* ignore */
  }
  return "duapi";
}

async function saveFile(
  filename: string,
  content: string,
  ext: string,
  label: string
): Promise<string | null> {
  const path = await save({
    defaultPath: filename,
    filters: [{ name: label, extensions: [ext] }],
  });
  if (!path) return null;
  await api.writeTextFile(path, content);
  return path;
}
async function openFile(): Promise<string | null> {
  const selected = await open({
    multiple: false,
    filters: [{ name: "数据文件", extensions: ["json", "postman", "yaml", "yml", "txt"] }],
  });
  if (Array.isArray(selected)) return selected[0] ?? null;
  return selected as string | null;
}
