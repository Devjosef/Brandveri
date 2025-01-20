import 'axios';

declare module 'axios' {
  export function create(config?: AxiosRequestConfig): AxiosInstance;

  export interface AxiosRequestConfig {
    baseURL?: string;
    url?: string;
    method?: string;
    timeout?: number;
    timeoutErrorMessage?: string;
    headers?: Record<string, string>;
    params?: any;
    data?: any;
    withCredentials?: boolean;
    responseType?: 'arraybuffer' | 'blob' | 'document' | 'json' | 'text' | 'stream';
    metadata?: {
      startTime: number;
      requestId?: string;
      correlationId?: string;
    };
  }

  export interface AxiosInterceptorManager<V> {
    use(
      onFulfilled?: (value: V) => V | Promise<V>,
      onRejected?: (error: any) => any
    ): number;
    eject(id: number): void;
  }

  export interface AxiosInstance {
    request<T = any>(config: AxiosRequestConfig): Promise<T>;
    get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;
    post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
    put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
    patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
    delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;
    interceptors: {
      request: AxiosInterceptorManager<AxiosRequestConfig>;
      response: AxiosInterceptorManager<AxiosResponse>;
    };
  }

  export interface AxiosResponse<T = any> {
    data: T;
    status: number;
    statusText: string;
    headers: Record<string, string>;
    config: AxiosRequestConfig & { metadata?: { startTime: number } };
  }

  export interface AxiosError<T = any> extends Error {
    config: AxiosRequestConfig;
    code?: string;
    request?: any;
    response?: AxiosResponse<T>;
    isAxiosError: boolean;
    status?: number;
    toJSON: () => object;
  }
}