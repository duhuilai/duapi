import { invoke } from "@tauri-apps/api/core";
import type {
  ApiItem,
  AppData,
  DocItem,
  Folder,
  ImportResult,
  KeyValue,
  ParamDoc,
  ResponseData,
  UpdateInfo,
} from "../types";

// NOTE: Tauri 2 converts Rust snake_case command parameters to camelCase on
// the JS side by default, so all argument keys here MUST be camelCase.
export const api = {
  getAppData: () => invoke<AppData>("get_app_data"),

  createFolder: (name: string, parentId: string | null) =>
    invoke<Folder>("create_folder", { name, parentId }),
  renameFolder: (id: string, name: string) =>
    invoke<void>("rename_folder", { id, name }),
  deleteFolder: (id: string) => invoke<void>("delete_folder", { id }),
  reorderFolders: (orderedIds: string[]) =>
    invoke<void>("reorder_folders", { orderedIds }),

  createApi: (folderId: string, name: string) =>
    invoke<ApiItem>("create_api", { folderId, name }),
  updateApi: (item: ApiItem) => invoke<void>("update_api", { api: item }),
  deleteApi: (id: string) => invoke<void>("delete_api", { id }),
  reorderApis: (folderId: string, orderedIds: string[]) =>
    invoke<void>("reorder_apis", { folderId, orderedIds }),
  duplicateApi: (id: string) => invoke<ApiItem | null>("duplicate_api", { id }),

  createDoc: (folderId: string, title: string, apiIds: string[]) =>
    invoke<DocItem>("create_doc", { folderId, title, apiIds }),
  updateDoc: (id: string, title: string, content: string) =>
    invoke<void>("update_doc", { id, title, content }),
  renameDoc: (id: string, title: string) => invoke<void>("rename_doc", { id, title }),
  deleteDoc: (id: string) => invoke<void>("delete_doc", { id }),

  generateParamDocs: (json: string, rootPath: string) =>
    invoke<ParamDoc[]>("generate_param_docs", { json, rootPath }),

  sendRequest: (item: ApiItem) => invoke<ResponseData>("send_request", { api: item }),

  exportAll: () => invoke<string>("export_all"),
  importAll: (json: string) => invoke<ImportResult>("import_all", { json }),
  exportSelection: (apiIds: string[], docIds: string[]) =>
    invoke<string>("export_selection", { apiIds, docIds }),
  importSelection: (json: string) => invoke<ImportResult>("import_selection", { json }),
  importFromFormat: (content: string, format: string) =>
    invoke<ImportResult>("import_from_format", { content, format }),

  writeTextFile: (path: string, content: string) =>
    invoke<void>("write_text_file", { path, content }),
  readTextFile: (path: string) => invoke<string>("read_text_file", { path }),

  getVersion: () => invoke<string>("get_version"),
  checkUpdate: (repo: string) => invoke<UpdateInfo>("check_update_cmd", { repo }),
  downloadUpdate: (url: string, target: string) =>
    invoke<void>("download_update_cmd", { url, target }),
  installUpdate: (path: string) => invoke<void>("install_update_cmd", { path }),
};

export type { KeyValue };
