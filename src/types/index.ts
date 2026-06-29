// API 方法
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

// URL 参数
export interface UrlParam {
  id: string;
  name: string;
  value: string;
  description: string;
  enabled: boolean;
}

// 请求头
export interface RequestHeader {
  id: string;
  key: string;
  value: string;
  description: string;
  enabled: boolean;
}

// 认证类型
export type AuthType = 'none' | 'bearer' | 'basic' | 'oauth2';

// 认证配置
export interface AuthConfig {
  type: AuthType;
  bearerToken?: string;
  basicUsername?: string;
  basicPassword?: string;
}

// 响应参数说明
export interface ResponseParam {
  id: string;
  path: string;       // JSON 路径，如 "data.name"、"data.items[].id"
  type: string;       // 类型：string / number / boolean / object / array / null
  description: string;
  required: boolean;
  children?: ResponseParam[];
}

// API 端点定义
export interface ApiEndpoint {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  params: UrlParam[];
  headers: RequestHeader[];
  auth: AuthConfig;
  body: string;
  bodyType: 'json' | 'form' | 'raw' | 'none';
  preScript: string;
  testScript: string;
  description: string;
  responseParams: ResponseParam[];
  bodyParams: ResponseParam[];
  errorCodes: ErrorCode[];
  responseExample: string;
}

// 错误码定义
export interface ErrorCode {
  id: string;
  code: string;         // 错误码，如 "1001"、"AUTH_EXPIRED"
  httpStatus: number;   // HTTP 状态码，如 401, 403, 500
  message: string;      // 错误信息，如 "Token已过期"
  description: string;  // 详细说明及处理建议
}

// API 分组
export interface ApiGroup {
  id: string;
  name: string;
  icon: string;
  iconColor: string;
  endpoints: ApiEndpoint[];
  collapsed: boolean;
}

// 环境变量
export interface Environment {
  id: string;
  name: string;
  variables: Record<string, string>;
}

// 响应数据
export interface ApiResponse {
  body: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  responseTime: number;
  timestamp: number;
}

// 导出格式
export type ExportFormat = 'pdf' | 'doc' | 'html' | 'md';

// 导出配置
export interface ExportConfig {
  formats: ExportFormat[];
  includeParams: boolean;
  includeResponse: boolean;
  includeErrors: boolean;
  includeChangelog: boolean;
  mergeDoc: boolean;
  selectedEndpoints: string[];
  selectedGroups: string[];
}

// 当前请求状态
export interface RequestState {
  method: HttpMethod;
  url: string;
  params: UrlParam[];
  headers: RequestHeader[];
  auth: AuthConfig;
  body: string;
  bodyType: 'json' | 'form' | 'raw' | 'none';
  preScript: string;
  testScript: string;
  description: string;
}

// 应用状态
export interface AppState {
  activePage: 'workspace' | 'export';
  groups: ApiGroup[];
  activeEndpointId: string | null;
  environments: Environment[];
  activeEnvironmentId: string | null;
  request: RequestState;
  response: ApiResponse | null;
  requestHistory: { endpointId: string; response: ApiResponse }[];
  isRequesting: boolean;
  exportConfig: ExportConfig;
  exportContent: string;
  searchQuery: string;
  savedTick: number;
}
