const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001/api/v1';
const API_ORIGIN = API_BASE.replace(/\/api\/v1\/?$/, '');

export function assetUrl(value) {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `${API_ORIGIN}${String(value).startsWith('/') ? '' : '/'}${value}`;
}

export function getToken() {
  return localStorage.getItem('mini_library_token');
}

export function saveSession(token, user) {
  localStorage.setItem('mini_library_token', token);
  localStorage.setItem('mini_library_user', JSON.stringify(user || {}));
}

export function clearSession() {
  localStorage.removeItem('mini_library_token');
  localStorage.removeItem('mini_library_user');
}

export function getSavedUser() {
  try { return JSON.parse(localStorage.getItem('mini_library_user') || '{}'); }
  catch { return {}; }
}

export async function api(path, options = {}) {
  const token = getToken();
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = { ...(options.body && !isFormData ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const text = await response.text();
  let payload = {};
  try { payload = text ? JSON.parse(text) : {}; } catch { payload = { message: text }; }
  if (!response.ok) {
    if (response.status === 401) {
      clearSession();
      window.dispatchEvent(new Event('auth-expired'));
    }
    throw new Error(payload.message || payload.error || `Request gagal (${response.status})`);
  }
  return payload;
}

export async function login(email, password) {
  const data = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    headers: {}
  });
  const token = data.token || data.accessToken;
  if (!token) throw new Error('Login berhasil, tetapi token tidak ditemukan di respons API.');
  saveSession(token, data.user);
  return data.user || {};
}
export async function register(name, email, password) {
  return api('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
    headers: {}
  });
}
