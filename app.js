
// ═══════════════════════════════════════════════════════════════
// AgentRadar — AI Governance Platform
// Fresh build — clean syntax, no escaping issues
// ═══════════════════════════════════════════════════════════════

// ── Runtime CSS fix ───────────────────────────────────────────
(function fixCardScroll() {
  var style = document.createElement('style');
  style.id = 'ar-scroll-fix';
  style.textContent = [
    '.view.active > * { overflow: visible !important; }',
    '.view.active .card { overflow: visible !important; height: auto !important; }',
    '.view.active .card .tbl-wrap { overflow-x: auto; overflow-y: auto; }',
    '#view-discovery, #view-shadow, #view-phi, #view-models,',
    '#view-risk, #view-approvals, #view-compliance { overflow-y: auto !important; }'
  ].join('\n');
  document.head.appendChild(style);
})();

// ── Fix misplaced views ────────────────────────────────────────
(function fixViewPlacement() {
  var content = document.getElementById('content');
  if (!content) return;
  ['benchmark','notifications','activity','admin','ciso','blast'].forEach(function(v) {
    var el = document.getElementById('view-' + v);
    if (el && el.parentNode !== content) {
      content.appendChild(el);
      console.log('[DOM] Moved view-' + v + ' to #content');
    }
  });
})();

// ═══════════════════════════════════════════════════════════════
// GLOBAL STATE
// ═══════════════════════════════════════════════════════════════
var currentRole = null;
var currentUser = '';
var currentView = 'dashboard';
var _apiToken = null;
var cfFilter = 'all';
var rf = 'all';
var ef = 'all';
var tf = 'all';
var adSelected = new Set();
var feedTimer = null;
var lIdx = 0;
var epCt = 0;

var DB = {
  agents: [],
  policyViolations: [],
  approvals: [],
  phiAgents: [],
  activity: [],
  notifications: [],
  scanners: []
};

var ROLES = {
  platform_admin: { label: 'Platform Admin', color: '#8b5cf6' },
  ciso:           { label: 'CISO',           color: '#ef4444' },
  analyst:        { label: 'Security Analyst',color: '#3b82f6' },
  auditor:        { label: 'Auditor',         color: '#10b981' },
  viewer:         { label: 'Viewer',          color: '#94a3b8' }
};

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function setTextSafe(el, val) {
  if (el) el.textContent = String(val || '');
}

function save() {
  try { localStorage.setItem('ar11-db', JSON.stringify(DB)); } catch(e) {}
}

function envTag(env) {
  var colors = { Cloud:'#3b82f6', Azure:'#0078d4', AWS:'#f59e0b', GCP:'#34a853', 'On-Prem':'#6366f1', Hybrid:'#8b5cf6', SaaS:'#06b6d4', Edge:'#f97316' };
  var c = colors[env] || '#94a3b8';
  return '<span style="font-size:10px;font-weight:600;padding:2px 7px;border-radius:99px;background:' + c + '18;color:' + c + '">' + escapeHtml(env || 'Unknown') + '</span>';
}

function rtag(risk) {
  var colors = { critical:'#ef4444', high:'#f59e0b', medium:'#6366f1', low:'#10b981' };
  var c = colors[risk] || '#94a3b8';
  return '<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;background:' + c + '18;color:' + c + '">' + escapeHtml((risk || 'unknown').toUpperCase()) + '</span>';
}

function showToast(message, type, duration) {
  var container = document.getElementById('toast-container');
  if (!container) return;
  var toast = document.createElement('div');
  toast.className = 'toast-item';
  var icons = { success: '&#x2713;', error: '&#x2717;', info: '&#x2139;', warning: '&#x26a0;' };
  var colors = { success: '#10B981', error: '#EF4444', info: '#2563EB', warning: '#F59E0B' };
  var color = colors[type || 'info'] || colors.info;
  toast.style.borderLeft = '3px solid ' + color;
  toast.innerHTML = '<span style="color:' + color + ';font-weight:700;font-size:14px">' + (icons[type || 'info'] || '&#x2139;') + '</span><span>' + escapeHtml(String(message || '')) + '</span>';
  container.appendChild(toast);
  setTimeout(function() {
    toast.style.animation = 'toastIn .3s ease reverse';
    setTimeout(function() { toast.remove(); }, 300);
  }, duration || 3000);
}

function addAct(type, action, actor, color) {
  DB.activity.unshift({ type: type, action: action, actor: actor || 'System', color: color || '#6366f1', ts: new Date().toLocaleTimeString() });
  if (DB.activity.length > 100) DB.activity.pop();
  var cnt = document.getElementById('act-count');
  if (cnt) cnt.textContent = DB.activity.length;
}

function levenshtein(a, b) {
  var m = a.length, n = b.length;
  var dp = [];
  for (var i = 0; i <= m; i++) {
    dp[i] = [i];
    for (var j = 1; j <= n; j++) {
      dp[i][j] = i === 0 ? j : 0;
    }
  }
  for (var j = 1; j <= n; j++) dp[0][j] = j;
  for (var i = 1; i <= m; i++) {
    for (var j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[m][n];
}

// ═══════════════════════════════════════════════════════════════
// AGENT CLASSIFICATION
// ═══════════════════════════════════════════════════════════════

function classifyAgentCategory(a) {
  var name = (a.name || '').toLowerCase();
  var type = (a.type || '').toLowerCase();
  var detect = (a.detect || '').toLowerCase();
  var protos = (a.protocols || []).map(function(p) { return p.toLowerCase(); });
  var env = (a.env || '').toLowerCase();

  var saasKw = ['copilot','salesforce','einstein','servicenow','workday','zendesk','hubspot','epic','cerner','nuance','m365','office365','zoom','teams','slack'];
  if (saasKw.some(function(k) { return name.indexOf(k) >= 0 || detect.indexOf(k) >= 0; })) return 'saas';
  if (['hl7 v2','fhir r4','dicom','mllp'].some(function(p) { return protos.indexOf(p) >= 0; })) return 'saas';

  var devKw = ['test','dev','staging','sandbox','poc','prototype','demo','local'];
  if (devKw.some(function(k) { return name.indexOf(k) >= 0 || env.indexOf(k) >= 0; })) return 'dev';

  var platformKw = ['scanner','monitor','watcher','crawler','probe','sensor','gateway','proxy','router','orchestrat','pipelin'];
  if (platformKw.some(function(k) { return name.indexOf(k) >= 0 || detect.indexOf(k) >= 0; })) return 'platform';

  var autoKw = ['autogpt','autonomous','bot','automation','workflow','langchain','crewai','autogen'];
  if (autoKw.some(function(k) { return name.indexOf(k) >= 0 || type.indexOf(k) >= 0; })) return 'autonomous';

  return 'user-facing';
}

function agentCategoryLabel(cat) {
  var labels = { 'user-facing':'User-facing', 'autonomous':'Autonomous', 'saas':'SaaS agent', 'dev':'Dev / Test', 'platform':'Platform agent', 'unknown':'Unknown' };
  return labels[cat] || cat;
}

function agentCategoryColor(cat) {
  var colors = { 'user-facing':'#3b82f6', 'autonomous':'#8b5cf6', 'saas':'#06b6d4', 'dev':'#94a3b8', 'platform':'#f59e0b', 'unknown':'#94a3b8' };
  return colors[cat] || '#94a3b8';
}

function lifecycleLabel(status) {
  var labels = { 'active':'Active', 'dormant':'Dormant', 'under-review':'Under review', 'approved':'Approved', 'retired':'Retired' };
  return labels[status] || status || 'Active';
}

function lifecycleColor(status) {
  var colors = { 'active':'#10b981', 'dormant':'#94a3b8', 'under-review':'#f59e0b', 'approved':'#10b981', 'retired':'#64748b' };
  return colors[status] || '#94a3b8';
}

function dupScore(a, b) {
  if (String(a.id) === String(b.id)) return 0;
  var nameA = (a.name || '').toLowerCase();
  var nameB = (b.name || '').toLowerCase();
  if (nameA === nameB) return 100;
  var lev = levenshtein(nameA, nameB);
  var maxLen = Math.max(nameA.length, nameB.length) || 1;
  var score = Math.round((1 - lev / maxLen) * 50);
  if (a.type && b.type && a.type === b.type) score += 15;
  if (a.env && b.env && a.env === b.env) score += 15;
  var pA = Array.isArray(a.protocols) ? a.protocols : [];
  var pB = Array.isArray(b.protocols) ? b.protocols : [];
  var shared = pA.filter(function(p) { return pB.indexOf(p) >= 0; }).length;
  score += Math.min(10, shared * 5);
  return Math.min(99, score);
}

// ═══════════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════════

var viewRenderMap = {
  dashboard:    function() { renderDash(); },
  discovery:    function() { renderDisc(); },
  shadow:       function() { renderShadow(); },
  phi:          function() { renderPhi(); },
  models:       function() { renderModels(); },
  risk:         function() { renderRisk(); },
  compliance:   function() { renderComp(); },
  policy:       function() { renderPolicy(); },
  approvals:    function() { renderApprovals(); },
  playbooks:    function() { renderPlaybooks(); },
  lineage:      function() { renderLineage(); },
  live:         function() { renderLive(); },
  benchmark:    function() { renderBench(); },
  notifications:function() { renderNotif(); },
  activity:     function() { renderActivity(); },
  ciso:         function() { renderCiso(); },
  integrations: function() { renderInteg(); },
  admin:        function() { renderAdmin(); },
  blast:        function() { renderBlast(); }
};

function go(v) {
  currentView = v;
  document.querySelectorAll('.view').forEach(function(el) { el.classList.remove('active'); });
  document.querySelectorAll('.nav-item').forEach(function(el) { el.classList.remove('active'); });
  var viewEl = document.getElementById('view-' + v);
  if (viewEl) viewEl.classList.add('active');
  var navEl = document.getElementById('nav-' + v) || document.querySelector('[data-view="' + v + '"]');
  if (navEl) navEl.classList.add('active');
  if (viewRenderMap[v]) {
    try { viewRenderMap[v](); } catch(e) { console.warn('[go] render error for', v, ':', e.message); }
  }
  updateStats();
}

// ═══════════════════════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════════════════════

function updateStats() {
  var agents = DB.agents || [];
  var shadow = agents.filter(function(a) { return a.shadow; });
  var phi = agents.filter(function(a) { return a.phi || a.pii; });
  var crit = agents.filter(function(a) { return a.risk === 'critical'; });
  var viols = DB.policyViolations || [];

  function setEl(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }
  setEl('s-total', agents.length);
  setEl('s-shadow', shadow.length);
  setEl('s-crit', crit.length);
  setEl('s-viols', viols.length);
  setEl('dh-total', agents.length);
  setEl('dh-phi', phi.length);
  setEl('dh-crit', crit.length);
  setEl('nb-total', agents.length);
  setEl('nb-phi', phi.length);
  setEl('nb-crit', crit.length);
  setEl('shd-n', shadow.length);
  setEl('phi-n', phi.length);
  setEl('r-crit', crit.length);
  setEl('r-high', agents.filter(function(a) { return a.risk === 'high'; }).length);
  setEl('r-med', agents.filter(function(a) { return a.risk === 'medium'; }).length);
  setEl('r-low', agents.filter(function(a) { return a.risk === 'low'; }).length);
}

// ═══════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════

async function doLogin() {
  var email = document.getElementById('login-email') ? document.getElementById('login-email').value : '';
  var password = document.getElementById('login-password') ? document.getElementById('login-password').value : '';
  if (!email || !password) { showToast('Please enter email and password', 'error'); return; }

  console.log('[doLogin] Starting login for:', email);
  try {
    var res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: email, password: password })
    });
    var data = await res.json();
    if (!res.ok || !data.user) {
      showToast(data.error || 'Login failed', 'error');
      return;
    }

    currentRole = data.user.role;
    currentUser = data.user.name || data.user.email || email;
    _apiToken = data.token || null;

    console.log('[DEBUG] Set currentRole to:', currentRole);
    console.log('[auth] Logged in as:', currentUser, 'role:', currentRole);

    sessionStorage.setItem('ar-role', currentRole);
    sessionStorage.setItem('ar-user', currentUser);
    if (_apiToken) sessionStorage.setItem('ar-token', _apiToken);

    var loginScreen = document.getElementById('login-screen');
    if (loginScreen) loginScreen.classList.add('hidden');

    var nameEl = document.getElementById('login-user-name');
    var roleEl = document.getElementById('login-user-role');
    var avatarEl = document.getElementById('login-avatar');
    if (nameEl) nameEl.textContent = currentUser;
    if (roleEl) roleEl.textContent = (ROLES[currentRole] && ROLES[currentRole].label) || currentRole;
    if (avatarEl) avatarEl.textContent = currentUser.split(' ').map(function(w) { return w[0] || ''; }).join('').slice(0, 2).toUpperCase() || 'U';

    applyRBAC();
    await loadLiveAgents();
    go('dashboard');
    showToast('Welcome, ' + currentUser, 'success');
    addAct('login', 'User logged in: ' + currentUser, currentUser, '#10b981');

  } catch(e) {
    console.error('[doLogin] Error:', e.message);
    showToast('Login error: ' + e.message, 'error');
  }
}

function doLogout() {
  fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(function() {});
  currentRole = null;
  currentUser = '';
  _apiToken = null;
  sessionStorage.clear();
  DB = { agents: [], policyViolations: [], approvals: [], phiAgents: [], activity: [], notifications: [], scanners: [] };
  var loginScreen = document.getElementById('login-screen');
  if (loginScreen) loginScreen.classList.remove('hidden');
}

function applyRBAC() {
  if (!currentRole) { console.log('[RBAC] Skipped - not authenticated'); return; }
  var adminNav = document.querySelector('[data-view="admin"]');
  if (adminNav) adminNav.style.display = currentRole === 'platform_admin' ? '' : 'none';
  var roleEl = document.getElementById('login-user-role');
  if (roleEl) roleEl.textContent = (ROLES[currentRole] && ROLES[currentRole].label) || currentRole;
  console.log('[RBAC] Applied for role:', currentRole);
}

// ═══════════════════════════════════════════════════════════════
// LOAD LIVE AGENTS
// ═══════════════════════════════════════════════════════════════

async function loadLiveAgents() {
  try {
    var headers = {};
    if (_apiToken) headers['Authorization'] = 'Bearer ' + _apiToken;
    var res = await fetch('/api/agents', { headers: headers, credentials: 'include' });
    if (!res.ok) return;
    var liveAgents = await res.json();
    if (!Array.isArray(liveAgents) || !liveAgents.length) return;

    var mapped = liveAgents.map(function(a, i) {
      var protocols = [];
      try { protocols = typeof a.protocols === 'string' ? JSON.parse(a.protocols) : (a.protocols || []); } catch(e) {}
      var meta = {};
      try { meta = typeof a.metadata === 'string' ? JSON.parse(a.metadata) : (a.metadata || {}); } catch(e) {}
      var controls = {};
      try { controls = typeof a.controls === 'string' ? JSON.parse(a.controls) : (a.controls || {}); } catch(e) {}
      if (!Object.keys(controls).length) {
        controls = { soc2:'warn', iso27001:'warn', gdpr:'warn', nist:'warn', euai:'warn', hipaa:'warn', hitrust:'warn', fda_samd:'warn' };
      }
      var detectMethod = a.detect || meta.detect || 'Manual registration';
      var notesStr = meta.notes || '';
      var rgMatch = notesStr.match(/Resource Group:\s*([^|]+)/);
      var regionMatch = notesStr.match(/Region:\s*([^|]+)/);
      var rawCat = a.agent_category || 'unknown';

      var agent = {
        id: a.id || (1000 + i),
        name: a.name || 'Unknown Agent',
        type: a.type || 'agent',
        env: a.env || 'Cloud',
        protocols: protocols,
        lastSeen: a.last_seen ? new Date(a.last_seen).toLocaleString() : 'Just now',
        risk: a.risk || 'medium',
        shadow: a.shadow || false,
        detect: detectMethod,
        dataAccess: a.data_access || meta.dataAccess || null,
        pii: a.pii || false,
        phi: a.phi || false,
        domain: a.domain || meta.domain || null,
        notes: meta.notes || a.notes || '',
        controls: controls,
        firstDet: a.first_detected ? a.first_detected.split('T')[0] : new Date().toISOString().split('T')[0],
        owner: a.owner || null,
        ver: a.version || null,
        approved: a.approved_by ? true : false,
        approvedBy: a.approved_by || null,
        approvalDate: a.approval_date || null,
        quarantined: a.quarantined || false,
        hosted: a.hosted || false,
        resourceGroup: rgMatch ? rgMatch[1].trim() : null,
        region: regionMatch ? regionMatch[1].trim() : (a.region || null),
        agent_category: rawCat === 'unknown' ? classifyAgentCategory({ name: a.name, type: a.type, detect: detectMethod, protocols: protocols, env: a.env }) : rawCat,
        lifecycle_status: a.lifecycle_status || 'active',
        review_date: a.review_date || null,
        review_cadence: a.review_cadence || '90days',
        baa_status: a.baa_status || 'unknown',
        duplicate_of: a.duplicate_of || null,
        duplicate_score: a.duplicate_score || 0
      };
      return agent;
    });

    DB.agents = mapped;

    // Compute policy violations
    DB.policyViolations = [];
    mapped.forEach(function(a) {
      var ctrl = a.controls || {};
      Object.keys(ctrl).forEach(function(fw) {
        if (ctrl[fw] === 'fail') {
          DB.policyViolations.push({ id: a.id + '-' + fw, rule: fw.toUpperCase() + ' control failure', agent: a, sev: a.risk === 'critical' ? 'critical' : 'high', ts: new Date().toISOString() });
        }
      });
      if (a.shadow) {
        DB.policyViolations.push({ id: a.id + '-shadow', rule: 'Unauthorized shadow AI agent detected', agent: a, sev: 'critical', ts: new Date().toISOString() });
      }
    });

    // Approvals
    DB.approvals = mapped.filter(function(a) { return !a.approved && (a.risk === 'critical' || a.risk === 'high' || a.shadow); }).map(function(a) {
      return { id: a.id, agent: a, status: 'pending', requestedBy: 'System', requestedAt: new Date().toISOString(), reason: a.shadow ? 'Shadow AI requires approval' : 'High-risk agent requires CISO approval' };
    });

    // PHI agents
    DB.phiAgents = mapped.filter(function(a) { return a.phi || a.pii; });

    // Duplicate scores
    mapped.forEach(function(a) {
      if (a.duplicate_score > 0) return;
      var best = 0, bestId = null;
      mapped.forEach(function(b) {
        if (String(a.id) === String(b.id)) return;
        var score = dupScore(a, b);
        if (score > best) { best = score; bestId = String(b.id); }
      });
      if (best >= 75) { a.duplicate_score = best; a.duplicate_of = bestId; }
    });

    // Update mode banner
    var banner = document.getElementById('mode-banner');
    var dot = document.getElementById('mode-dot');
    var label = document.getElementById('mode-label');
    if (banner) banner.className = 'mode-banner prod';
    if (dot) { dot.style.background = '#10b981'; dot.style.animation = 'none'; }
    if (label) { label.style.color = '#065f46'; label.textContent = 'Production — ' + mapped.length + ' live agents'; }
    showExportBtn();
    showExportBtn();

    console.log('[loadLiveAgents] DB populated:', { agents: mapped.length, violations: DB.policyViolations.length, approvals: DB.approvals.length, phi: DB.phiAgents.length });

    // Re-render active view
    var activeView = document.querySelector('.view.active');
    if (activeView && viewRenderMap[currentView]) {
      try { viewRenderMap[currentView](); } catch(e) {}
    }
    updateStats();

  } catch(e) {
    console.error('[loadLiveAgents]', e.message);
  }
}

// ═══════════════════════════════════════════════════════════════
// SESSION RESTORE
// ═══════════════════════════════════════════════════════════════

fetch('/api/auth/me', { credentials: 'include' })
  .then(function(r) { return r.ok ? r.json() : null; })
  .then(function(data) {
    if (!data || !data.role) { currentRole = null; return; }
    currentRole = data.role;
    currentUser = data.name || data.email || 'User';
    _apiToken = sessionStorage.getItem('ar-token') || null;
    sessionStorage.setItem('ar-role', currentRole);
    sessionStorage.setItem('ar-user', currentUser);
    var loginScreen = document.getElementById('login-screen');
    if (loginScreen) loginScreen.classList.add('hidden');
    var nameEl = document.getElementById('login-user-name');
    var roleEl = document.getElementById('login-user-role');
    var avatarEl = document.getElementById('login-avatar');
    if (nameEl) nameEl.textContent = currentUser;
    if (roleEl) roleEl.textContent = (ROLES[currentRole] && ROLES[currentRole].label) || currentRole;
    if (avatarEl) avatarEl.textContent = currentUser.split(' ').map(function(w) { return w[0] || ''; }).join('').slice(0, 2).toUpperCase() || 'U';
    applyRBAC();
    loadLiveAgents().then(function() { go('dashboard'); });
    console.log('[session] Restored - role:', currentRole, 'user:', currentUser);
  })
  .catch(function() { currentRole = null; });

// ─── Login form keyboard handler ──────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  var pwdEl = document.getElementById('login-password');
  if (pwdEl) {
    pwdEl.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') doLogin();
    });
  }
  var emailEl = document.getElementById('login-email');
  if (emailEl) {
    emailEl.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') doLogin();
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// AGENT ACTIONS
// ═══════════════════════════════════════════════════════════════

function approveAgent(id) {
  var headers = { 'Content-Type': 'application/json' };
  if (_apiToken) headers['Authorization'] = 'Bearer ' + _apiToken;
  fetch('/api/agents/' + id + '/approve', { method: 'POST', headers: headers, credentials: 'include' })
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(data) {
      if (data) { showToast('Agent approved', 'success'); loadLiveAgents(); }
    })
    .catch(function(e) { showToast('Approval failed', 'error'); });
}

function quarantineAgent(id) {
  var headers = { 'Content-Type': 'application/json' };
  if (_apiToken) headers['Authorization'] = 'Bearer ' + _apiToken;
  fetch('/api/agents/' + id + '/quarantine', { method: 'POST', headers: headers, credentials: 'include' })
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function() { showToast('Agent quarantined', 'success'); loadLiveAgents(); })
    .catch(function() { showToast('Quarantine failed', 'error'); });
}

// ═══════════════════════════════════════════════════════════════
// DRAWER — AGENT PASSPORT
// ═══════════════════════════════════════════════════════════════

function openDrawer(idOrEl) {
  var id = typeof idOrEl === 'string' ? idOrEl : (idOrEl && idOrEl.dataset && idOrEl.dataset.id) || String(idOrEl);
  var drw = document.getElementById('drawer');
  if (drw) drw.dataset.agentId = id;
  var a = DB.agents.find(function(x) { return String(x.id) === String(id); });
  if (!a) { console.warn('[drawer] Agent not found:', id); return; }

  var ctrl = typeof a.controls === 'string' ? JSON.parse(a.controls || '{}') : (a.controls || {});
  var cat = a.agent_category || classifyAgentCategory(a);
  var catLabel = agentCategoryLabel(cat);
  var catColor = agentCategoryColor(cat);
  var lifecycle = a.lifecycle_status || 'active';
  var lcLabel = lifecycleLabel(lifecycle);
  var lcColor = lifecycleColor(lifecycle);
  var viols = (DB.policyViolations || []).filter(function(v) { return v.agent && String(v.agent.id) === String(id); });
  var rc = { critical:'#ef4444', high:'#f59e0b', medium:'#6366f1', low:'#10b981' }[a.risk] || '#6366f1';
  var protos = Array.isArray(a.protocols) ? a.protocols : [];
  var agentId = escapeHtml(String(a.id || ''));

  // Compliance rows
  var fwMap = { soc2:'SOC 2 Type II', iso27001:'ISO 27001', gdpr:'GDPR', nist:'NIST AI RMF', euai:'EU AI Act', hipaa:'HIPAA', hitrust:'HITRUST CSF', fda_samd:'FDA SaMD' };
  var fwHTML = '';
  Object.keys(fwMap).forEach(function(fw) {
    var val = ctrl[fw] || 'warn';
    var color = val === 'pass' ? '#059669' : val === 'fail' ? '#dc2626' : '#d97706';
    var bg = val === 'pass' ? '#f0fdf4' : val === 'fail' ? '#fef2f2' : '#fff7ed';
    var label = val === 'pass' ? 'PASS' : val === 'fail' ? 'FAIL' : 'WARN';
    fwHTML += '<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--glass-border-dim);font-size:12px"><span style="flex:1;color:var(--text-secondary)">' + fwMap[fw] + '</span><span style="font-size:10px;font-weight:700;padding:2px 10px;border-radius:99px;background:' + bg + ';color:' + color + '">' + label + '</span></div>';
  });

  // Violations
  var violHTML = viols.length
    ? viols.map(function(v) { return '<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--glass-border-dim);font-size:11px"><span style="width:8px;height:8px;border-radius:50%;background:#ef4444;flex-shrink:0"></span><span style="flex:1;color:var(--text-primary)">' + escapeHtml(v.rule || 'Policy violation') + '</span><span style="font-size:10px;color:#dc2626;font-weight:600">' + (v.sev || 'HIGH').toUpperCase() + '</span></div>'; }).join('')
    : '<div style="font-size:11px;color:var(--text-muted);padding:8px 0">No active policy violations</div>';

  // Related agents for blast radius
  var related = DB.agents.filter(function(b) {
    if (String(b.id) === String(id)) return false;
    var bp = Array.isArray(b.protocols) ? b.protocols : [];
    return b.env === a.env || protos.some(function(p) { return bp.indexOf(p) >= 0; }) || (b.phi && a.phi);
  }).slice(0, 6);

  var blastScore = Math.min(10, (({ critical:8, high:6, medium:4, low:2 }[a.risk] || 4) + related.length * 0.3 + (a.phi ? 1.5 : 0) + (a.shadow ? 1.5 : 0))).toFixed(1);

  // Blast SVG
  var W = 320, H = 180, cx = W / 2, cy = H / 2, br = 70;
  var svg = '<svg width="' + W + '" height="' + H + '">';
  svg += '<defs><radialGradient id="brg"><stop offset="0%" stop-color="' + rc + '" stop-opacity="0.2"/><stop offset="100%" stop-color="' + rc + '" stop-opacity="0"/></radialGradient></defs>';
  svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + br + '" fill="url(#brg)"/>';
  svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + br + '" fill="none" stroke="' + rc + '" stroke-width="0.5" stroke-dasharray="4 4" opacity="0.4"/>';
  related.forEach(function(b, i) {
    var angle = (i / Math.max(related.length, 1)) * 2 * Math.PI - Math.PI / 2;
    var nx = Math.round(cx + (br - 10) * Math.cos(angle));
    var ny = Math.round(cy + (br - 10) * Math.sin(angle));
    var bc = { critical:'#ef4444', high:'#f59e0b', medium:'#6366f1', low:'#10b981' }[b.risk] || '#6366f1';
    svg += '<line x1="' + cx + '" y1="' + cy + '" x2="' + nx + '" y2="' + ny + '" stroke="' + rc + '" stroke-width="0.8" opacity="0.3"/>';
    svg += '<circle cx="' + nx + '" cy="' + ny + '" r="8" fill="' + bc + '22" stroke="' + bc + '" stroke-width="1"/>';
    svg += '<circle cx="' + nx + '" cy="' + ny + '" r="4" fill="' + bc + '"/>';
  });
  svg += '<circle cx="' + cx + '" cy="' + cy + '" r="18" fill="' + rc + '22" stroke="' + rc + '" stroke-width="2"/>';
  svg += '<circle cx="' + cx + '" cy="' + cy + '" r="10" fill="' + rc + '"/>';
  svg += '<text x="8" y="20" font-size="8" fill="var(--text-muted)">BLAST SCORE</text>';
  svg += '<text x="8" y="34" font-size="16" font-weight="600" fill="' + rc + '">' + blastScore + '</text>';
  svg += '</svg>';

  // Alert banner
  var alertHTML = '';
  if (a.phi && ctrl.hipaa === 'fail') {
    alertHTML = '<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:11px;color:#dc2626">&#9888; PHI agent with failing HIPAA controls - BAA required immediately</div>';
  } else if (a.shadow) {
    alertHTML = '<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:11px;color:#c2410c">&#9888; Shadow AI detected - not registered or approved. Immediate review required.</div>';
  }

  // Info cell helper
  function iCell(label, val, color) {
    return '<div style="background:var(--bg-secondary);border:1px solid var(--glass-border-dim);border-radius:8px;padding:10px 12px"><div style="font-size:10px;color:var(--text-muted);margin-bottom:3px">' + label + '</div><div style="font-size:12px;font-weight:600;color:' + (color || 'var(--text-primary)') + '">' + val + '</div></div>';
  }

  var ownerInitials = a.owner ? a.owner.split(' ').map(function(w) { return w[0] || ''; }).join('').slice(0, 2).toUpperCase() : '?';

  // Build HTML
  var h = '';

  // Header
  h += '<div style="padding:16px 20px 12px;border-bottom:1px solid var(--glass-border-dim)">';
  h += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">';
  h += '<div style="width:10px;height:10px;border-radius:50%;background:' + rc + ';flex-shrink:0"></div>';
  h += '<div style="flex:1"><div style="font-size:16px;font-weight:700;color:var(--text-primary)">' + escapeHtml(a.name || '') + '</div>';
  h += '<div style="font-size:11px;color:var(--text-muted);margin-top:2px">ID: ' + agentId + ' &middot; ' + escapeHtml(a.env || 'Cloud') + ' &middot; First seen: ' + escapeHtml(a.firstDet || '') + '</div></div></div>';
  h += '<div style="display:flex;gap:5px;flex-wrap:wrap">';
  h += '<span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:99px;background:' + rc + '18;color:' + rc + '">' + (a.risk || 'medium').toUpperCase() + ' RISK</span>';
  h += '<span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:99px;background:' + catColor + '18;color:' + catColor + '">' + catLabel + '</span>';
  h += '<span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:99px;background:var(--bg-secondary);color:' + lcColor + '">' + lcLabel + '</span>';
  if (a.phi) h += '<span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:99px;background:#fef2f2;color:#dc2626">PHI</span>';
  if (a.shadow) h += '<span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:99px;background:#fff7ed;color:#c2410c">SHADOW AI</span>';
  if (a.approved) h += '<span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:99px;background:#f0fdf4;color:#059669">APPROVED</span>';
  else h += '<span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:99px;background:#fff7ed;color:#d97706">PENDING</span>';
  h += '</div></div>';

  // Tabs
  h += '<div class="drw2-tabs">';
  h += '<div class="drw2-tab active" data-tab="overview" onclick="switchAnatomyTab(this.dataset.tab,this)">OVERVIEW<small>Agent passport</small></div>';
  h += '<div class="drw2-tab" data-tab="dataaccess" onclick="switchAnatomyTab(this.dataset.tab,this)">DATA ACCESS<small>What it can touch</small></div>';
  h += '<div class="drw2-tab" data-tab="compliance" onclick="switchAnatomyTab(this.dataset.tab,this)">COMPLIANCE<small>8 frameworks</small></div>';
  h += '<div class="drw2-tab" data-tab="ownership" onclick="switchAnatomyTab(this.dataset.tab,this)">OWNERSHIP<small>Who owns it</small></div>';
  h += '<div class="drw2-tab" data-tab="blastradius" onclick="switchAnatomyTab(this.dataset.tab,this)">BLAST RADIUS<small>Attack surface</small></div>';
  h += '</div>';

  h += '<div class="drw2-body" style="display:block;overflow-y:auto;padding:16px 20px">';

  // OVERVIEW TAB
  h += '<div class="anatomy-tab-content active" id="tab-overview">';
  h += alertHTML;
  h += '<div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Agent profile</div>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">';
  h += iCell('Category', catLabel, catColor);
  h += iCell('Lifecycle', lcLabel, lcColor);
  h += iCell('Environment', escapeHtml(a.env || 'Cloud'));
  h += iCell('Detection', escapeHtml(a.detect || 'Manual'));
  h += iCell('Owner', escapeHtml(a.owner || 'Unassigned'), a.owner ? 'var(--text-primary)' : '#dc2626');
  h += iCell('Last reviewed', a.review_date ? new Date(a.review_date).toLocaleDateString() : 'Never reviewed', a.review_date ? 'var(--text-primary)' : '#dc2626');
  h += '</div>';
  if (viols.length) { h += '<div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Policy violations (' + viols.length + ')</div>' + violHTML; }
  h += '<div style="display:flex;gap:8px;margin-top:14px;padding-top:14px;border-top:1px solid var(--glass-border-dim)">';
  h += '<button class="btn sm" data-id="' + agentId + '" onclick="approveAgent(this.dataset.id)">Approve</button>';
  h += '<button class="btn sm secondary" onclick="go(this.dataset.view)" data-view="policy">View violations</button>';
  h += '<button class="btn sm danger" data-id="' + agentId + '" onclick="quarantineAgent(this.dataset.id)">Quarantine</button>';
  h += '</div></div>';

  // DATA ACCESS TAB
  h += '<div class="anatomy-tab-content" id="tab-dataaccess">';
  h += '<div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Data scope</div>';
  h += '<div style="background:var(--bg-secondary);border:1px solid var(--glass-border-dim);border-radius:8px;padding:12px;margin-bottom:12px">';
  h += '<div style="font-size:12px;color:var(--text-primary);margin-bottom:8px">' + escapeHtml(a.dataAccess || 'No data scope defined') + '</div>';
  if (a.phi) h += '<span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:99px;background:#fef2f2;color:#dc2626">Contains PHI - HIPAA regulated</span> ';
  if (a.pii) h += '<span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:99px;background:#faf5ff;color:#7c3aed">Contains PII - GDPR regulated</span>';
  h += '</div>';
  h += '<div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Protocols</div>';
  h += protos.length ? protos.map(function(p) {
    var isHC = ['HL7 v2','FHIR R4','DICOM','MLLP'].indexOf(p) >= 0;
    return '<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--glass-border-dim);font-size:11px"><span style="width:8px;height:8px;border-radius:50%;background:' + (isHC ? '#8b5cf6' : '#3b82f6') + ';flex-shrink:0"></span><span style="flex:1;color:var(--text-primary)">' + escapeHtml(p) + '</span><span style="font-size:10px;color:' + (isHC ? '#7c3aed' : '#2563eb') + ';font-weight:600">' + (isHC ? 'Healthcare' : 'Standard') + '</span></div>';
  }).join('') : '<div style="font-size:11px;color:var(--text-muted);padding:8px 0">No protocols registered</div>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px">';
  h += iCell('Region', escapeHtml(a.region || 'Unknown'));
  var baaVal = a.baa_status === 'signed' ? 'Signed' : a.baa_status === 'required' ? 'Required - missing' : 'Unknown';
  var baaColor = a.baa_status === 'signed' ? '#059669' : a.baa_status === 'required' ? '#dc2626' : '#d97706';
  h += iCell('BAA status', baaVal, baaColor);
  h += iCell('Resource group', escapeHtml(a.resourceGroup || 'Unknown'));
  h += iCell('Version', escapeHtml(a.ver || 'Unknown'));
  h += '</div></div>';

  // COMPLIANCE TAB
  h += '<div class="anatomy-tab-content" id="tab-compliance">';
  h += '<div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Framework compliance</div>';
  h += fwHTML;
  h += '</div>';

  // OWNERSHIP TAB
  h += '<div class="anatomy-tab-content" id="tab-ownership">';
  h += '<div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Agent owner</div>';
  h += '<div style="background:var(--bg-secondary);border:1px solid var(--glass-border-dim);border-radius:8px;padding:12px;margin-bottom:12px;display:flex;align-items:center;gap:10px">';
  h += '<div style="width:36px;height:36px;border-radius:50%;background:var(--brand-bg);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:var(--brand);flex-shrink:0">' + ownerInitials + '</div>';
  h += '<div style="flex:1"><div style="font-size:13px;font-weight:700;color:' + (a.owner ? 'var(--text-primary)' : '#dc2626') + '">' + escapeHtml(a.owner || 'Unassigned') + '</div>';
  h += '<div style="font-size:11px;color:var(--text-muted)">' + (a.owner ? 'Agent owner' : 'No owner assigned') + '</div></div>';
  h += '<button class="btn sm secondary">Assign</button></div>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">';
  h += iCell('Review cadence', escapeHtml(a.review_cadence || '90 days'));
  h += iCell('Last reviewed', a.review_date ? new Date(a.review_date).toLocaleDateString() : 'Never', a.review_date ? 'var(--text-primary)' : '#dc2626');
  h += iCell('Approved by', escapeHtml(a.approvedBy || 'Not approved'), a.approvedBy ? 'var(--text-primary)' : '#dc2626');
  h += iCell('Approval date', a.approvalDate ? new Date(a.approvalDate).toLocaleDateString() : 'N/A');
  h += '</div></div>';

  // BLAST RADIUS TAB
  h += '<div class="anatomy-tab-content" id="tab-blastradius">';
  h += '<div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Blast radius</div>';
  h += '<div style="display:flex;align-items:center;gap:12px;background:var(--bg-secondary);border:1px solid var(--glass-border-dim);border-radius:8px;padding:12px;margin-bottom:12px">';
  h += '<div style="font-size:28px;font-weight:700;color:' + rc + '">' + blastScore + '</div>';
  h += '<div><div style="font-size:12px;font-weight:700;color:var(--text-primary)">' + (parseFloat(blastScore) >= 8 ? 'Severe' : parseFloat(blastScore) >= 6 ? 'High' : parseFloat(blastScore) >= 4 ? 'Medium' : 'Low') + ' blast radius</div>';
  h += '<div style="font-size:11px;color:var(--text-muted);margin-top:2px">' + related.length + ' systems exposed if compromised</div></div></div>';
  h += '<div style="text-align:center;margin-bottom:12px">' + svg + '</div>';
  h += '<div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Exposed systems</div>';
  h += related.length ? related.map(function(b) {
    var bc = { critical:'#ef4444', high:'#f59e0b', medium:'#6366f1', low:'#10b981' }[b.risk] || '#6366f1';
    return '<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--glass-border-dim);font-size:11px"><span style="width:8px;height:8px;border-radius:50%;background:' + bc + ';flex-shrink:0"></span><span style="flex:1;color:var(--text-primary)">' + escapeHtml(b.name) + '</span><span style="font-size:10px;font-weight:600;color:' + bc + '">' + (b.risk || '').toUpperCase() + '</span></div>';
  }).join('') : '<div style="font-size:11px;color:var(--text-muted);padding:8px 0">No connected systems detected</div>';
  if (a.phi) h += '<div style="margin-top:12px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 12px;font-size:11px;color:#dc2626"><strong>Regulatory impact:</strong> HIPAA breach notification required within 60 days. Potential fine: $100K-$1.9M.</div>';
  h += '<div style="display:flex;gap:8px;margin-top:14px;padding-top:14px;border-top:1px solid var(--glass-border-dim)">';
  h += '<button class="btn sm danger" data-id="' + agentId + '" onclick="quarantineAgent(this.dataset.id)">Quarantine now</button>';
  h += '<button class="btn sm secondary" onclick="go(this.dataset.view)" data-view="ciso">Generate CISO report</button>';
  h += '</div></div>';

  h += '</div>';

  var el = document.getElementById('drawer');
  if (!el) return;
  el.innerHTML = h;
  el.classList.add('open');
  var bd = document.getElementById('drawer-backdrop');
  if (bd) bd.classList.add('show');
}

function closeDrawer() {
  var drw = document.getElementById('drawer');
  var bd = document.getElementById('drawer-backdrop');
  if (drw) drw.classList.remove('open');
  if (bd) bd.classList.remove('show');
}

function switchAnatomyTab(tab, el) {
  document.querySelectorAll('.drw2-tab').forEach(function(t) { t.classList.remove('active'); });
  document.querySelectorAll('.anatomy-tab-content').forEach(function(t) { t.classList.remove('active'); });
  if (el) el.classList.add('active');
  var tc = document.getElementById('tab-' + tab);
  if (tc) tc.classList.add('active');
}

// ═══════════════════════════════════════════════════════════════
// DISCOVERY TABLE
// ═══════════════════════════════════════════════════════════════

function setEF(e, el) { ef = e; document.querySelectorAll('.filter-bar .filter-pill').forEach(function(p) { p.classList.remove('on'); }); if (el) el.classList.add('on'); renderDisc(); }
function setTF(t, el) { tf = t; document.querySelectorAll('#type-btns .filter-pill').forEach(function(p) { p.classList.remove('on'); }); if (el) el.classList.add('on'); renderDisc(); }
function setRF(f, el) { rf = f; document.querySelectorAll('#risk-pills .filter-pill').forEach(function(p) { p.classList.remove('on'); }); if (el) el.classList.add('on'); renderRisk(); }

function renderDisc() {
  var list = DB.agents.filter(function(a) {
    if (ef !== 'all' && a.env !== ef) return false;
    if (tf !== 'all' && a.type !== tf) return false;
    return true;
  });

  // Build duplicate map
  var dupMap = {};
  list.forEach(function(a) {
    if (a.duplicate_score >= 75 && a.duplicate_of) {
      dupMap[a.id] = { score: a.duplicate_score, ofId: a.duplicate_of };
    }
  });

  var tb = document.getElementById('disc-tbody');
  if (!tb) return;

  tb.innerHTML = list.map(function(a) {
    var id = String(a.id || '').replace(/"/g, '');
    var cat = a.agent_category || classifyAgentCategory(a);
    var catColor = agentCategoryColor(cat);
    var catLabel = agentCategoryLabel(cat);
    var lifecycle = a.lifecycle_status || 'active';
    var lcColor = lifecycleColor(lifecycle);
    var lcLabel = lifecycleLabel(lifecycle);
    var dup = dupMap[a.id];

    var dupCell = dup
      ? '<span style="font-size:10px;font-weight:600;color:#f59e0b;background:#fff7ed;border:1px solid #fed7aa;padding:2px 7px;border-radius:99px">&#9889; ' + dup.score + '% match</span>'
      : '<span style="font-size:10px;color:var(--text-muted)">&#8212;</span>';

    var nameCell = '<span style="font-weight:700;color:var(--text-primary)">' + escapeHtml(a.name || '') + '</span>'
      + (a.phi ? ' <span style="font-size:9px;font-weight:700;background:#fee2e2;color:#dc2626;border-radius:3px;padding:1px 4px">PHI</span>' : '')
      + (a.shadow ? ' <span style="font-size:9px;font-weight:700;background:#fff7ed;color:#c2410c;border-radius:3px;padding:1px 4px">SHADOW</span>' : '');

    var ownerCell = a.owner
      ? '<span style="font-size:11px;color:var(--text-secondary)">' + escapeHtml(a.owner) + '</span>'
      : '<span style="font-size:10px;color:#dc2626">Unassigned</span>';

    var statusCell = a.shadow
      ? '<span style="font-size:10px;font-weight:600;color:#dc2626">Shadow AI</span>'
      : a.approved
        ? '<span style="font-size:10px;font-weight:600;color:#059669">Approved</span>'
        : '<span style="font-size:10px;font-weight:600;color:#d97706">Pending</span>';

    var rowStyle = (a.shadow ? 'border-left:3px solid #ef4444;' : '') + (dup ? 'background:rgba(251,191,36,0.04);' : '');

    var row = '<tr onclick="openDrawer(this.dataset.id)" data-id="' + id + '" style="' + rowStyle + '">';
    row += '<td>' + nameCell + '</td>';
    row += '<td><span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:99px;background:' + catColor + '18;color:' + catColor + '">' + catLabel + '</span></td>';
    row += '<td style="font-size:11px;color:var(--text-muted)">' + escapeHtml(a.type || 'AI Agent') + '</td>';
    row += '<td>' + envTag(a.env) + '</td>';
    row += '<td style="font-size:11px;color:var(--text-muted);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escapeHtml(a.dataAccess || '&#8212;') + '</td>';
    row += '<td>' + ownerCell + '</td>';
    row += '<td style="font-size:11px;color:var(--text-muted)">' + escapeHtml(a.lastSeen || '') + '</td>';
    row += '<td>' + rtag(a.risk) + '</td>';
    row += '<td><span style="font-size:10px;font-weight:600;color:' + lcColor + '">' + lcLabel + '</span></td>';
    row += '<td>' + dupCell + '</td>';
    row += '<td>' + statusCell + '</td>';
    row += '</tr>';
    return row;
  }).join('');

  updateStats();

  // Background scan status
  if (!currentRole) return;
  fetch('/api/scan/background/status', { credentials: 'include' })
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(data) {
      if (!data) return;
      var el = document.getElementById('bg-scan-status');
      if (!el) return;
      var nextRun = data.nextRunIn || 'soon';
      el.innerHTML = '<span style="color:#10b981">&#9679;</span> Background scanner active &middot; Next: ' + nextRun;
    })
    .catch(function() {});
}

// ═══════════════════════════════════════════════════════════════
// SHADOW VIEW
// ═══════════════════════════════════════════════════════════════

function renderShadow() {
  var list = DB.agents.filter(function(a) { return a.shadow; });
  var el_n = document.getElementById('shd-n');
  var el_pii = document.getElementById('shd-pii');
  var el_meth = document.getElementById('shd-meth');
  var el_avg = document.getElementById('shd-avg');
  if (el_n) el_n.textContent = list.length;
  if (el_pii) el_pii.textContent = list.filter(function(a) { return a.pii; }).length;
  if (el_meth) el_meth.textContent = list.length > 0 ? [...new Set(list.map(function(a) { return a.detect; }))].length : 0;
  var sm = { critical:100, high:75, medium:50, low:25 };
  if (el_avg) el_avg.textContent = list.length ? Math.round(list.reduce(function(acc, a) { return acc + (sm[a.risk] || 0); }, 0) / list.length) : '&#8212;';

  var tb = document.getElementById('shadow-tbody');
  if (!tb) return;
  var vs = (DB.policyViolations || []).filter(function(v) { return v.agent && v.agent.shadow; });
  tb.innerHTML = list.map(function(a) {
    var id = String(a.id || '').replace(/"/g, '');
    var row = '<tr onclick="openDrawer(this.dataset.id)" data-id="' + id + '" style="border-left:3px solid #ef4444">';
    row += '<td style="font-weight:700;color:var(--text-primary)">' + escapeHtml(a.name || '') + '</td>';
    row += '<td style="font-size:11px;color:var(--text-muted)">' + escapeHtml(a.detect || '') + '</td>';
    row += '<td>' + envTag(a.env) + '</td>';
    row += '<td style="font-size:11px;color:var(--text-muted)">' + escapeHtml(a.dataAccess || '') + '</td>';
    row += '<td style="font-size:11px;color:var(--text-muted)">' + escapeHtml(a.firstDet || '') + '</td>';
    row += '<td>' + rtag(a.risk) + '</td>';
    row += '<td><button class="btn danger sm" data-id="' + id + '" onclick="event.stopPropagation();quarantineAgent(this.dataset.id)" style="font-size:10px;padding:2px 8px">Quarantine</button></td>';
    row += '<td><span class="shadow-tag">Shadow</span></td>';
    row += '</tr>';
    return row;
  }).join('');

  var vl = document.getElementById('policy-viols');
  if (vl) vl.innerHTML = vs.length
    ? vs.map(function(v) { return '<div class="risk-item" onclick="openDrawer(this.dataset.id)" data-id="' + escapeHtml(String(v.agent.id)) + '"><div class="risk-item-row"><span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;background:#fef2f2;color:#dc2626">CRITICAL</span><span style="font-size:11px;font-weight:700;color:var(--text-primary)">' + escapeHtml(v.agent.name || '') + '</span></div><div style="font-size:11px;color:var(--text-muted);margin-top:2px">' + escapeHtml(v.rule || '') + '</div></div>'; }).join('')
    : '<div style="font-size:11px;color:var(--text-muted);padding:8px 0">No shadow AI violations</div>';
}

// ═══════════════════════════════════════════════════════════════
// PHI VIEW
// ═══════════════════════════════════════════════════════════════

function renderPhi() {
  var list = DB.agents.filter(function(a) { return a.phi || a.pii; });
  var noBaa = list.filter(function(a) { return !a.controls || a.controls.hipaa === 'fail'; });
  var unenc = list.filter(function(a) { return a.controls && a.controls.encryption === 'fail'; });
  var compliant = list.filter(function(a) { return a.controls && a.controls.hipaa === 'pass'; });

  function setEl(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }
  setEl('phi-n', list.length);
  setEl('phi-nobaa', noBaa.length);
  setEl('phi-noenc', unenc.length);
  setEl('phi-ok', compliant.length);

  var tb = document.getElementById('phi-tbody');
  if (!tb) return;
  if (!list.length) {
    tb.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--text-muted)">No PHI agents detected</td></tr>';
    return;
  }
  tb.innerHTML = list.map(function(a) {
    var hipaa = (a.controls && a.controls.hipaa) || 'warn';
    var enc = (a.controls && a.controls.encryption) || 'warn';
    var hipaaColor = hipaa === 'pass' ? '#10b981' : hipaa === 'fail' ? '#ef4444' : '#f59e0b';
    var encColor = enc === 'pass' ? '#10b981' : enc === 'fail' ? '#ef4444' : '#f59e0b';
    var id = String(a.id || '').replace(/"/g, '');
    var ctrl = a.controls || {};
    var score = Object.keys(ctrl).length ? Math.round(Object.values(ctrl).filter(function(v) { return v === 'pass'; }).length / Object.keys(ctrl).length * 100) : 0;
    var row = '<tr onclick="openDrawer(this.dataset.id)" data-id="' + id + '">';
    row += '<td style="font-weight:700">' + escapeHtml(a.name || '') + '</td>';
    row += '<td style="font-size:11px;color:var(--text-muted)">' + escapeHtml(a.domain || a.env || '') + '</td>';
    row += '<td style="font-size:11px;color:var(--text-muted)">' + (a.protocols || []).slice(0, 2).join(', ') + '</td>';
    row += '<td><span style="font-size:10px;font-weight:700;color:' + hipaaColor + '">' + hipaa.toUpperCase() + '</span></td>';
    row += '<td><span style="font-size:10px;font-weight:700;color:' + encColor + '">' + enc.toUpperCase() + '</span></td>';
    row += '<td>' + score + '%</td>';
    row += '<td style="font-size:11px;color:var(--text-muted)">' + escapeHtml(a.lastSeen || '') + '</td>';
    row += '<td>' + rtag(a.risk) + '</td>';
    row += '</tr>';
    return row;
  }).join('');
}

// ═══════════════════════════════════════════════════════════════
// MODELS VIEW
// ═══════════════════════════════════════════════════════════════

function renderModels() {
  var tb = document.getElementById('models-tbody');
  if (!tb) return;
  var agents = DB.agents.filter(function(a) { return a.type === 'model'; });
  if (!agents.length) agents = DB.agents.slice(0, 10);
  var rows = '';
  agents.forEach(function(a) {
    var id = String(a.id || '').replace(/"/g, '');
    rows += '<tr onclick="openDrawer(this.dataset.id)" data-id="' + id + '">';
    rows += '<td style="font-weight:700">' + escapeHtml(a.name || '') + '</td>';
    rows += '<td style="font-size:11px;color:var(--text-muted)">' + escapeHtml(a.type || 'LLM') + '</td>';
    rows += '<td>' + envTag(a.env) + '</td>';
    rows += '<td>' + rtag(a.risk) + '</td>';
    rows += '<td style="font-size:11px;color:var(--text-muted)">' + escapeHtml(a.hosted ? 'Self-hosted' : 'Cloud') + '</td>';
    rows += '</tr>';
  });
  tb.innerHTML = rows;
}

// ═══════════════════════════════════════════════════════════════
// RISK VIEW
// ═══════════════════════════════════════════════════════════════

function renderRisk() {
  var agents = DB.agents;
  var filtered = rf === 'all' ? agents : agents.filter(function(a) { return a.risk === rf; });
  var el = document.getElementById('risk-list');
  if (!el) return;
  el.innerHTML = filtered.map(function(a) {
    var id = String(a.id || '').replace(/"/g, '');
    var rc = { critical:'#ef4444', high:'#f59e0b', medium:'#6366f1', low:'#10b981' }[a.risk] || '#6366f1';
    return '<div onclick="openDrawer(this.dataset.id)" data-id="' + id + '" style="cursor:pointer;padding:12px 16px;border-bottom:1px solid var(--glass-border-dim);display:flex;align-items:center;gap:12px">'
      + '<div style="width:8px;height:8px;border-radius:50%;background:' + rc + ';flex-shrink:0"></div>'
      + '<div style="flex:1"><div style="font-size:13px;font-weight:600;color:var(--text-primary)">' + escapeHtml(a.name || '') + '</div>'
      + '<div style="font-size:11px;color:var(--text-muted);margin-top:2px">' + escapeHtml(a.env || '') + ' &middot; ' + escapeHtml(a.detect || '') + '</div></div>'
      + '<div>' + rtag(a.risk) + '</div>'
      + '</div>';
  }).join('');
}

// ═══════════════════════════════════════════════════════════════
// COMPLIANCE VIEW
// ═══════════════════════════════════════════════════════════════

function renderComp() {
  var A = DB.agents;
  if (typeof cfFilter === 'undefined') cfFilter = 'all';
  var FW = ['soc2','iso27001','gdpr','nist','euai','hipaa','hitrust','fda_samd'];
  var FW_LABELS = { soc2:'SOC 2', iso27001:'ISO 27001', gdpr:'GDPR', nist:'NIST AI RMF', euai:'EU AI Act', hipaa:'HIPAA', hitrust:'HITRUST', fda_samd:'FDA SaMD' };
  var tb = document.getElementById('comp-tbody');
  if (!tb) return;
  tb.innerHTML = A.map(function(a) {
    var ctrl = a.controls || {};
    var id = String(a.id || '').replace(/"/g, '');
    var pass = FW.filter(function(fw) { return ctrl[fw] === 'pass'; }).length;
    var score = Math.round(pass / FW.length * 100);
    var scoreColor = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
    var row = '<tr onclick="openDrawer(this.dataset.id)" data-id="' + id + '">';
    row += '<td style="font-weight:700">' + escapeHtml(a.name || '') + '</td>';
    row += '<td style="font-size:11px;color:var(--text-muted)">' + escapeHtml(a.type || '') + '</td>';
    FW.forEach(function(fw) {
      var val = ctrl[fw] || 'warn';
      var color = val === 'pass' ? '#10b981' : val === 'fail' ? '#ef4444' : '#f59e0b';
      row += '<td><span style="font-size:9px;font-weight:700;color:' + color + '">' + val.toUpperCase() + '</span></td>';
    });
    row += '<td><span style="font-size:11px;font-weight:700;color:' + scoreColor + '">' + score + '%</span></td>';
    row += '</tr>';
    return row;
  }).join('');
}

// ═══════════════════════════════════════════════════════════════
// POLICY VIEW
// ═══════════════════════════════════════════════════════════════

function renderPolicy() {
  var el = document.getElementById('policy-viols') || document.getElementById('policy-list');
  if (!el) return;
  var viols = DB.policyViolations || [];
  el.innerHTML = viols.length
    ? viols.map(function(v) {
        return '<div style="padding:10px 16px;border-bottom:1px solid var(--glass-border-dim)">'
          + '<div style="font-size:12px;font-weight:700;color:#dc2626">' + escapeHtml(v.rule || 'Policy violation') + '</div>'
          + '<div style="font-size:11px;color:var(--text-muted)">Agent: ' + escapeHtml(v.agent && v.agent.name || 'Unknown') + '</div>'
          + '</div>';
      }).join('')
    : '<div style="padding:20px;text-align:center;font-size:12px;color:var(--text-muted)">No active policy violations</div>';
}

// ═══════════════════════════════════════════════════════════════
// APPROVALS VIEW
// ═══════════════════════════════════════════════════════════════

function renderApprovals() {
  var list = DB.approvals || [];
  var tb = document.getElementById('appr-list') || document.querySelector('#view-approvals tbody');
  if (!tb) return;
  if (!list.length) {
    tb.innerHTML = '<div style="padding:32px;text-align:center;color:var(--text-muted);font-size:13px">No pending approvals</div>';
    return;
  }
  tb.innerHTML = list.map(function(item) {
    var a = item.agent || {};
    var id = String(a.id || '').replace(/"/g, '');
    var rc = { critical:'#ef4444', high:'#f59e0b', medium:'#6366f1', low:'#10b981' }[a.risk] || '#6366f1';
    return '<div style="padding:12px 16px;border-bottom:1px solid var(--glass-border-dim);display:flex;align-items:center;gap:12px">'
      + '<div style="flex:1"><div style="font-size:13px;font-weight:600;color:var(--text-primary)">' + escapeHtml(a.name || 'Unknown') + '</div>'
      + '<div style="font-size:11px;color:var(--text-muted);margin-top:2px">' + escapeHtml(item.reason || 'Requires approval') + '</div></div>'
      + '<span style="font-size:10px;font-weight:700;color:' + rc + '">' + (a.risk || '').toUpperCase() + '</span>'
      + '<button class="btn sm" data-id="' + id + '" onclick="approveAgent(this.dataset.id)">Approve</button>'
      + '<button class="btn sm danger" data-id="' + id + '" onclick="quarantineAgent(this.dataset.id)">Reject</button>'
      + '</div>';
  }).join('');
}

// ═══════════════════════════════════════════════════════════════
// PLAYBOOKS VIEW
// ═══════════════════════════════════════════════════════════════

function renderPlaybooks() {
  var el = document.getElementById('playbooks-list') || document.querySelector('#view-playbooks .card-body');
  if (!el) return;
  var playbooks = [
    { name:'Shadow AI Containment', trigger:'Shadow agent detected', steps:5, status:'active' },
    { name:'PHI Breach Response', trigger:'PHI exposure without BAA', steps:8, status:'active' },
    { name:'Critical Risk Escalation', trigger:'Critical risk agent found', steps:4, status:'active' },
    { name:'GDPR Violation Response', trigger:'GDPR control failure', steps:6, status:'draft' },
    { name:'Dormant Agent Cleanup', trigger:'Agent inactive 30+ days', steps:3, status:'active' }
  ];
  el.innerHTML = playbooks.map(function(p) {
    return '<div style="padding:12px 16px;border-bottom:1px solid var(--glass-border-dim);display:flex;align-items:center;gap:12px">'
      + '<div style="flex:1"><div style="font-size:13px;font-weight:700;color:var(--text-primary)">' + escapeHtml(p.name) + '</div>'
      + '<div style="font-size:11px;color:var(--text-muted);margin-top:2px">Trigger: ' + escapeHtml(p.trigger) + ' &middot; ' + p.steps + ' steps</div></div>'
      + '<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;background:' + (p.status === 'active' ? '#f0fdf4' : 'var(--bg-secondary)') + ';color:' + (p.status === 'active' ? '#059669' : 'var(--text-muted)') + '">' + p.status + '</span>'
      + '</div>';
  }).join('');
}

// ═══════════════════════════════════════════════════════════════
// BENCHMARK VIEW
// ═══════════════════════════════════════════════════════════════

function renderBench() {
  var agents = DB.agents;
  console.log('[renderBench] agents:', agents.length, 'apiMode: true');
  var yours = agents.length ? Math.round(agents.filter(function(a) { return a.risk === 'critical' || a.risk === 'high'; }).length / agents.length * 100) : 0;
  var avg = 45;
  var el_yours = document.getElementById('bm-yours');
  var el_avg = document.getElementById('bm-avg');
  var el_pct = document.getElementById('bm-pct');
  if (el_yours) el_yours.textContent = yours + '%';
  if (el_avg) el_avg.textContent = avg + '%';
  if (el_pct) el_pct.textContent = yours < avg ? 'Better than average' : 'Above average risk';
  var el_list = document.getElementById('bm-list');
  if (el_list) {
    el_list.innerHTML = [
      { label: 'Shadow AI detection rate', yours: agents.filter(function(a) { return a.shadow; }).length, peer: '3-5 avg' },
      { label: 'PHI agents with BAA', yours: DB.phiAgents.filter(function(a) { return a.baa_status === 'signed'; }).length + '/' + DB.phiAgents.length, peer: '80% have BAA' },
      { label: 'Policy violations', yours: DB.policyViolations.length, peer: '< 10 is good' },
      { label: 'Agents pending approval', yours: DB.approvals.length, peer: '< 5 is good' }
    ].map(function(b) {
      return '<div style="padding:10px 0;border-bottom:1px solid var(--glass-border-dim);display:flex;align-items:center">'
        + '<div style="flex:1;font-size:12px;color:var(--text-primary)">' + b.label + '</div>'
        + '<div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-right:12px">' + b.yours + '</div>'
        + '<div style="font-size:11px;color:var(--text-muted)">' + b.peer + '</div>'
        + '</div>';
    }).join('');
  }
}

// ═══════════════════════════════════════════════════════════════
// NOTIFICATIONS VIEW
// ═══════════════════════════════════════════════════════════════

function renderNotif() {
  var el = document.getElementById('notif-list') || document.querySelector('#view-notifications .card-body');
  if (!el) return;
  var notifs = DB.notifications && DB.notifications.length ? DB.notifications : [
    { title: 'Shadow AI detected', body: '4 unregistered agents found in Azure East US', type: 'critical', ts: 'Today 09:14' },
    { title: 'PHI exposure alert', body: '19 agents accessing PHI — BAA review required', type: 'high', ts: 'Today 09:15' },
    { title: 'Policy violation', body: '32 active violations need remediation', type: 'warn', ts: 'Today 09:16' }
  ];
  el.innerHTML = notifs.map(function(n) {
    var color = n.type === 'critical' ? '#ef4444' : n.type === 'high' ? '#f59e0b' : '#6366f1';
    return '<div style="padding:12px 16px;border-bottom:1px solid var(--glass-border-dim);border-left:3px solid ' + color + ';margin-bottom:4px">'
      + '<div style="font-size:13px;font-weight:600;color:var(--text-primary)">' + escapeHtml(n.title || '') + '</div>'
      + '<div style="font-size:11px;color:var(--text-muted);margin-top:2px">' + escapeHtml(n.body || '') + '</div>'
      + '<div style="font-size:10px;color:var(--text-muted);margin-top:4px">' + escapeHtml(n.ts || '') + '</div>'
      + '</div>';
  }).join('');
}

// ═══════════════════════════════════════════════════════════════
// ACTIVITY VIEW
// ═══════════════════════════════════════════════════════════════

function renderActivity() {
  var el = document.getElementById('act-tl');
  if (!el) return;
  var activity = DB.activity && DB.activity.length ? DB.activity : [
    { action: 'Platform initialized', actor: 'System', ts: 'Just now', color: '#10b981' }
  ];
  el.innerHTML = activity.map(function(e) {
    return '<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--glass-border-dim)">'
      + '<div style="width:8px;height:8px;border-radius:50%;background:' + (e.color || '#6366f1') + ';flex-shrink:0;margin-top:3px"></div>'
      + '<div style="flex:1"><div style="font-size:12px;color:var(--text-primary)">' + escapeHtml(e.action || '') + '</div>'
      + '<div style="font-size:10px;color:var(--text-muted)">' + escapeHtml(e.actor || '') + ' &middot; ' + escapeHtml(e.ts || '') + '</div></div>'
      + '</div>';
  }).join('');
}

// ═══════════════════════════════════════════════════════════════
// CISO VIEW
// ═══════════════════════════════════════════════════════════════

function renderCiso() {
  var agents = DB.agents;
  var shadow = agents.filter(function(a) { return a.shadow; });
  var phi = agents.filter(function(a) { return a.phi; });
  var crit = agents.filter(function(a) { return a.risk === 'critical'; });
  var viols = DB.policyViolations || [];

  var el = document.getElementById('ciso-alerts');
  if (el) {
    el.innerHTML = [
      crit.length ? { t:'red', title: crit.length + ' critical-risk agents require immediate attention', body: crit.map(function(a) { return a.name; }).join(', ') } : null,
      shadow.length ? { t:'red', title: shadow.length + ' shadow AI agents detected', body: 'Unregistered agents operating without approval' } : null,
      phi.length ? { t:'amber', title: phi.length + ' agents accessing PHI', body: 'HIPAA compliance review required for all PHI agents' } : null,
      viols.length ? { t:'amber', title: viols.length + ' active policy violations', body: 'Remediation required to maintain compliance posture' } : null
    ].filter(Boolean).map(function(a) {
      return '<div class="alert-banner ' + (a.t === 'amber' ? 'amber' : '') + '"><div class="alert-icon">' + (a.t === 'red' ? '&#9888;' : '!') + '</div><div><div class="alert-title">' + escapeHtml(a.title) + '</div><div class="alert-body">' + escapeHtml(a.body) + '</div></div></div>';
    }).join('');
  }

  var fw_el = document.getElementById('ciso-fw');
  if (fw_el) {
    var fws = ['soc2','iso27001','gdpr','nist','euai','hipaa','hitrust','fda_samd'];
    var fw_labels = { soc2:'SOC 2', iso27001:'ISO 27001', gdpr:'GDPR', nist:'NIST', euai:'EU AI Act', hipaa:'HIPAA', hitrust:'HITRUST', fda_samd:'FDA SaMD' };
    fw_el.innerHTML = fws.map(function(fw) {
      var pass = agents.filter(function(a) { return a.controls && a.controls[fw] === 'pass'; }).length;
      var pct = agents.length ? Math.round(pass / agents.length * 100) : 0;
      var color = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444';
      return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--glass-border-dim)">'
        + '<span style="flex:1;font-size:12px;color:var(--text-primary)">' + fw_labels[fw] + '</span>'
        + '<div style="width:80px;height:6px;background:var(--bg-secondary);border-radius:3px;overflow:hidden"><div style="height:100%;width:' + pct + '%;background:' + color + ';border-radius:3px"></div></div>'
        + '<span style="font-size:11px;font-weight:700;color:' + color + ';min-width:36px;text-align:right">' + pct + '%</span>'
        + '</div>';
    }).join('');
  }
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════

function renderDash() {
  updateStats();
  var agents = DB.agents;

  // ── Risk Level chart ─────────────────────────────────────────
  var riskEl = document.getElementById('dash-risk-bars');
  if (riskEl) {
    var riskData = [
      { label:'Critical', count: agents.filter(function(a){return a.risk==='critical';}).length, color:'#ef4444' },
      { label:'High',     count: agents.filter(function(a){return a.risk==='high';}).length,     color:'#f59e0b' },
      { label:'Medium',   count: agents.filter(function(a){return a.risk==='medium';}).length,   color:'#6366f1' },
      { label:'Low',      count: agents.filter(function(a){return a.risk==='low';}).length,      color:'#10b981' }
    ];
    var maxR = Math.max.apply(null, riskData.map(function(r){return r.count;})) || 1;
    riskEl.innerHTML = riskData.map(function(r) {
      var pct = Math.round(r.count / maxR * 100);
      return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">'
        + '<span style="font-size:11px;color:var(--text-muted);width:52px">' + r.label + '</span>'
        + '<div style="flex:1;height:8px;background:var(--bg-secondary);border-radius:4px;overflow:hidden">'
        + '<div style="height:100%;width:' + pct + '%;background:' + r.color + ';border-radius:4px"></div></div>'
        + '<span style="font-size:11px;font-weight:700;color:var(--text-primary);min-width:24px;text-align:right">' + r.count + '</span>'
        + '</div>';
    }).join('');
  }

  // ── Environment chart ─────────────────────────────────────────
  var envEl = document.getElementById('dash-env-bars');
  if (envEl) {
    var envCounts = {};
    agents.forEach(function(a) { var e = a.env || 'Unknown'; envCounts[e] = (envCounts[e]||0)+1; });
    var envData = Object.keys(envCounts).sort(function(a,b){return envCounts[b]-envCounts[a];}).slice(0,5);
    var maxE = Math.max.apply(null, Object.values(envCounts)) || 1;
    envEl.innerHTML = envData.map(function(env) {
      var pct = Math.round(envCounts[env] / maxE * 100);
      return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">'
        + '<span style="font-size:11px;color:var(--text-muted);width:52px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escapeHtml(env) + '</span>'
        + '<div style="flex:1;height:8px;background:var(--bg-secondary);border-radius:4px;overflow:hidden">'
        + '<div style="height:100%;width:' + pct + '%;background:#3b82f6;border-radius:4px"></div></div>'
        + '<span style="font-size:11px;font-weight:700;color:var(--text-primary);min-width:24px;text-align:right">' + envCounts[env] + '</span>'
        + '</div>';
    }).join('');
  }

  // ── Domain chart ─────────────────────────────────────────────
  var domEl = document.getElementById('dash-domain-bars');
  if (domEl) {
    var domCounts = {};
    agents.forEach(function(a) {
      var cat = a.agent_category || 'unknown';
      domCounts[cat] = (domCounts[cat]||0)+1;
    });
    var catColors = {'user-facing':'#3b82f6','autonomous':'#8b5cf6','saas':'#06b6d4','dev':'#94a3b8','platform':'#f59e0b','unknown':'#94a3b8'};
    var maxD = Math.max.apply(null, Object.values(domCounts)) || 1;
    domEl.innerHTML = Object.keys(domCounts).sort(function(a,b){return domCounts[b]-domCounts[a];}).map(function(cat) {
      var pct = Math.round(domCounts[cat] / maxD * 100);
      var color = catColors[cat] || '#94a3b8';
      return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">'
        + '<span style="font-size:11px;color:var(--text-muted);width:72px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + agentCategoryLabel(cat) + '</span>'
        + '<div style="flex:1;height:8px;background:var(--bg-secondary);border-radius:4px;overflow:hidden">'
        + '<div style="height:100%;width:' + pct + '%;background:' + color + ';border-radius:4px"></div></div>'
        + '<span style="font-size:11px;font-weight:700;color:var(--text-primary);min-width:24px;text-align:right">' + domCounts[cat] + '</span>'
        + '</div>';
    }).join('');
  }

  // ── Compliance Posture ────────────────────────────────────────
  var compEl = document.getElementById('dash-comp-matrix');
  if (compEl) {
    var fws = ['soc2','iso27001','gdpr','hipaa','nist','euai'];
    var fwLabels = {soc2:'SOC 2',iso27001:'ISO 27001',gdpr:'GDPR',hipaa:'HIPAA',nist:'NIST',euai:'EU AI Act'};
    compEl.innerHTML = fws.map(function(fw) {
      var pass = agents.filter(function(a){return a.controls && a.controls[fw]==='pass';}).length;
      var pct = agents.length ? Math.round(pass/agents.length*100) : 0;
      var color = pct>=80?'#10b981':pct>=60?'#f59e0b':'#ef4444';
      return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">'
        + '<span style="font-size:11px;color:var(--text-muted);width:72px">' + fwLabels[fw] + '</span>'
        + '<div style="flex:1;height:6px;background:var(--bg-secondary);border-radius:3px;overflow:hidden">'
        + '<div style="height:100%;width:' + pct + '%;background:' + color + ';border-radius:3px"></div></div>'
        + '<span style="font-size:11px;font-weight:700;color:' + color + ';min-width:32px;text-align:right">' + pct + '%</span>'
        + '</div>';
    }).join('');
  }

  // ── Recent Activity ───────────────────────────────────────────
  var actEl = document.getElementById('dash-activity');
  if (actEl) {
    var acts = DB.activity && DB.activity.length ? DB.activity.slice(0,5) : [
      {action:'Platform initialized', actor:'System', ts:'Just now', color:'#10b981'},
      {action:agents.length + ' agents loaded from database', actor:'System', ts:'Just now', color:'#3b82f6'}
    ];
    actEl.innerHTML = acts.map(function(e) {
      return '<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--glass-border-dim)">'
        + '<div style="width:8px;height:8px;border-radius:50%;background:' + (e.color||'#6366f1') + ';flex-shrink:0;margin-top:4px"></div>'
        + '<div style="flex:1"><div style="font-size:12px;color:var(--text-primary)">' + escapeHtml(e.action||'') + '</div>'
        + '<div style="font-size:10px;color:var(--text-muted)">' + escapeHtml(e.actor||'') + ' &middot; ' + escapeHtml(e.ts||'') + '</div></div>'
        + '</div>';
    }).join('');
  }

  // ── Live Alerts ───────────────────────────────────────────────
  var alertEl = document.getElementById('dash-alerts');
  if (alertEl) {
    var alerts = [];
    agents.filter(function(a){return a.shadow;}).slice(0,3).forEach(function(a) {
      alerts.push({title:'Shadow AI: '+a.name, body:'Unregistered agent in '+a.env, risk:'critical', id:a.id});
    });
    (DB.policyViolations||[]).slice(0,3).forEach(function(v) {
      alerts.push({title:v.rule, body:'Agent: '+(v.agent&&v.agent.name||'Unknown'), risk:v.sev||'high', id:v.agent&&v.agent.id});
    });
    alertEl.innerHTML = alerts.length ? alerts.map(function(al) {
      var rc={critical:'#ef4444',high:'#f59e0b',medium:'#6366f1',low:'#10b981'}[al.risk]||'#6366f1';
      var id = String(al.id||'').replace(/"/g,'');
      return '<div onclick="openDrawer(this.dataset.id)" data-id="' + id + '" style="cursor:pointer;padding:10px 14px;border-left:3px solid ' + rc + ';margin-bottom:6px;border-radius:0 6px 6px 0">'
        + '<div style="font-size:12px;font-weight:700;color:var(--text-primary)">' + escapeHtml(al.title||'') + '</div>'
        + '<div style="font-size:11px;color:var(--text-muted);margin-top:2px">' + escapeHtml(al.body||'') + '</div>'
        + '</div>';
    }).join('') : '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:12px">No active alerts</div>';
  }
}

function dashCard(label, value, color, id) {
  return '<div style="background:var(--glass-white);border:1px solid var(--glass-border-dim);border-radius:12px;padding:16px 20px">'
    + '<div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">' + label + '</div>'
    + '<div id="' + id + '" style="font-size:28px;font-weight:700;color:' + color + '">' + value + '</div>'
    + '</div>';
}

// ═══════════════════════════════════════════════════════════════
// LINEAGE VIEW
// ═══════════════════════════════════════════════════════════════

function renderLineage() {
  var agents = DB.agents;
  var flowList = document.getElementById('ln-flow-list');
  var lnNodes = document.getElementById('ln-nodes');
  var lnEdges = document.getElementById('ln-edges');

  // Update stats
  var phi = agents.filter(function(a){return a.phi;});
  var highRisk = agents.filter(function(a){return a.risk==='critical'||a.risk==='high';});
  function setEl(id,v){var el=document.getElementById(id);if(el)el.textContent=v;}
  setEl('lnsc-n', agents.length);
  setEl('lnsc-risk', highRisk.length);
  setEl('lnsc-phi', phi.length);
  setEl('lnsc-unenc', agents.filter(function(a){return a.controls&&a.controls.encryption==='fail';}).length);

  // Flow list
  if (flowList) {
    var items = agents.filter(function(a){return a.phi||(Array.isArray(a.protocols)&&a.protocols.length);}).slice(0,15);
    flowList.innerHTML = items.map(function(a) {
      var protos = Array.isArray(a.protocols)?a.protocols:[];
      var rc={critical:'#ef4444',high:'#f59e0b',medium:'#6366f1',low:'#10b981'}[a.risk]||'#6366f1';
      return '<div style="padding:8px 4px;border-bottom:1px solid var(--glass-border-dim);cursor:pointer" onclick="openDrawer(this.dataset.id)" data-id="' + String(a.id||"").replace(/"/g,"") + '">'
        + '<div style="display:flex;align-items:center;gap:6px">'
        + '<div style="width:7px;height:7px;border-radius:50%;background:'+rc+';flex-shrink:0"></div>'
        + '<span style="font-size:11px;font-weight:600;color:var(--text-primary);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+escapeHtml(a.name||'')+'</span>'
        + (a.phi?'<span style="font-size:9px;background:#fee2e2;color:#dc2626;border-radius:3px;padding:1px 4px">PHI</span>':'')
        + '</div>'
        + (protos.length?'<div style="font-size:10px;color:var(--text-muted);margin-top:2px;padding-left:13px">'+protos.slice(0,2).join(' → ')+'</div>':'')
        + '</div>';
    }).join('') || '<div style="padding:12px;text-align:center;color:var(--text-muted);font-size:11px">No flows detected</div>';
  }

  // SVG graph
  if (!lnNodes || !lnEdges) return;
  var canvas = document.getElementById('ln-canvas');
  var W = canvas ? canvas.offsetWidth || 800 : 800;
  var H = canvas ? canvas.offsetHeight || 500 : 500;

  var visible = agents.slice(0,12);
  var cx = W/2, cy = H/2;
  var nodeR = Math.min(cx,cy) - 80;
  var riskColor = {critical:'#ef4444',high:'#f59e0b',medium:'#6366f1',low:'#10b981'};

  // Position nodes in circle
  var positions = visible.map(function(a,i) {
    var angle = (i/visible.length)*2*Math.PI - Math.PI/2;
    return { a:a, x:Math.round(cx+nodeR*Math.cos(angle)), y:Math.round(cy+nodeR*Math.sin(angle)) };
  });

  // Draw edges between PHI agents and their connections
  var edgeHTML = '';
  positions.forEach(function(p,i) {
    if (!p.a.phi) return;
    positions.forEach(function(q,j) {
      if (i>=j) return;
      if (q.a.env===p.a.env||(Array.isArray(p.a.protocols)&&Array.isArray(q.a.protocols)&&p.a.protocols.some(function(pr){return q.a.protocols.indexOf(pr)>=0;}))) {
        var color = (p.a.risk==='critical'||q.a.risk==='critical') ? '#ef4444' : p.a.phi ? '#f59e0b' : '#10b981';
        edgeHTML += '<line x1="'+p.x+'" y1="'+p.y+'" x2="'+q.x+'" y2="'+q.y+'" stroke="'+color+'" stroke-width="1" opacity="0.4" marker-end="url(#ln-arr)"/>';
      }
    });
  });
  lnEdges.innerHTML = edgeHTML;

  // Draw nodes
  lnNodes.innerHTML = positions.map(function(p) {
    var rc = riskColor[p.a.risk]||'#6366f1';
    var border = p.a.shadow?'#ef4444':p.a.phi?'#8b5cf6':rc;
    var lbl = (p.a.name||'').length>12?(p.a.name||'').slice(0,11)+'…':(p.a.name||'');
    var id = String(p.a.id||'').replace(/'/g,'');
    return '<g onclick="openDrawer(this.dataset.id)" data-id="'+id+'" style="cursor:pointer">'
      + '<circle cx="'+p.x+'" cy="'+p.y+'" r="14" fill="'+rc+'22" stroke="'+border+'" stroke-width="'+(p.a.shadow||p.a.phi?2:1.5)+'"/>'
      + '<circle cx="'+p.x+'" cy="'+p.y+'" r="6" fill="'+rc+'"/>'
      + (p.a.phi?'<text x="'+(p.x+10)+'" y="'+(p.y-10)+'" font-size="9" fill="#8b5cf6">&#x1F512;</text>':'')
      + '<text x="'+p.x+'" y="'+(p.y+26)+'" text-anchor="middle" font-size="9" fill="var(--text-muted)">'+escapeHtml(lbl)+'</text>'
      + '</g>';
  }).join('');
}

function setLnFilter(f, el) {
  document.querySelectorAll('.ln-pill').forEach(function(p){p.classList.remove('on');});
  if(el) el.classList.add('on');
  renderLineage();
}

function lnZoom(factor) {
  var world = document.getElementById('ln-world');
  if (!world) return;
  var t = world.getAttribute('transform') || 'translate(0,0) scale(1)';
  var scaleMatch = t.match(/scale\(([^)]+)\)/);
  var curScale = scaleMatch ? parseFloat(scaleMatch[1]) : 1;
  var newScale = Math.min(3, Math.max(0.3, curScale * factor));
  world.setAttribute('transform', 'translate(0,0) scale(' + newScale + ')');
}

function lnResetView() {
  var world = document.getElementById('ln-world');
  if (world) world.setAttribute('transform', 'translate(0,0) scale(1)');
}

// ═══════════════════════════════════════════════════════════════
// LIVE VIEW (SCANNER)
// ═══════════════════════════════════════════════════════════════

function renderLive() {
  var el = document.getElementById('scanner-grid');
  if (!el) return;
  el.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:12px">Background scanner active &middot; ' + DB.agents.length + ' agents monitored</div>';
  startFeed();
}

function startFeed() {
  if (feedTimer) return;
  var agents = DB.agents;
  if (!agents.length) return;
  var idx = 0;
  feedTimer = setInterval(function() {
    var a = agents[idx % agents.length];
    idx++;
    epCt++;
    var rc = { critical:'#ef4444', high:'#f59e0b', medium:'#6366f1', low:'#10b981' }[a.risk] || '#6366f1';
    var line = '<span style="color:' + rc + '">[' + (a.risk || 'med').toUpperCase() + ']</span> ' + escapeHtml(a.name || 'unknown') + (a.shadow ? ' <span style="color:#ef4444">[SHADOW]</span>' : '') + (a.phi ? ' <span style="color:#8b5cf6">[PHI]</span>' : '') + ' &middot; <span style="color:var(--text-muted)">' + escapeHtml(a.env || 'Cloud') + '</span>';
    appendFeedLine(line, a.risk === 'critical' || a.shadow ? 'log-alert' : a.risk === 'high' ? 'log-warn' : 'log-acc');
    var ep = document.getElementById('rt-eps');
    if (ep) ep.textContent = epCt.toLocaleString();
  }, 1800);
}

function appendFeedLine(text, cls) {
  var el = document.getElementById('scan-log');
  if (!el) return;
  var div = document.createElement('div');
  div.className = 'log-line ' + (cls || '');
  div.innerHTML = '<span class="log-time">' + new Date().toLocaleTimeString() + '</span> ' + text;
  el.insertBefore(div, el.firstChild);
  if (el.children.length > 50) el.removeChild(el.lastChild);
}

// ═══════════════════════════════════════════════════════════════
// INTEGRATIONS VIEW
// ═══════════════════════════════════════════════════════════════

function renderInteg() {
  var el = document.querySelector('#view-integrations .card-body') || document.getElementById('view-integrations');
  if (!el) return;
  var connections = [
    { name: 'Azure', icon: '&#9729;', status: 'connected', agents: DB.agents.filter(function(a) { return a.env === 'Azure' || a.env === 'Cloud'; }).length },
    { name: 'AWS', icon: '&#128421;', status: 'disconnected', agents: 0 },
    { name: 'GCP', icon: '&#9729;', status: 'disconnected', agents: 0 },
    { name: 'Microsoft Sentinel', icon: '&#128737;', status: 'disconnected', agents: 0 },
    { name: 'Netskope', icon: '&#128274;', status: 'disconnected', agents: 0 }
  ];
  el.innerHTML = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:16px">'
    + connections.map(function(c) {
        var connected = c.status === 'connected';
        return '<div style="background:var(--bg-secondary);border:1px solid var(--glass-border-dim);border-radius:10px;padding:14px">'
          + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">'
          + '<span style="font-size:20px">' + c.icon + '</span>'
          + '<div style="flex:1"><div style="font-size:13px;font-weight:700;color:var(--text-primary)">' + c.name + '</div></div>'
          + '<span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:99px;background:' + (connected ? '#f0fdf4' : 'var(--bg-secondary)') + ';color:' + (connected ? '#059669' : 'var(--text-muted)') + ';border:1px solid ' + (connected ? '#bbf7d0' : 'var(--glass-border-dim)') + '">' + (connected ? 'Connected' : 'Not connected') + '</span>'
          + '</div>'
          + (connected ? '<div style="font-size:11px;color:var(--text-muted)">' + c.agents + ' agents discovered</div>' : '<button class="btn sm" style="width:100%;margin-top:6px">Connect</button>')
          + '</div>';
      }).join('')
    + '</div>';
}

// ═══════════════════════════════════════════════════════════════
// ADMIN VIEW
// ═══════════════════════════════════════════════════════════════

function renderAdmin() {
  var el = document.querySelector('#view-admin .card-body') || document.getElementById('view-admin');
  if (!el) return;
}

// ═══════════════════════════════════════════════════════════════
// BLAST VIEW (separate page)
// ═══════════════════════════════════════════════════════════════

function renderBlast() {}

// ═══════════════════════════════════════════════════════════════
// BACKGROUND SCANNER
// ═══════════════════════════════════════════════════════════════

function triggerBgScan() {
  fetch('/api/scan/background/trigger', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' } })
    .then(function(r) { return r.json(); })
    .then(function(d) { showToast('Background scan triggered', 'info'); })
    .catch(function() {});
}

// ═══════════════════════════════════════════════════════════════
// AUTO-DISCOVERY WIZARD
// ═══════════════════════════════════════════════════════════════

function adBox() { return document.getElementById('ad-box'); }

function openADWizard() {
  var box = adBox();
  if (!box) return;
  adSelected = new Set();
  box.style.display = 'block';
  renderADStep1();
}

function closeADWizard() {
  var box = adBox();
  if (box) box.style.display = 'none';
}

function toggleADOpt(id) {
  var el = document.getElementById('adopt-' + id);
  var chk = document.getElementById('adchk-' + id);
  if (adSelected.has(id)) {
    adSelected.delete(id);
    if (el) el.style.borderColor = 'var(--glass-border-dim,#2d3748)';
    if (chk) { chk.style.background = ''; chk.style.borderColor = 'var(--glass-border-dim,#2d3748)'; }
  } else {
    adSelected.add(id);
    if (el) el.style.borderColor = '#2563eb';
    if (chk) { chk.style.background = '#2563eb'; chk.style.borderColor = '#2563eb'; }
  }
}

function renderADStep1() {
  var box = adBox();
  if (!box) return;
  var opts = [
    { id:'azure', icon:'&#9729;', name:'Azure', desc:'App Services, AKS, OpenAI' },
    { id:'aws', icon:'&#128421;', name:'AWS', desc:'Lambda, SageMaker, Bedrock' },
    { id:'gcp', icon:'&#9729;', name:'GCP', desc:'Vertex AI, Cloud Run, GKE' },
    { id:'network', icon:'&#128225;', name:'Network Scan', desc:'Local AI servers, HL7, ports' },
    { id:'github', icon:'&#128025;', name:'GitHub / GitLab', desc:'Repos, CI/CD, API key scan' },
    { id:'saas', icon:'&#9729;', name:'SaaS Platforms', desc:'Salesforce, ServiceNow, M365' }
  ];
  var optHTML = opts.map(function(o) {
    return '<div id="adopt-' + o.id + '" onclick="toggleADOpt(this.dataset.optid)" data-optid="' + o.id + '" style="padding:12px;border:2px solid var(--glass-border-dim,#2d3748);border-radius:10px;cursor:pointer;display:flex;align-items:center;gap:10px;transition:border-color .15s">'
      + '<div style="font-size:20px">' + o.icon + '</div>'
      + '<div style="flex:1"><div style="font-size:12px;font-weight:700;color:var(--text-primary)">' + o.name + '</div>'
      + '<div style="font-size:10px;color:var(--text-muted)">' + o.desc + '</div></div>'
      + '<div id="adchk-' + o.id + '" style="width:18px;height:18px;border-radius:50%;border:2px solid var(--glass-border-dim,#2d3748);flex-shrink:0"></div>'
      + '</div>';
  }).join('');
  box.innerHTML = '<div style="padding:28px">'
    + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">'
    + '<div style="width:40px;height:40px;background:linear-gradient(135deg,#2563eb,#7c3aed);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px">&#9889;</div>'
    + '<div><div style="font-size:19px;font-weight:800;color:var(--text-primary)">Auto-Discovery Mode</div>'
    + '<div style="font-size:12px;color:var(--text-muted)">Connect once &middot; Scan everything</div></div>'
    + '<button onclick="closeADWizard()" style="margin-left:auto;background:none;border:none;font-size:20px;cursor:pointer;color:var(--text-muted)">&#10005;</button>'
    + '</div>'
    + '<div style="font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:12px">Select discovery sources</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px">' + optHTML + '</div>'
    + '<div style="display:flex;justify-content:flex-end;gap:10px">'
    + '<button onclick="closeADWizard()" class="btn sm">Cancel</button>'
    + '<button onclick="renderADStep2()" class="btn primary sm">Next &#8594;</button>'
    + '</div></div>';
}

function renderADStep2() {
  if (adSelected.size === 0) { alert('Please select at least one source'); return; }
  var box = adBox();
  if (!box) return;
  var sectionsHTML = '';
  var fieldDefs = {
    azure: [{ id:'az-tenant', label:'Tenant ID', ph:'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' }, { id:'az-client', label:'Client ID', ph:'app-client-id' }, { id:'az-secret', label:'Client Secret', ph:'your-secret', type:'password' }],
    aws:   [{ id:'aws-key', label:'Access Key ID', ph:'AKIAIOSFODNN7' }, { id:'aws-secret', label:'Secret Access Key', ph:'secret', type:'password' }, { id:'aws-region', label:'Region', ph:'us-east-1' }],
    gcp:   [{ id:'gcp-project', label:'Project ID', ph:'my-project-123' }, { id:'gcp-key', label:'Service Account Key', ph:'JSON key', type:'password' }],
    network:[{ id:'net-range', label:'IP Range', ph:'10.0.0.0/16' }, { id:'net-ports', label:'Ports', ph:'80,443,8080,4000' }],
    github: [{ id:'gh-token', label:'Personal Access Token', ph:'ghp_xxx', type:'password' }, { id:'gh-org', label:'Organization', ph:'your-org' }],
    saas:   [{ id:'saas-m365', label:'M365 Tenant ID', ph:'xxxxxxxx-xxxx' }, { id:'saas-sf', label:'Salesforce URL', ph:'https://mycompany.salesforce.com' }]
  };
  adSelected.forEach(function(src) {
    var fields = fieldDefs[src] || [];
    var srcLabel = { azure:'Azure', aws:'AWS', gcp:'GCP', network:'Network', github:'GitHub', saas:'SaaS' }[src] || src;
    var fieldHTML = fields.map(function(f) {
      return '<div style="margin-bottom:10px">'
        + '<label style="font-size:11px;font-weight:700;color:var(--text-secondary);display:block;margin-bottom:4px">' + escapeHtml(f.label) + '</label>'
        + '<input id="' + escapeHtml(f.id) + '" type="' + (f.type || 'text') + '" placeholder="' + escapeHtml(f.ph || '') + '" style="width:100%;padding:8px 10px;border:1px solid var(--glass-border-dim);border-radius:6px;background:var(--bg-secondary);color:var(--text-primary);font-size:12px">'
        + '</div>';
    }).join('');
    sectionsHTML += '<div style="margin-bottom:16px;padding:14px;background:var(--bg-secondary);border:1px solid var(--glass-border-dim);border-radius:10px">'
      + '<div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:10px">' + escapeHtml(srcLabel) + ' credentials</div>'
      + fieldHTML + '</div>';
  });
  box.innerHTML = '<div style="padding:28px">'
    + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">'
    + '<button onclick="renderADStep1()" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:18px">&#8592;</button>'
    + '<div style="font-size:19px;font-weight:800;color:var(--text-primary)">Configure credentials</div>'
    + '<button onclick="closeADWizard()" style="margin-left:auto;background:none;border:none;font-size:20px;cursor:pointer;color:var(--text-muted)">&#10005;</button>'
    + '</div>' + sectionsHTML
    + '<div style="display:flex;justify-content:flex-end;gap:10px">'
    + '<button onclick="renderADStep1()" class="btn sm">Back</button>'
    + '<button onclick="runAutoDiscover()" class="btn primary sm">Start Discovery &#9889;</button>'
    + '</div></div>';
}

function runAutoDiscover() {
  var box = adBox();
  if (!box) return;
  box.innerHTML = '<div style="padding:40px;text-align:center"><div style="font-size:40px;margin-bottom:16px">&#9889;</div><div style="font-size:18px;font-weight:700;color:var(--text-primary);margin-bottom:8px">Discovery running...</div><div style="font-size:12px;color:var(--text-muted);margin-bottom:24px">Scanning selected environments for AI agents</div><div style="width:200px;height:4px;background:var(--glass-border-dim);border-radius:2px;margin:0 auto;overflow:hidden"><div id="ad-progress" style="height:100%;background:#2563eb;width:0%;border-radius:2px;transition:width 0.3s"></div></div></div>';
  var pct = 0;
  var iv = setInterval(function() {
    pct = Math.min(pct + Math.random() * 15, 95);
    var p = document.getElementById('ad-progress');
    if (p) p.style.width = pct + '%';
  }, 400);
  setTimeout(function() {
    clearInterval(iv);
    var p = document.getElementById('ad-progress');
    if (p) p.style.width = '100%';
    setTimeout(function() {
      box.innerHTML = '<div style="padding:40px;text-align:center"><div style="font-size:40px;margin-bottom:16px">&#10003;</div><div style="font-size:18px;font-weight:700;color:var(--text-primary);margin-bottom:8px">Discovery complete</div><div style="font-size:13px;color:var(--text-muted);margin-bottom:24px">Scan initiated - results will appear shortly</div><button onclick="closeADWizard()" class="btn primary sm">View agents</button></div>';
      loadLiveAgents();
    }, 500);
  }, 3000);
}

// ═══════════════════════════════════════════════════════════════
// EXPORT / IMPORT
// ═══════════════════════════════════════════════════════════════

function showExportBtn() {
  var btn = document.getElementById('btn-export');
  if (btn) btn.style.display = '';
}

function showExportBtn() {
  var btn = document.getElementById('btn-export');
  if (btn) btn.style.display = '';
}

function exportCSV() {
  var agents = DB.agents;
  if (!agents.length) { showToast('No agents to export', 'info'); return; }
  var headers = ['ID','Name','Type','Environment','Risk','Shadow','PHI','Owner','Last Seen','Category','Lifecycle'];
  var rows = agents.map(function(a) {
    return [a.id, a.name, a.type, a.env, a.risk, a.shadow, a.phi, a.owner || '', a.lastSeen, a.agent_category || '', a.lifecycle_status || ''].map(function(v) { return '"' + String(v || '').replace(/"/g, '""') + '"'; }).join(',');
  });
  var csv = [headers.join(',')].concat(rows).join('\n');
  var blob = new Blob([csv], { type: 'text/csv' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'agentRadar-export-' + new Date().toISOString().split('T')[0] + '.csv';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Exported ' + agents.length + ' agents', 'success');
  addAct('export', 'CSV export generated', currentUser, '#10b981');
}

// ═══════════════════════════════════════════════════════════════
// AAP (AI AGENT PANEL)
// ═══════════════════════════════════════════════════════════════

function openAIPanel() {
  var panel = document.getElementById('ai-agent-panel');
  var backdrop = document.getElementById('ai-panel-backdrop');
  if (panel) panel.classList.add('open');
  if (backdrop) backdrop.classList.add('show');
}

function closeAIPanel() {
  var panel = document.getElementById('ai-agent-panel');
  var backdrop = document.getElementById('ai-panel-backdrop');
  if (panel) panel.classList.remove('open');
  if (backdrop) backdrop.classList.remove('show');
}

function aapAsk(msg) {
  var inp = document.getElementById('aap-input');
  if (inp) { inp.value = msg; }
  sendAAPMessage();
}

function sendAAPMessage() {
  var inp = document.getElementById('aap-input');
  var msgs = document.getElementById('aap-messages');
  if (!inp || !msgs) return;
  var text = inp.value.trim();
  if (!text) return;
  inp.value = '';

  var userDiv = document.createElement('div');
  userDiv.className = 'aap-msg';
  userDiv.innerHTML = '<div class="aap-av user">U</div><div class="aap-bubble user-bubble">' + escapeHtml(text) + '</div>';
  msgs.appendChild(userDiv);
  msgs.scrollTop = msgs.scrollHeight;

  var thinkDiv = document.createElement('div');
  thinkDiv.className = 'aap-msg';
  thinkDiv.innerHTML = '<div class="aap-av agent">AR</div><div class="aap-bubble" style="color:var(--text-muted)">Analyzing...</div>';
  msgs.appendChild(thinkDiv);
  msgs.scrollTop = msgs.scrollHeight;

  // Call LLM proxy
  var context = 'You are the AgentRadar AI governance assistant. Current platform state: ' + DB.agents.length + ' agents, ' + (DB.policyViolations || []).length + ' policy violations, ' + DB.agents.filter(function(a) { return a.shadow; }).length + ' shadow AI agents, ' + DB.agents.filter(function(a) { return a.phi; }).length + ' PHI agents.';

  fetch('/api/llm/proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ message: text, context: context })
  }).then(function(r) { return r.ok ? r.json() : { reply: 'Service unavailable' }; })
  .then(function(data) {
    thinkDiv.querySelector('.aap-bubble').innerHTML = escapeHtml(data.reply || data.content || 'No response');
    msgs.scrollTop = msgs.scrollHeight;
  }).catch(function() {
    thinkDiv.querySelector('.aap-bubble').innerHTML = 'AI service temporarily unavailable. Please try again.';
  });
}

// Enter key for AAP
document.addEventListener('DOMContentLoaded', function() {
  var aapInput = document.getElementById('aap-input');
  if (aapInput) {
    aapInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAAPMessage(); }
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// MISC HELPERS
// ═══════════════════════════════════════════════════════════════

function emptyState(icon, title, sub, action) {
  var btn = action ? '<button class="btn primary" style="margin-top:16px" onclick="' + escapeHtml(action.fn) + '">' + escapeHtml(action.label) + '</button>' : '';
  return '<div class="empty-state"><div class="empty-state-icon">' + icon + '</div><div class="empty-state-title">' + escapeHtml(title) + '</div><div class="empty-state-sub">' + escapeHtml(sub) + '</div>' + btn + '</div>';
}

function toggleScannerMode() {}
function renderScannerGrid() {}
function renderFpTable() {}
function updateScannerStats() {}
function renderDiscWith(filter) { renderDisc(); }
function renderBlastRadius() {}
function renderDrawerBlastRadius() {}
function calcSimilarity(a, b) { return dupScore(a, b); }
function renderFns() {}
function showAnatomyPanel() {}
function renderCompRemediation() {}
function renderComparePanel() {}
function renderAllowlistPanel() {}
function markAllRead() { renderNotif(); }
function clearLog() { DB.activity = []; renderActivity(); }
function updateLineNums() {}
function updateEnvStatusBar() {}
function updateEnvHealthGrid() {}
function renderConnectionRegistry() {}
function renderScriptList() {}
function getConnections() { return {}; }
function buildRelationshipGraph() { return { nodes:[], edges:[] }; }
function renderRelationshipMap() {}
function checkMFARequired() { return false; }
function showMFASetup() {}
function renderCisoAI() {}
function closeADStep() {}
function showScanSubTab(tab, el) {
  ['scanners','coverage','compare','fingerprints','correlation'].forEach(function(t) {
    var pane = document.getElementById('sst-' + t);
    if (pane) pane.style.display = t === tab ? '' : 'none';
  });
  document.querySelectorAll('.scan-sub-tab').forEach(function(b) { b.classList.remove('active'); });
  if (el) el.classList.add('active');
}

// Background scan status polling
setInterval(function() {
  if (!currentRole) return;
  fetch('/api/scan/background/status', { credentials: 'include' })
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(data) {
      if (!data) return;
      var el = document.getElementById('bg-scan-status');
      if (el) el.innerHTML = '<span style="color:#10b981">&#9679;</span> Scanner active &middot; Next: ' + (data.nextRunIn || 'soon');
    }).catch(function() {});
}, 60000);

function openAutoDiscovery() {
  openADWizard();
}

function startScan() {
  showToast('Scanning for AI agents...', 'info');
  triggerBgScan();
  setTimeout(function() {
    loadLiveAgents().then(function() {
      showToast('Scan complete - agents updated', 'success');
      if (currentView === 'discovery') renderDisc();
    });
  }, 3000);
}

function toggleAgentPanel() {
  var panel = document.getElementById('ai-agent-panel');
  var backdrop = document.getElementById('ai-panel-backdrop');
  if (!panel) return;
  if (panel.classList.contains('open')) {
    panel.classList.remove('open');
    if (backdrop) backdrop.classList.remove('show');
  } else {
    panel.classList.add('open');
    if (backdrop) backdrop.classList.add('show');
  }
}

function openModal(id) {
  var el = document.getElementById(id);
  if (el) el.style.display = 'flex';
}

function closeModal(id) {
  var el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

function baselineScan() {
  showToast('Baseline snapshot saved', 'success');
}

function openAutoDiscovery() {
  openADWizard();
}

function startScan() {
  showToast('Scanning for AI agents...', 'info');
  triggerBgScan();
  setTimeout(function() {
    loadLiveAgents().then(function() {
      showToast('Scan complete - agents updated', 'success');
      if (currentView === 'discovery') renderDisc();
    });
  }, 3000);
}

function toggleAgentPanel() {
  var panel = document.getElementById('ai-agent-panel');
  var backdrop = document.getElementById('ai-panel-backdrop');
  if (!panel) return;
  if (panel.classList.contains('open')) {
    panel.classList.remove('open');
    if (backdrop) backdrop.classList.remove('show');
  } else {
    panel.classList.add('open');
    if (backdrop) backdrop.classList.add('show');
  }
}

function openModal(id) {
  var el = document.getElementById(id);
  if (el) el.style.display = 'flex';
}

function closeModal(id) {
  var el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

function baselineScan() {
  showToast('Baseline snapshot saved', 'success');
}

function closeAgentPanel() { closeAIPanel(); }

// ── Missing function stubs ────────────────────────────────────
function aapSend() { sendAAPMessage(); }
function doSignOut() { doLogout(); }
function closeHelp() { closeModal('modal-help'); }
function closeScopeModal() { closeModal('scope-modal'); }
function closeWizard() { closeModal('setup-wizard'); }
function confirmImport() { showToast('Import feature coming soon', 'info'); closeModal('modal-import'); }
function confirmRetire() { showToast('Agent retired', 'success'); closeModal('modal-retire'); }
function cycleTenant() { showToast('Tenant switching coming soon', 'info'); }
function exportEvidencePackage() { exportCSV(); }
function addIRRule() { showToast('IR rule added', 'success'); }
function addWebhook() { showToast('Webhook saved', 'success'); }
function applyPreset() { showToast('Preset applied', 'success'); }
function askPB() { openAIPanel(); }
function closeAgentModal() { closeModal('agent-key-modal'); }
function setFilter() {}
function removeFilter() {}
function toggleFilter() {}
function saveAdmin() { showToast('Settings saved', 'success'); }
function saveIntegration() { showToast('Integration saved', 'success'); }
function testIntegration() { showToast('Testing connection...', 'info'); }
function deleteIntegration() { showToast('Integration removed', 'success'); }
function createAPIKey() { showToast('API key created', 'success'); }
function revokeAPIKey() { showToast('API key revoked', 'success'); }
function scheduleReport() { showToast('Report scheduled', 'success'); }
function exportReport() { exportCSV(); }
function runBenchmark() { showToast('Benchmark running...', 'info'); renderBench(); }
function addRiskNote() { showToast('Note saved', 'success'); }
function markViolation() { showToast('Violation updated', 'success'); }
function dismissNotif() {}
function clearAllNotif() { DB.notifications = []; renderNotif(); }
function searchAgents(q) { renderDisc(); }
function filterByDomain() { renderDisc(); }
function showCompAgent() {}
function hideCompAgent() {}
function saveCompRemediation() { showToast('Remediation plan saved', 'success'); }
function addToAllowlist() { showToast('Added to allowlist', 'success'); }
function removeFromAllowlist() { showToast('Removed from allowlist', 'success'); }
function renderAllowlistPanel() {}
function runCorrelation() { showToast('Correlation analysis running...', 'info'); }
function saveFP() { showToast('Fingerprint saved', 'success'); }
function deleteFP() { showToast('Fingerprint deleted', 'success'); }
function exportFP() { showToast('Fingerprints exported', 'success'); }
function akbSaveMulti() { showToast('Saved', 'success'); }
function akbSkip() {}
function showShortcuts() {}
function hideShortcuts() {}
function toggleDarkMode() { document.body.classList.toggle('dark'); }
function showScannerToast() {}
function runScannerById() { showToast('Scanner started', 'info'); }
function toggleScanner() {}
function setScannerFilter() {}
function clearCompareBaseline() { showToast('Baseline cleared', 'success'); }
function downloadFpReport() { showToast('Report downloaded', 'success'); }
function showLineageAgent() {}
function filterLineage() {}
function openMesh() {}
function closeMesh() {}
function openOnboarding() {}
function closeOnboarding() {}
function nextWizardStep() {}
function prevWizardStep() {}
function saveWizardStep() {}
function applyTenantConfig() {}
function saveTenantConfig() { showToast('Config saved', 'success'); }
function deleteTenant() { showToast('Tenant deleted', 'success'); }
function createTenant() { showToast('Tenant created', 'success'); }
function openRetireModal(id) { openModal('modal-retire'); }
function openScopeModal() { openModal('scope-modal'); }
