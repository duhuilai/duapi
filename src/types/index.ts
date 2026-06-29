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
  searchQuery: string;
}
