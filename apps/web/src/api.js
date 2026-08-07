function getCookie(name) {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

let csrfToken = null;

export async function ensureCsrf() {
  if (csrfToken || getCookie('ar_csrf')) {
    csrfToken = csrfToken || getCookie('ar_csrf');
    return csrfToken;
  }
  const res = await fetch('/api/auth/csrf', { credentials: 'include' });
  const data = await res.json();
  csrfToken = data.csrfToken;
  return csrfToken;
}

export async function api(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = { ...(options.headers || {}) };
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrf = await ensureCsrf();
    headers['X-CSRF-Token'] = csrf;
  }
  const token = localStorage.getItem('ar_token');
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(path, {
    ...options,
    method,
    headers,
    credentials: 'include',
    body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body,
  });

  if (res.status === 204) return null;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/pdf')) return res.blob();
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) {
    const err = new Error(data?.error || res.statusText);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}
