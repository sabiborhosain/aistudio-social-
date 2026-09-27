const API_BASE = '/api/v1';

function getHeaders(isFormData = false): HeadersInit {
  const headers: Record<string, string> = {};
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  const token = localStorage.getItem('devsphere_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: {
    method?: string;
    body?: any;
    isFormData?: boolean;
  } = {}
): Promise<{ success: boolean; data?: T; message?: string; code?: string }> {
  try {
    const { method = 'GET', body, isFormData = false } = options;

    const res = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers: getHeaders(isFormData),
      body: isFormData ? body : body ? JSON.stringify(body) : undefined
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Network request failed'
    };
  }
}

// Media upload helper
export async function uploadMedia(file: File, folder = 'media'): Promise<string | null> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  const res = await apiRequest<{ url: string }>('/media/upload', {
    method: 'POST',
    body: formData,
    isFormData: true
  });

  if (res.success && res.data?.url) {
    return res.data.url;
  }
  throw new Error(res.message || 'Media upload failed');
}
