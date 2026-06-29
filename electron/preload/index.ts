import { contextBridge, ipcRenderer } from 'electron';

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

contextBridge.exposeInMainWorld('electronAPI', {
  httpRequest: (config: HttpRequestConfig): Promise<HttpResponse> => {
    return ipcRenderer.invoke('http:request', config);
  },
  platform: process.platform,
});
