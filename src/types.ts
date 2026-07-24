// TypeScript types mirroring the Rust backend models (serde camelCase).

export interface KeyValue {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface AuthData {
  authType: string; // none | bearer | basic | apikey
  token: string;
  username: string;
  password: string;
  key: string;
  value: string;
  addTo: string; // header | query
}

export interface ParamDoc {
  id: string;
  path: string;
  typeName: string;
  required: boolean;
  description: string;
  sample: string;
  depth: number;
}

export interface SavedResponse {
  status: number;
  statusText: string;
  headers: KeyValue[];
  body: string;
  timeMs: number;
  sizeBytes: number;
  contentType: string;
  savedAt: string;
}

export interface ApiItem {
  id: string;
  folderId: string;
  name: string;
  protocol: string; // http | graphql
  method: string;
  url: string;
  headers: KeyValue[];
  query: KeyValue[];
  pathParams: KeyValue[];
  bodyType: string; // none | json | form_data | form_urlencoded | raw | graphql
  bodyRaw: string;
  bodyContentType: string;
  auth: AuthData;
  preScript: string;
  testsScript: string;
  order: number;
  description: string;
  requestDocs: ParamDoc[];
  responseDocs: ParamDoc[];
  lastResponse: SavedResponse | null;
  updatedAt: string;
  createdAt: string;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  order: number;
  createdAt: string;
}

export interface DocItem {
  id: string;
  folderId: string;
  title: string;
  apiIds: string[];
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppData {
  folders: Folder[];
  apis: ApiItem[];
  docs: DocItem[];
  version: string;
}

export interface ResponseData {
  status: number;
  statusText: string;
  headers: KeyValue[];
  body: string;
  timeMs: number;
  sizeBytes: number;
  contentType: string;
  ok: boolean;
  error: string | null;
}

export interface UpdateInfo {
  current: string;
  latest: string;
  hasUpdate: boolean;
  notes: string;
  downloadUrl: string | null;
  prerelease: boolean;
  error: string | null;
}

export interface ImportResult {
  folders: number;
  apis: number;
  docs: number;
  format: string;
}

export const METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];
export const PROTOCOLS = ["http", "graphql"];
export const BODY_TYPES = ["none", "json", "form_data", "form_urlencoded", "raw", "graphql"];

export function emptyApi(folderId: string, name: string): ApiItem {
  return {
    id: "",
    folderId,
    name,
    protocol: "http",
    method: "GET",
    url: "",
    headers: [],
    query: [],
    pathParams: [],
    bodyType: "none",
    bodyRaw: "",
    bodyContentType: "application/json",
    auth: { authType: "none", token: "", username: "", password: "", key: "", value: "", addTo: "header" },
    preScript: "",
    testsScript: "",
    order: 0,
    description: "",
    requestDocs: [],
    responseDocs: [],
    lastResponse: null,
    updatedAt: "",
    createdAt: "",
  };
}

export function newId(): string {
  return crypto.randomUUID();
}
