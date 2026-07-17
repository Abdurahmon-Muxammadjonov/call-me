# Backend Prompt — PBX Webhook Test va Avtomatik Sync

**Loyiha:** Express + Supabase backend (procell-backend, :5001)

**Maqsad:** Frontend CRM settings'dan admin webhook URL + API key qo'yib "Test ulash" tugmasini bosganda, o'sha API URL'ga request borsin; agar route topilmasa `404` bilan muammo sababi qaytsin, agar ma'lumot kelsa xodimlar + audiolar avtomatik sync qilinib dashboardda darhol ko'rinsin.

---

## Frontend Contract (o'zgarmaydi)

```typescript
POST /crm/test-connection
body: { webhook_url: string, api_key: string }
response: {
  success: boolean,
  message?: string,
  error?: string,
  managers_synced?: number,
  calls_synced?: number,
  manager_names?: string[]
}
```

Frontend frontend toast'da success yoki error xabarini ko'rsatadi.

---

## Backend Implementation

### 1. POST /crm/test-connection

```typescript
// router: POST /crm/test-connection
app.post('/crm/test-connection', async (req, res) => {
  try {
    const { webhook_url, api_key } = req.body;

    if (!webhook_url || !api_key) {
      return res.status(400).json({
        success: false,
        error: 'Webhook URL va API key talab qilinadi',
      });
    }

    // 1. Test POST webhook'ga yuborish
    let pbxResponse;
    try {
      const testRes = await fetch(webhook_url, {
        method: 'POST',
        headers: {
          'x-api-key': api_key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: true, timestamp: new Date().toISOString() }),
        timeout: 15000, // 15 sekund
      });

      if (testRes.status === 404) {
        return res.status(404).json({
          success: false,
          error: 'Webhook route topilmadi (404). URL noto\'g\'ri yoki backendda route yo\'q.',
        });
      }

      if (!testRes.ok) {
        return res.status(400).json({
          success: false,
          error: `PBX webhook ${testRes.status}: ${testRes.statusText}`,
        });
      }

      pbxResponse = await testRes.json();

      if (!pbxResponse || ((!Array.isArray(pbxResponse.managers) || pbxResponse.managers.length === 0) && (!Array.isArray(pbxResponse.calls) || pbxResponse.calls.length === 0))) {
        return res.status(404).json({
          success: false,
          error: 'Webhook ishladi, lekin hech qanday managers yoki calls ma\'lumoti kelmadi. PBX response formatini tekshiring.',
        });
      }
    } catch (fetchErr: any) {
      return res.status(400).json({
        success: false,
        error: `PBX webhook'ga ulana olmadi: ${fetchErr.message}`,
      });
    }

    // 2. Sync managers (xodimlar)
    let managersCount = 0;
    if (pbxResponse.managers && Array.isArray(pbxResponse.managers)) {
      for (const mgr of pbxResponse.managers) {
        try {
          await supabase.from('managers').upsert(
            {
              pbx_id: String(mgr.id),
              name: mgr.name || 'Unknown',
              status: mgr.status || 'active',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'pbx_id' }
          );
          managersCount++;
        } catch (err) {
          console.error('Manager sync failed:', err);
        }
      }
    }

    // 3. Sync calls (audiolar)
    let callsCount = 0;
    if (pbxResponse.calls && Array.isArray(pbxResponse.calls)) {
      for (const call of pbxResponse.calls) {
        try {
          await supabase.from('calls').insert({
            pbx_id: String(call.id),
            manager_id: call.manager_id,
            audio_url: call.audio_url,
            duration: call.duration || 0,
            created_at: call.timestamp || new Date().toISOString(),
            kpi_score: 0,
            penalty_amount: 0,
            bonus_amount: 0,
            rop_comment: '',
          });
          callsCount++;
        } catch (err) {
          console.error('Call sync failed:', err);
        }
      }
    }

    // 4. Webhook config'ni Supabase'ga saqlasin (optional)
    try {
      await supabase.from('crm_integrations').upsert(
        {
          webhook_url,
          api_key,
          enabled: true,
          last_test_status: 200,
          last_test_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
    } catch (err) {
      console.error('Integration config save failed:', err);
    }

    // 5. Success response
    return res.status(200).json({
      success: true,
      message: `PBX sync qilindi: ${managersCount} xodim, ${callsCount} audio`,
      managers_synced: managersCount,
      calls_synced: callsCount,
      manager_names: Array.isArray(pbxResponse.managers) ? pbxResponse.managers.map((m: any) => m.name).filter(Boolean) : [],
    });
  } catch (error: any) {
    console.error('test-connection error:', error);
    return res.status(500).json({
      success: false,
      error: `Server xatosi: ${error.message}`,
    });
  }
});
```

### 2. Database Schema (Supabase SQL)

```sql
-- crm_integrations jadvali
create table if not exists crm_integrations (
  id uuid primary key default gen_random_uuid(),
  webhook_url text not null,
  api_key text not null,
  enabled boolean not null default true,
  last_test_status int,
  last_test_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- managers jadvaliga pbx_id ustuni (agar yo'q bo'lsa)
alter table managers add column pbx_id text unique;

-- calls jadvaliga pbx_id ustuni (agar yo'q bo'lsa)
alter table calls add column pbx_id text unique;

-- Index qo'shing (fast upsert)
create index if not exists idx_managers_pbx_id on managers(pbx_id);
create index if not exists idx_calls_pbx_id on calls(pbx_id);
```

### 3. GET /crm/status (agar yo'q bo'lsa)

```typescript
// GET /crm/status
app.get('/crm/status', async (req, res) => {
  try {
    const { data } = await supabase
      .from('crm_integrations')
      .select('enabled, last_test_status')
      .maybeSingle();

    const connected = !!(data?.enabled && data?.last_test_status === 200);

    return res.status(200).json({
      success: true,
      data: { connected },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});
```

---

## Frontend Updates (Optional)

### 1. Update `app/lib/api/crm.ts`

```typescript
export interface CrmTestResponse {
  success: boolean;
  message?: string;  // "PBX sync qilindi: 5 xodim, 24 audio"
  error?: string;
}

export async function testConnection(payload: CrmConnectPayload): Promise<CrmTestResponse> {
  return apiClient.post<CrmTestResponse>('/crm/test-connection', payload);
}
```

### 2. Update `app/crm-settings/page.tsx` toast message

```typescript
const handleTestConnection = async () => {
  if (!validateForm()) return;

  try {
    setTesting(true);
    const response = await testConnection({
      webhook_url: formData.webhook_url,
      api_key: formData.api_key,
    });

    if (response.success) {
      // Success message bilan sync natijalari ko'rsatilsin
      addToast(
        response.message || 'PBX ulanish muvaffaqiyatli',
        'success'
      );
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
```

---

## Testing Checklist

```bash
# 1. CRM settings sahifasiga o'ting
# 2. Webhook URL qo'ying: https://your-pbx.com/webhook/abc123
# 3. API Key qo'ying: your-api-key
# 4. "Test ulash" bosin
# 5. Agar PBX 200 bersa:
#    - Toast: "PBX sync qilindi: 5 xodim, 24 audio"
#    - Supabase: managers jadvalida 5 ta yangi yozuv
#    - Supabase: calls jadvalida 24 ta yangi yozuv
# 6. Management panel'ni refresh qilsa, yangi xodimlar + audiolar ko'rinsin
# 7. Agar PBX 401 bersa:
#    - Toast: "PBX webhook 401: Unauthorized"
# 8. Agar network error bo'lsa:
#    - Toast: "PBX webhook'ga ulana olmadi: ..."
```

---

## Summary

**Backend:**
- `POST /crm/test-connection` endpoint qo'shing (webhook'ga test POST yuboradi)
- Agar 200 bo'lsa: managers + calls sync qiladi, success message qaytaradi
- Agar error bo'lsa: aniq error message qaytaradi
- Supabase: `managers.pbx_id`, `calls.pbx_id`, `crm_integrations` jadvallari

**Frontend:**
- CRM settings'da "Test ulash" bosilganda sync natijalari toast'da ko'rsatiladi
- Success: "PBX sync qilindi: N xodim, M audio"
- Error: aniq xato sababi

**Result:** Admin webhook ulasa, request o'sha URL'ga boradi; `404` bo'lsa sababi aniq ko'rinadi, ma'lumot kelsa sync bo'ladi va dashboardda xodimlar soni hamda ismlari darhol ko'rinadi ✅
