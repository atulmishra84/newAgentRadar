import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 15000,
})

let csrfToken = null
async function getCSRFToken() {
  if (!csrfToken) {
    try {
      const res = await axios.get('/api/csrf-token')
      csrfToken = res.data.token
    } catch (e) {
      console.error('Failed to fetch CSRF token', e)
    }
  }
  return csrfToken
}

api.interceptors.request.use(async config => {
  if (config.method !== 'get' && config.method !== 'head' && config.method !== 'options') {
    const token = await getCSRFToken()
    if (token) {
      config.headers['x-csrf-token'] = token
    }
  }
  return config
})

api.interceptors.response.use(
  res => res,
  async err => {
    if (err.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:logout'))
    }
    if (err.response?.status === 403 && err.response?.data?.error === "Invalid or missing CSRF token") {
      const originalRequest = err.config;
      if (!originalRequest._retry) {
        originalRequest._retry = true;
        csrfToken = null; // clear stale token
        const newToken = await getCSRFToken();
        if (newToken) {
          originalRequest.headers['x-csrf-token'] = newToken;
          return api(originalRequest);
        }
      }
    }
    return Promise.reject(err)
  }
)

export default api

export const authAPI = {
  login: (email, password, role) =>
    api.post('/auth/login', { email, password, role }),
  logout: () =>
    api.post('/auth/logout'),
  me: () =>
    api.get('/auth/me'),
  ssoAzure: () => { window.location.href = '/api/auth/sso/azure' },
  ssoOkta:  () => { window.location.href = '/api/auth/sso/okta' },
}

export const agentsAPI = {
  list:   (params) => api.get('/agents', { params }),
  get:    (id)     => api.get(`/agents/${id}`),
  create: (data)   => api.post('/agents', data),
  update: (id, d)  => api.put(`/agents/${id}`, d),
  remove: (id)     => api.delete(`/agents/${id}`),
  scan:   ()       => api.post('/agents/scan'),
}

export const complianceAPI = {
  posture: () => api.get('/compliance/posture'),
  report:  () => api.get('/compliance/report'),
}

export const policiesAPI = {
  list:   ()     => api.get('/policies'),
  create: (data) => api.post('/policies', data),
  update: (id, on) => api.patch(`/policies/${id}`, { on }),
}

export const modelsAPI = {
  list:   () => api.get('/models'),
}

export const approvalsAPI = {
  list:    () => api.get('/approvals'),
  approve: (id) => api.patch(`/approvals/${id}/approve`),
  reject:  (id) => api.patch(`/approvals/${id}/reject`),
}

export const activityAPI = {
  list:   (limit = 100) => api.get('/activity', { params: { limit } }),
}

export const integrationsAPI = {
  getCredentials: ()               => api.get('/integrations/credentials'),
  save:           (provider, creds) => api.post('/integrations/credentials', { provider, credentials: creds }),
  remove:         (provider)       => api.delete(`/integrations/credentials/${provider}`),
  scan:           (provider)       => api.post(`/integrations/${provider}/scan`),
  test:           (provider)       => api.post(`/integrations/${provider}/test`),
  checkScanStatus: (sessionId)     => api.get(`/autodiscovery/status/${sessionId}`),
}

export const playbooksAPI = {
  list:     () => api.get('/playbooks'),
  getRuns:  (id) => api.get(`/playbooks/${id}/runs`),
  execute:  (id, targets, dryRun) => api.post(`/playbooks/${id}/execute`, { targets, dryRun }),
}

export const configAPI = {
  get: () => api.get('/config')
}

export const adminAPI = {
  getAIKeys: () => api.get('/admin/ai-keys'),
  setAIKey:  (provider, key) => api.post('/admin/ai-keys', { provider, key }),
}

export const scanAPI = {
  triggerScan: (scannerId) => api.post('/scan/background/trigger', { scannerId }),
  getStatus:   ()          => api.get('/scan/background/status'),
}

export const llmAPI = {
  chat: (message, context, provider) => api.post('/llm/proxy', { message, context, provider }),
}

export const notificationsAPI = {
  list:        () => api.get('/notifications'),
  markRead:    (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
}
