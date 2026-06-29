export interface HttpRequestConfig {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
}

export interface HttpResponse {
  success: boolean;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  responseTime: number;
  error?: string;
}

export interface ElectronAPI {
  httpRequest: (config: HttpRequestConfig) => Promise<HttpResponse>;
  platform: string;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
