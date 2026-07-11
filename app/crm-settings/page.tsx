'use client';

import React, { useState, useEffect } from 'react';
import { getStatus, connectSimple, testConnection, CrmStatus } from '@/app/lib/api/crm';
import { FormField } from '@/app/components/ui/FormField';
import { StatusBadge } from '@/app/components/ui/StatusBadge';
import { SubmitButton } from '@/app/components/ui/SubmitButton';
import Toast from '../components/Toast';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

/**
 * Validate webhook URL format
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export default function CrmSettingsPage() {
  const [formData, setFormData] = useState({
    webhook_url: '',
    api_key: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<CrmStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  /**
   * Add toast notification
   */
  const addToast = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  /**
   * Fetch CRM connection status on mount
   */
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoadingStatus(true);
        const data = await getStatus();
        setStatus(data);
        setIsEnabled(data.connected);
      } catch (error) {
        console.error('Failed to fetch CRM status:', error);
        addToast('PBX statusni olishda xatolik', 'error');
      } finally {
        setLoadingStatus(false);
      }
    };

    fetchStatus();
  }, []);

  /**
   * Handle input change
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  /**
   * Validate form inputs
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.webhook_url.trim()) {
      newErrors.webhook_url = 'Webhook URL talab qilinadi';
    } else if (!isValidUrl(formData.webhook_url)) {
      newErrors.webhook_url = 'Noto\'g\'ri URL format';
    }

    if (!formData.api_key.trim()) {
      newErrors.api_key = 'API Key talab qilinadi';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission (Save)
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      const response = await connectSimple({
        webhook_url: formData.webhook_url,
        api_key: formData.api_key,
      });

      if (response.success) {
        addToast('PBX muvaffaqiyatli saqlandi', 'success');
        const updatedStatus = await getStatus();
        setStatus(updatedStatus);
        setIsEnabled(true);
      } else {
        addToast(response.error || 'Saqlashda xatolik', 'error');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Saqlashda xatolik';
      addToast(errorMessage, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Handle test connection
   */
  const handleTestConnection = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setTesting(true);
      const response = await testConnection({
        webhook_url: formData.webhook_url,
        api_key: formData.api_key,
      });

      if (response.success) {
        addToast('PBX ulanish muvaffaqiyatli', 'success');
      } else {
        addToast(response.error || 'Ulanishda xatolik', 'error');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ulanishda xatolik';
      addToast(errorMessage, 'error');
    } finally {
      setTesting(false);
    }
  };

  /**
   * Handle toggle
   */
  const handleToggle = () => {
    setIsEnabled(!isEnabled);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">amoCRM ulanishi</h1>
          <p className="text-gray-600 mt-2">CRM integratsiyasi</p>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Jonli integratsiya</h2>
              <p className="text-sm text-gray-500 mt-1">Qo&apos;ng&apos;iroq yopilishi avtomatik oqimni ishga tushiradi</p>
            </div>
            <div className="flex items-center gap-4">
              <StatusBadge connected={status?.connected ?? false} loading={loadingStatus} />
              <button
                onClick={handleToggle}
                disabled={loadingStatus}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  isEnabled ? 'bg-blue-600' : 'bg-gray-300'
                } ${loadingStatus ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    isEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={handleSubmit}>
            <FormField
              label="Webhook URL (PBX dan)"
              name="webhook_url"
              type="url"
              value={formData.webhook_url}
              onChange={handleInputChange}
              placeholder="https://your-pbx.com/webhook/abc123"
              error={errors.webhook_url}
              required
              disabled={submitting || testing}
            />

            <FormField
              label="API Key (PBX dan)"
              name="api_key"
              type="password"
              value={formData.api_key}
              onChange={handleInputChange}
              placeholder="••••••••••••••"
              error={errors.api_key}
              required
              disabled={submitting || testing}
            />

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || submitting}
                className="px-6 py-2 rounded-lg font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {testing ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Test qilmoqda...
                  </span>
                ) : (
                  'Test ulanish'
                )}
              </button>

              <SubmitButton label="Sozlamalarni saqlash" loading={submitting} disabled={submitting || testing} />
            </div>
          </form>
        </div>

        {/* Toast Container */}
        <div className="fixed bottom-4 right-4 z-50 space-y-2">
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              message={toast.message}
              type={toast.type}
              onClose={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
