'use client';

import React, { useState, useEffect } from 'react';
import { getStatus, connectSimple, CrmStatus } from '@/app/lib/api/crm';
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
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  /**
   * Add toast notification
   */
  const addToast = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto-remove after 4 seconds
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
      } catch (error) {
        console.error('Failed to fetch CRM status:', error);
        addToast('CRM statusni olishda xatolik', 'error');
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
    // Clear error when user starts typing
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
   * Handle form submission
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
        addToast('CRM muvaffaqiyatli ulandi', 'success');
        // Refresh status
        const updatedStatus = await getStatus();
        setStatus(updatedStatus);
      } else {
        addToast(response.error || 'Ulashda xatolik', 'error');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ulashda xatolik';
      addToast(errorMessage, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">PBX Integratsiya</h1>
          <p className="text-gray-600 mt-2">PBX dan webhook URL va API Key orqali CRM&apos;ga ulang</p>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Ulanish Statusi</h2>
            <StatusBadge connected={status?.connected ?? false} loading={loadingStatus} />
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
              disabled={submitting}
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
              disabled={submitting}
            />

            <div className="mt-6">
              <SubmitButton label="Save" loading={submitting} disabled={submitting} />
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
