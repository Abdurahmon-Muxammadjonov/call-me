import { apiClient } from '../api';

export interface CrmStatus {
  connected: boolean;
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

/**
 * CRM connection status'ini olish
 */
export async function getStatus(): Promise<CrmStatus> {
  return apiClient.get<CrmStatus>('/crm/status');
}

/**
 * CRM'ga webhook_url va api_key orqali ulash
 */
export async function connectSimple(payload: CrmConnectPayload): Promise<CrmConnectResponse> {
  return apiClient.post<CrmConnectResponse>('/crm/connect-simple', payload);
}
