import { apiClient } from './client';

export interface CrmStatus {
  connected: boolean;
}

interface CrmStatusWrappedResponse {
  success?: boolean;
  status?: number;
  data?: {
    connected?: boolean;
  };
  connected?: boolean;
}

export interface CrmConnectPayload {
  webhook_url: string;
  api_key: string;
}

export interface CrmConnectResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface CrmTestResponse {
  success: boolean;
  message?: string;
  error?: string;
  managers_synced?: number;
  calls_synced?: number;
  manager_names?: string[];
  dashboard_ready?: boolean;
}

/**
 * CRM connection status'ini olish
 */
export async function getStatus(): Promise<CrmStatus> {
  const response = await apiClient.get<CrmStatusWrappedResponse>('/crm/webhook/pbx');
  const connected = typeof response.connected === 'boolean'
    ? response.connected
    : typeof response.status === 'number'
    ? response.status === 1
    : Boolean(response.data?.connected);
  return { connected };
}

/**
 * CRM'ga webhook_url va api_key orqali ulash
 */
export async function connectSimple(payload: CrmConnectPayload): Promise<CrmConnectResponse> {
  return apiClient.post<CrmConnectResponse>('/crm/connect-simple', payload);
}

/**
 * PBX ulanishini test qilish va sync qilish
 */
export async function testConnection(payload: CrmConnectPayload): Promise<CrmTestResponse> {
  return apiClient.post<CrmTestResponse>('/crm/test-connection', payload);
}
