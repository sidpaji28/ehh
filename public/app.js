  /* ============================================
    OnneaLabs Lead Command Center
    Version: 5.0 — Gmail + Market Filters
    ============================================ */

  // ============================================
  // SUPABASE INIT
  // ============================================
  let supabaseClient = null;

  function initSupabase() {
    if (typeof window.supabase === 'undefined') { console.error('❌ Supabase library not loaded'); return false; }
    if (typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_ANON_KEY === 'undefined') { console.error('❌ config.js not loaded'); return false; }
    if (!SUPABASE_URL.startsWith('https://') || !SUPABASE_URL.includes('.supabase.co')) { console.error('❌ Invalid SUPABASE_URL'); return false; }
    if (SUPABASE_ANON_KEY.length < 100) { console.error('❌ Invalid SUPABASE_ANON_KEY'); return false; }
    try {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      if (!supabaseClient?.auth || !supabaseClient?.from) return false;
      console.log('✅ Supabase initialized');
      return true;
    } catch (e) { console.error('❌ Supabase init failed:', e); return false; }
  }

  const supabaseReady = initSupabase();

  // ============================================
  // CONSTANTS & CONFIG
  // ============================================
  const PROXY_BASE    = 'http://localhost:3001';
  const APOLLO_PROXY  = `${PROXY_BASE}/apollo/search`;
  const LUSHA_PROXY   = `${PROXY_BASE}/lusha`;
  const AI_PROXY      = `${PROXY_BASE}/analyze/ai`;
  const WEB_PROXY     = `${PROXY_BASE}/analyze/website`;
  const QUALIFY_PROXY = `${PROXY_BASE}/qualify/lead`;
  const VERIFY_PROXY  = `${PROXY_BASE}/verify/email`;
  const EMAIL_PROXY   = `${PROXY_BASE}/email`;

  const STAGES = {
    new:               { label: 'New',              color: '#06B6D4', icon: '✨' },
    contacted:         { label: 'Contacted',         color: '#3B82F6', icon: '📧' },
    responded:         { label: 'Responded',         color: '#8B5CF6', icon: '💬' },
    meeting_scheduled: { label: 'Meeting',           color: '#F97316', icon: '📅' },
    proposal_sent:     { label: 'Proposal',          color: '#EAB308', icon: '📋' },
    negotiation:       { label: 'Negotiation',       color: '#EC4899', icon: '🤝' },
    won:               { label: 'Won',               color: '#22C55E', icon: '🏆' },
    lost:              { label: 'Lost',              color: '#EF4444', icon: '❌' },
    dormant:           { label: 'Dormant',           color: '#666677', icon: '💤' },
  };

  const SOURCES = {
    website_form:    'Website',
    social_instagram:'Instagram',
    social_linkedin: 'LinkedIn',
    social_twitter:  'Twitter/X',
    apollo:          'Apollo',
    lusha:           'Lusha',
    manual_research: 'Research',
    referral:        'Referral',
    other:           'Other',
  };

  const PRIORITIES = {
    critical:     { label: 'Critical',     emoji: '🔴' },
    high:         { label: 'High',         emoji: '🟠' },
    medium:       { label: 'Medium',       emoji: '🟡' },
    low:          { label: 'Low',          emoji: '🟢' },
    not_assessed: { label: 'Not Assessed', emoji: '⚪' },
  };

  // ── MARKET SEGMENTS ──────────────────────────────────────────────────────────
  const MARKET_SEGMENTS = {
    legal_finance: {
      label: 'Legal & Finance',
      icon: '⚖️',
      color: '#6366F1',
      subcategories: ['Law Firm', 'CA Firm', 'Financial Advisory', 'Wealth Management', 'Insurance'],
      keywords: ['law', 'legal', 'attorney', 'advocate', 'ca ', 'chartered accountant', 'financial advisor', 'wealth', 'insurance', 'audit', 'tax'],
    },
    consulting_strategy: {
      label: 'Consulting & Strategy',
      icon: '💼',
      color: '#8B5CF6',
      subcategories: ['Management Consulting', 'Strategy', 'Business Advisory', 'Operations'],
      keywords: ['consult', 'strategy', 'advisory', 'management consult', 'business consult', 'operations'],
    },
    hr_recruitment: {
      label: 'HR & Recruitment',
      icon: '👥',
      color: '#EC4899',
      subcategories: ['Recruitment Agency', 'HR Tech', 'Staffing', 'Talent Acquisition'],
      keywords: ['hr ', 'human resource', 'recruitment', 'hiring', 'talent', 'staffing', 'manpower', 'workforce'],
    },
    fintech_trading: {
      label: 'Fintech & Trading',
      icon: '💰',
      color: '#F59E0B',
      subcategories: ['Fintech', 'Trading Platform', 'Crypto', 'Payments', 'Banking Tech'],
      keywords: ['fintech', 'crypto', 'trading', 'payment', 'banking', 'neobank', 'forex', 'demat', 'stock broker'],
    },
    edtech_education: {
      label: 'EdTech & Education',
      icon: '📚',
      color: '#10B981',
      subcategories: ['Online Learning', 'LMS', 'Coaching', 'Test Prep', 'K-12'],
      keywords: ['edtech', 'education', 'learning', 'lms', 'course', 'training', 'coaching', 'tutor', 'school', 'university', 'college'],
    },
    saas_software: {
      label: 'SaaS & Software',
      icon: '☁️',
      color: '#3B82F6',
      subcategories: ['B2B SaaS', 'Enterprise Software', 'Dev Tools', 'No-Code'],
      keywords: ['saas', 'software', 'cloud', 'platform', 'api', 'developer', 'tech', 'app', 'digital'],
    },
    real_estate: {
      label: 'Real Estate',
      icon: '🏢',
      color: '#06B6D4',
      subcategories: ['PropTech', 'Property Management', 'Real Estate Agency', 'Construction'],
      keywords: ['real estate', 'property', 'proptech', 'realty', 'housing', 'construction', 'builder', 'developer', 'land'],
    },
    health_wellness: {
      label: 'Health & Wellness',
      icon: '🏥',
      color: '#EF4444',
      subcategories: ['Healthcare', 'Clinic', 'Pharma', 'Fitness', 'Mental Health'],
      keywords: ['health', 'wellness', 'medical', 'clinic', 'hospital', 'pharma', 'fitness', 'gym', 'therapy', 'mental health', 'doctor'],
    },
    ecommerce_retail: {
      label: 'E-Commerce & Retail',
      icon: '🛒',
      color: '#F97316',
      subcategories: ['D2C Brand', 'Marketplace', 'Retail Chain', 'FMCG'],
      keywords: ['ecommerce', 'e-commerce', 'retail', 'd2c', 'direct to consumer', 'fmcg', 'brand', 'store', 'shop', 'marketplace'],
    },
    hospitality_travel: {
      label: 'Hospitality & Travel',
      icon: '✈️',
      color: '#14B8A6',
      subcategories: ['Hotel', 'Restaurant', 'Travel Agency', 'Tourism'],
      keywords: ['hotel', 'hospitality', 'restaurant', 'travel', 'tourism', 'resort', 'airline', 'booking', 'food', 'cafe'],
    },
    media_marketing: {
      label: 'Media & Marketing',
      icon: '📢',
      color: '#A855F7',
      subcategories: ['Digital Agency', 'PR', 'Content', 'Advertising'],
      keywords: ['media', 'marketing', 'advertising', 'agency', 'pr ', 'public relation', 'content', 'social media', 'influencer', 'branding'],
    },
    manufacturing_logistics: {
      label: 'Manufacturing & Logistics',
      icon: '🏭',
      color: '#78716C',
      subcategories: ['Manufacturing', 'Logistics', 'Supply Chain', 'Export'],
      keywords: ['manufactur', 'logistics', 'supply chain', 'export', 'import', 'warehouse', 'distribution', 'factory', 'industrial'],
    },
    other: {
      label: 'Other',
      icon: '📦',
      color: '#64748B',
      subcategories: [],
      keywords: [],
    },
  };

  const BUSINESS_CATEGORIES = MARKET_SEGMENTS; // alias for legacy code

  const SENIORITY_LEVELS = {
    founder_ceo:  { label: 'Founder / CEO',          icon: '🚀', keywords: ['founder','ceo','co-founder','owner','president','managing director'] },
    c_suite:      { label: 'C-Suite',                icon: '⭐', keywords: ['cfo','cto','cmo','cso','coo','chief'] },
    vp_director:  { label: 'VP / Director',          icon: '📊', keywords: ['vp','vice president','director','head of'] },
    manager_lead: { label: 'Manager / Lead',         icon: '📈', keywords: ['manager','lead','senior','principal'] },
    ic_specialist:{ label: 'Individual Contributor', icon: '👨‍💼', keywords: ['specialist','coordinator','analyst'] },
    other:        { label: 'Other',                  icon: '👤', keywords: [] },
  };

  // ============================================
  // APP STATE
  // ============================================
  const state = {
    leads:          [],
    filteredLeads:  [],
    currentPage:    1,
    perPage:        20,
    sortField:      'created_at',
    sortDirection:  'desc',
    currentView:    'overview',
    editingLead:    null,
    deleteTarget:   null,
    leadsLoaded:    false,
    activeMarketFilter: null,
  };

  let apolloResults      = [];
  let apolloSelectedIds  = new Set();
  let apolloCurrentPage  = 1;
  let apolloTotalEntries = 0;
  const APOLLO_PER_PAGE  = 25;

  let emailRecipients    = [];
  let emailTemplates     = [];
  let currentPreviewIndex = 0;

  // ============================================
  // UTILITIES
  // ============================================
  function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  function escapeHtml(text) {
    if (!text) return '';
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d   = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000)     return 'Just now';
    if (diff < 3600000)   return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000)  return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  }

  function formatFieldName(field) {
    return field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) { console.log(`[${type}] ${message}`); return; }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.animation = 'slideInToast 0.3s ease reverse'; setTimeout(() => toast.remove(), 300); }, 3500);
  }

  function detectSeniority(title) {
    if (!title) return 'other';
    const t = title.toLowerCase();
    if (/founder|ceo|chief executive|co-founder|owner|president|managing director/.test(t)) return 'founder_ceo';
    if (/cfo|cto|cmo|cso|coo|chief/.test(t)) return 'c_suite';
    if (/vp|vice president|director|head of/.test(t)) return 'vp_director';
    if (/manager|lead|senior/.test(t)) return 'manager_lead';
    return 'other';
  }

  function detectMarketSegment(industry, company, jobTitle) {
    const text = `${industry || ''} ${company || ''} ${jobTitle || ''}`.toLowerCase();
    for (const [key, seg] of Object.entries(MARKET_SEGMENTS)) {
      if (key === 'other') continue;
      if (seg.keywords.some(kw => text.includes(kw))) return key;
    }
    return 'other';
  }

  // legacy alias
  function detectCategory(industry, company) { return detectMarketSegment(industry, company, ''); }

  function replacePlaceholders(text, lead) {
    const firstName = (lead.name || '').split(' ')[0] || 'there';
    return (text || '')
      .replace(/\{\{first_name\}\}/gi, firstName)
      .replace(/\{\{name\}\}/gi,       lead.name      || 'there')
      .replace(/\{\{company\}\}/gi,    lead.company   || 'your company')
      .replace(/\{\{title\}\}/gi,      lead.job_title || 'your role')
      .replace(/\{\{industry\}\}/gi,   lead.industry  || 'your industry')
      .replace(/\{\{email\}\}/gi,      lead.email     || '');
  }

  // ============================================
  // AUTH
  // ============================================
  async function checkAuth() {
    if (!supabaseClient) { showLogin(); return; }
    try {
      const { data: { session }, error } = await supabaseClient.auth.getSession();
      if (error || !session) { showLogin(); return; }
      showDashboard();
    } catch (e) { showLogin(); }
  }

  function showLogin() {
    document.getElementById('loginScreen')?.classList.remove('hidden');
    document.getElementById('dashboard')?.classList.add('hidden');
  }

  function showDashboard() {
    document.getElementById('loginScreen')?.classList.add('hidden');
    document.getElementById('dashboard')?.classList.remove('hidden');
    loadDashboard();
  }

  async function handleLogin(email, password) {
    if (!supabaseClient) return { error: { message: 'Not initialized' } };
    try { return await supabaseClient.auth.signInWithPassword({ email, password }); }
    catch (e) { return { error: { message: 'Connection failed' } }; }
  }

  async function handleLogout() {
    if (supabaseClient) await supabaseClient.auth.signOut().catch(() => {});
    showLogin();
  }

  // ============================================
  // DATA
  // ============================================
  async function loadDashboard() {
    await fetchLeads();
    renderOverview();
    renderLeadsTable();
  }

  async function fetchLeads() {
    if (!supabaseClient) return;
    try {
      const { data, error } = await supabaseClient.from('leads').select('*').order('created_at', { ascending: false });
      if (error) { showToast('Failed to fetch leads: ' + error.message, 'error'); return; }
      state.leads         = data || [];
      state.filteredLeads = [...state.leads];
      state.leadsLoaded   = true;
    } catch (e) { console.error('Fetch error:', e); }
  }

  // ============================================
  // OVERVIEW
  // ============================================
  function renderOverview() {
    const leads   = state.leads;
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    const stats   = {
      statTotal:    leads.length,
      statNew:      leads.filter(l => new Date(l.created_at) >= weekAgo).length,
      statPipeline: leads.filter(l => ['contacted','responded','meeting_scheduled','proposal_sent','negotiation'].includes(l.contact_stage)).length,
      statWon:      leads.filter(l => l.contact_stage === 'won').length,
      statAudit:    leads.filter(l => l.free_audit_taken).length,
      statCritical: leads.filter(l => l.solutions_priority === 'critical').length,
    };
    Object.entries(stats).forEach(([id, val]) => { const el = document.getElementById(id); if (el) el.textContent = val; });
    renderRecentLeads(leads.slice(0, 8));
    renderSourceBreakdown(leads);
    renderStageBreakdown(leads);
    renderMarketSegmentDashboard();
  }

  function renderRecentLeads(recent) {
    const c = document.getElementById('recentLeadsList');
    if (!c) return;
    if (!recent.length) { c.innerHTML = `<div class="empty-state"><i class="fas fa-inbox"></i><h4>No leads yet</h4></div>`; return; }
    c.innerHTML = recent.map(l => `
      <div class="recent-lead-item" onclick="openEditModal('${l.id}')">
        <div class="recent-lead-info">
          <div class="lead-avatar">${getInitials(l.name)}</div>
          <div>
            <div class="recent-lead-name">${escapeHtml(l.name)}</div>
            <div class="recent-lead-company">${escapeHtml(l.company || l.industry || '')}</div>
          </div>
        </div>
        <span class="badge badge-${l.contact_stage}">${STAGES[l.contact_stage]?.label || l.contact_stage}</span>
      </div>`).join('');
  }

  function renderSourceBreakdown(leads) {
    const c = document.getElementById('sourceBreakdown');
    if (!c) return;
    const counts = {};
    Object.keys(SOURCES).forEach(k => counts[k] = 0);
    leads.forEach(l => { if (counts.hasOwnProperty(l.lead_source)) counts[l.lead_source]++; });
    const entries = Object.entries(counts).filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a);
    if (!entries.length) { c.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px">No data yet</p>'; return; }
    const max = Math.max(...entries.map(([, v]) => v), 1);
    c.innerHTML = entries.map(([k, v]) => `
      <div class="source-bar-item">
        <span class="source-bar-label">${SOURCES[k]}</span>
        <div class="source-bar-track"><div class="source-bar-fill" style="width:${(v/max)*100}%"></div></div>
        <span class="source-bar-count">${v}</span>
      </div>`).join('');
  }

  function renderStageBreakdown(leads) {
    const c = document.getElementById('stageBreakdown');
    if (!c) return;
    const counts = {};
    Object.keys(STAGES).forEach(k => counts[k] = 0);
    leads.forEach(l => { if (counts.hasOwnProperty(l.contact_stage)) counts[l.contact_stage]++; });
    c.innerHTML = Object.entries(STAGES).map(([k, cfg]) => `
      <div class="stage-funnel-item">
        <span class="stage-dot" style="background:${cfg.color}"></span>
        <span class="stage-funnel-label">${cfg.icon} ${cfg.label}</span>
        <span class="stage-funnel-count">${counts[k] || 0}</span>
      </div>`).join('');
  }

  // ── NEW: Market Segment Dashboard ─────────────────────────────────────────────
  function renderMarketSegmentDashboard() {
    const leads = state.leads;

    // Compute segment for each lead dynamically if not stored
    const segmentCounts = {};
    const segmentLeads  = {};
    Object.keys(MARKET_SEGMENTS).forEach(k => { segmentCounts[k] = 0; segmentLeads[k] = []; });

    leads.forEach(l => {
      const seg = l.business_category || detectMarketSegment(l.industry, l.company, l.job_title);
      const key = MARKET_SEGMENTS[seg] ? seg : 'other';
      segmentCounts[key]++;
      segmentLeads[key].push(l);
    });

    // Market segment cards
    const segGrid = document.getElementById('marketSegmentGrid');
    if (segGrid) {
      const entries = Object.entries(MARKET_SEGMENTS)
        .map(([k, cfg]) => ({ key: k, cfg, count: segmentCounts[k], leads: segmentLeads[k] }))
        .filter(e => e.count > 0)
        .sort((a, b) => b.count - a.count);

      segGrid.innerHTML = entries.length ? entries.map(e => {
        const avgScore = e.leads.length ? Math.round(e.leads.reduce((s, l) => s + (l.icp_match_score || 0), 0) / e.leads.length) : 0;
        const pipeline = e.leads.filter(l => ['contacted','responded','meeting_scheduled','proposal_sent','negotiation'].includes(l.contact_stage)).length;
        const won      = e.leads.filter(l => l.contact_stage === 'won').length;
        const isActive = state.activeMarketFilter === e.key;
        return `
          <div class="market-segment-card ${isActive ? 'active' : ''}" onclick="filterByMarket('${e.key}')" style="--seg-color:${e.cfg.color}">
            <div class="seg-card-header">
              <span class="seg-icon">${e.cfg.icon}</span>
              <div class="seg-badge-group">
                ${won ? `<span class="seg-won-badge">${won} won</span>` : ''}
              </div>
            </div>
            <div class="seg-card-title">${e.cfg.label}</div>
            <div class="seg-card-count">${e.count} lead${e.count !== 1 ? 's' : ''}</div>
            <div class="seg-card-meta">
              <span title="In pipeline">${pipeline} active</span>
              <span title="Avg ICP score">⭐ ${avgScore}</span>
            </div>
            <div class="seg-card-bar">
              <div class="seg-card-bar-fill" style="width:${Math.min(100,(e.count/Math.max(...Object.values(segmentCounts),1))*100)}%;background:${e.cfg.color}"></div>
            </div>
          </div>`;
      }).join('') : '<p style="color:var(--text-muted);text-align:center;padding:20px;grid-column:1/-1">No leads yet</p>';
    }

    // Top opportunities per segment
    const opC = document.getElementById('topOpportunities');
    if (opC) {
      const top = [...leads]
        .filter(l => (l.icp_match_score || 0) >= 50 && ['new','contacted','responded','meeting_scheduled'].includes(l.contact_stage))
        .sort((a, b) => (b.icp_match_score || 0) - (a.icp_match_score || 0))
        .slice(0, 5);
      opC.innerHTML = top.length ? top.map(l => {
        const seg = MARKET_SEGMENTS[l.business_category] || MARKET_SEGMENTS.other;
        return `
          <div class="opportunity-card" onclick="openEditModal('${l.id}')">
            <div class="opportunity-header">
              <div class="opportunity-name">${escapeHtml(l.name)}</div>
              <div class="opportunity-score"><i class="fas fa-bullseye"></i> ${l.icp_match_score || 0}</div>
            </div>
            <div class="opportunity-meta">
              <span>${seg.icon} ${escapeHtml(l.company || 'Unknown')}</span>
              <span style="color:var(--text-muted)">${escapeHtml(l.industry || '')}</span>
            </div>
          </div>`;
      }).join('') : '<p style="color:var(--text-muted);text-align:center;padding:20px">No high-score opportunities yet</p>';
    }
  }

  window.filterByMarket = function(segKey) {
    if (state.activeMarketFilter === segKey) {
      state.activeMarketFilter = null;
    } else {
      state.activeMarketFilter = segKey;
    }
    // Update market segment card active state
    document.querySelectorAll('.market-segment-card').forEach(c => c.classList.remove('active'));
    if (state.activeMarketFilter) {
      document.querySelector(`.market-segment-card[onclick="filterByMarket('${segKey}')"]`)?.classList.add('active');
    }
    state.currentPage = 1;
    switchView('leads');
    renderLeadsTable();
    if (state.activeMarketFilter) {
      showToast(`Showing ${MARKET_SEGMENTS[segKey].label} leads`, 'info');
    }
  };

  // ============================================
  // LEADS TABLE
  // ============================================
  function renderLeadsTable() {
    applyFilters();
    applySorting();
    const start = (state.currentPage - 1) * state.perPage;
    const page  = state.filteredLeads.slice(start, start + state.perPage);
    const tbody = document.getElementById('leadsTableBody');
    if (!tbody) return;

    // Show active market filter banner
    const banner = document.getElementById('marketFilterBanner');
    if (banner) {
      if (state.activeMarketFilter) {
        const seg = MARKET_SEGMENTS[state.activeMarketFilter];
        banner.style.display = 'flex';
        banner.innerHTML = `
          <span>${seg.icon} Filtering by <strong>${seg.label}</strong> — ${state.filteredLeads.length} leads</span>
          <button onclick="filterByMarket('${state.activeMarketFilter}')" style="background:none;border:none;color:var(--primary-light);cursor:pointer;font-size:13px">✕ Clear filter</button>`;
      } else {
        banner.style.display = 'none';
      }
    }

    if (!page.length) {
      tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><i class="fas fa-search"></i><h4>No leads found</h4><p>Try adjusting filters or add a new lead</p></div></td></tr>`;
      const pag = document.getElementById('pagination');
      if (pag) pag.innerHTML = '';
      return;
    }

    tbody.innerHTML = page.map(l => {
      const seg = MARKET_SEGMENTS[l.business_category || detectMarketSegment(l.industry, l.company, l.job_title)] || MARKET_SEGMENTS.other;
      return `
      <tr>
        <td><input type="checkbox" class="lead-select-cb" data-id="${l.id}" data-email="${escapeHtml(l.email || '')}"></td>
        <td>
          <div class="lead-name-cell">
            <div class="lead-avatar">${getInitials(l.name)}</div>
            <div>
              <div class="lead-name-text">${escapeHtml(l.name)}</div>
              ${l.company ? `<div class="lead-company-text">${escapeHtml(l.company)}</div>` : ''}
            </div>
          </div>
        </td>
        <td>${l.phone || '<span style="color:var(--text-muted)">—</span>'}</td>
        <td>${l.email ? `<a href="mailto:${escapeHtml(l.email)}" style="color:var(--primary-light)">${escapeHtml(l.email)}</a>` : '<span style="color:var(--text-muted)">—</span>'}</td>
        <td>
          <span class="seg-pill" style="background:${seg.color}22;color:${seg.color};border:1px solid ${seg.color}44;padding:2px 8px;border-radius:20px;font-size:11px;white-space:nowrap">
            ${seg.icon} ${seg.label}
          </span>
        </td>
        <td>${l.industry || '<span style="color:var(--text-muted)">—</span>'}</td>
        <td><span class="badge badge-${l.contact_stage}">${STAGES[l.contact_stage]?.icon || ''} ${STAGES[l.contact_stage]?.label || l.contact_stage}</span></td>
        <td><span class="badge badge-audit-${l.free_audit_taken ? 'yes' : 'no'}">${l.free_audit_taken ? '✓ Yes' : 'No'}</span></td>
        <td><span class="badge badge-${l.solutions_priority}">${PRIORITIES[l.solutions_priority]?.emoji || ''} ${PRIORITIES[l.solutions_priority]?.label || l.solutions_priority}</span></td>
        <td>
          <div class="action-buttons">
            <button class="btn-icon" onclick="openEditModal('${l.id}')" title="Edit"><i class="fas fa-pen"></i></button>
            <button class="btn-icon" onclick="openDeleteModal('${l.id}')" title="Delete" style="color:var(--red)"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>`;
    }).join('');

    renderPagination();
    setTimeout(addLushaButtonsToTable, 50);
  }

  function applyFilters() {
    let f = [...state.leads];
    const stage    = document.getElementById('filterStage')?.value;
    const source   = document.getElementById('filterSource')?.value;
    const priority = document.getElementById('filterPriority')?.value;
    const audit    = document.getElementById('filterAudit')?.value;
    const market   = document.getElementById('filterMarket')?.value;
    const search   = document.getElementById('globalSearch')?.value?.toLowerCase();

    if (stage)    f = f.filter(l => l.contact_stage === stage);
    if (source)   f = f.filter(l => l.lead_source === source);
    if (priority) f = f.filter(l => l.solutions_priority === priority);
    if (audit)    f = f.filter(l => String(l.free_audit_taken) === audit);

    // Market segment filter — from dropdown OR from card click
    const activeMarket = market || state.activeMarketFilter;
    if (activeMarket) {
      f = f.filter(l => {
        const seg = l.business_category || detectMarketSegment(l.industry, l.company, l.job_title);
        return seg === activeMarket;
      });
    }

    if (search) f = f.filter(l => [l.name, l.email, l.company, l.phone, l.industry, l.remarks].some(v => (v || '').toLowerCase().includes(search)));
    state.filteredLeads = f;
  }

  function applySorting() {
    state.filteredLeads.sort((a, b) => {
      let va = a[state.sortField] || '', vb = b[state.sortField] || '';
      if (state.sortField === 'created_at') { va = new Date(va); vb = new Date(vb); }
      else { va = String(va).toLowerCase(); vb = String(vb).toLowerCase(); }
      if (va < vb) return state.sortDirection === 'asc' ? -1 : 1;
      if (va > vb) return state.sortDirection === 'asc' ?  1 : -1;
      return 0;
    });
  }

  function renderPagination() {
    const total = Math.ceil(state.filteredLeads.length / state.perPage);
    const c     = document.getElementById('pagination');
    if (!c || total <= 1) { if (c) c.innerHTML = ''; return; }
    let h = `<button class="page-btn" onclick="goToPage(${state.currentPage - 1})" ${state.currentPage === 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>`;
    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= state.currentPage - 2 && i <= state.currentPage + 2))
        h += `<button class="page-btn ${i === state.currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
      else if (i === state.currentPage - 3 || i === state.currentPage + 3)
        h += '<span style="color:var(--text-muted);padding:0 4px">...</span>';
    }
    h += `<button class="page-btn" onclick="goToPage(${state.currentPage + 1})" ${state.currentPage === total ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>`;
    c.innerHTML = h;
  }

  window.goToPage = function(p) {
    const total = Math.ceil(state.filteredLeads.length / state.perPage);
    if (p < 1 || p > total) return;
    state.currentPage = p;
    renderLeadsTable();
  };

  // ============================================
  // PIPELINE
  // ============================================
  function renderPipeline() {
    const b = document.getElementById('pipelineBoard');
    if (!b) return;
    const stages = ['new','contacted','responded','meeting_scheduled','proposal_sent','negotiation','won','lost'];
    b.innerHTML = stages.map(sk => {
      const cfg = STAGES[sk];
      const sl  = state.leads.filter(l => l.contact_stage === sk);
      return `
        <div class="pipeline-column">
          <div class="pipeline-column-header">
            <div class="pipeline-column-title"><span class="stage-dot" style="background:${cfg.color}"></span>${cfg.icon} ${cfg.label}</div>
            <span class="column-count">${sl.length}</span>
          </div>
          <div class="pipeline-column-body">
            ${sl.length ? sl.map(l => {
              const seg = MARKET_SEGMENTS[l.business_category || detectMarketSegment(l.industry, l.company, l.job_title)] || MARKET_SEGMENTS.other;
              return `
                <div class="pipeline-card" onclick="openEditModal('${l.id}')">
                  <div class="pipeline-card-name">${escapeHtml(l.name)}</div>
                  ${l.company ? `<div class="pipeline-card-company">${escapeHtml(l.company)}</div>` : ''}
                  <div class="pipeline-card-meta">
                    <span style="font-size:11px">${seg.icon} ${seg.label}</span>
                    <span class="badge badge-${l.solutions_priority}" style="font-size:10px">${PRIORITIES[l.solutions_priority]?.emoji || ''}</span>
                  </div>
                </div>`;
            }).join('') : '<p style="color:var(--text-muted);text-align:center;font-size:13px;padding:20px">No leads</p>'}
          </div>
        </div>`;
    }).join('');
  }

  // ============================================
  // AUDITS
  // ============================================
  function renderAudits() {
    const c  = document.getElementById('auditsGrid');
    if (!c) return;
    const al = state.leads.filter(l => l.free_audit_taken);
    if (!al.length) { c.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-clipboard-check"></i><h4>No audits yet</h4></div>`; return; }
    c.innerHTML = al.map(l => `
      <div class="audit-card" onclick="openEditModal('${l.id}')">
        <div class="audit-card-header">
          <div><div class="audit-card-name">${escapeHtml(l.name)}</div><div style="font-size:13px;color:var(--text-muted)">${escapeHtml(l.company || '')}</div></div>
          <span class="badge badge-${l.solutions_priority}">${PRIORITIES[l.solutions_priority]?.emoji || ''} ${PRIORITIES[l.solutions_priority]?.label || ''}</span>
        </div>
        ${l.problems_identified ? `<div class="audit-card-problems"><h5>Problems</h5><p>${escapeHtml(l.problems_identified)}</p></div>` : ''}
      </div>`).join('');
  }

  // ============================================
  // MODALS
  // ============================================
  function openAddModal() {
    state.editingLead = null;
    document.getElementById('modalTitle').textContent = 'Add New Lead';
    document.getElementById('submitBtnText').textContent = 'Save Lead';
    document.getElementById('leadForm')?.reset();
    document.getElementById('leadId').value = '';
    document.getElementById('auditDateGroup').style.display = 'none';
    document.getElementById('activitySection')?.classList.add('hidden');
    ['leadSource','leadStage','leadPriority','leadCategory','leadSeniority'].forEach((id, i) => {
      const el = document.getElementById(id);
      if (el) el.value = ['other','new','not_assessed','other','other'][i];
    });
    document.getElementById('leadModal')?.classList.remove('hidden');
  }

  window.openEditModal = function(id) {
    const lead = state.leads.find(l => l.id === id);
    if (!lead) return;
    state.editingLead = lead;
    document.getElementById('modalTitle').textContent    = 'Edit Lead';
    document.getElementById('submitBtnText').textContent = 'Update Lead';
    const fields = {
      leadId: lead.id, leadName: lead.name || '', leadCompany: lead.company || '',
      leadPhone: lead.phone || '', leadEmail: lead.email || '', leadIndustry: lead.industry || '',
      leadSource: lead.lead_source || 'other', leadStage: lead.contact_stage || 'new',
      leadPriority: lead.solutions_priority || 'not_assessed', leadAuditDate: lead.audit_date || '',
      leadProblems: lead.problems_identified || '', leadRemarks: lead.remarks || '',
      leadCategory: lead.business_category || 'other', leadJobTitle: lead.job_title || '',
      leadSeniority: lead.seniority_level || 'other', leadCompanySize: lead.company_size || '',
      leadLinkedin: lead.linkedin_url || '', leadWebsite: lead.company_website || '',
    };
    Object.entries(fields).forEach(([k, v]) => { const el = document.getElementById(k); if (el) el.value = v; });
    const cb = document.getElementById('leadAudit');
    if (cb) cb.checked = lead.free_audit_taken || false;
    document.getElementById('auditDateGroup').style.display = lead.free_audit_taken ? 'block' : 'none';
    renderActivityLog(lead.activity_log);
    document.getElementById('leadModal')?.classList.remove('hidden');
  };

  function renderActivityLog(log) {
    const s = document.getElementById('activitySection');
    const c = document.getElementById('activityLog');
    if (!s || !c) return;
    if (!log || !log.length) { s.classList.add('hidden'); return; }
    s.classList.remove('hidden');
    c.innerHTML = [...log].reverse().map(e => {
      const time    = new Date(e.timestamp).toLocaleString();
      const changes = Object.entries(e.changes || {}).map(([f, ch]) =>
        typeof ch === 'object' && ch.from !== undefined
          ? `<strong>${formatFieldName(f)}</strong>: ${ch.from} → ${ch.to}`
          : `<strong>${formatFieldName(f)}</strong> ${ch}`
      ).join(', ');
      return `<div class="activity-entry"><span class="activity-time">${time}</span><span class="activity-detail">${changes}</span></div>`;
    }).join('');
  }

  function closeModal() {
    document.getElementById('leadModal')?.classList.add('hidden');
    state.editingLead = null;
  }

  window.openDeleteModal = function(id) {
    const lead = state.leads.find(l => l.id === id);
    if (!lead) return;
    state.deleteTarget = lead;
    document.getElementById('deleteLeadName').textContent = lead.name;
    document.getElementById('deleteModal')?.classList.remove('hidden');
  };

  function closeDeleteModal() {
    document.getElementById('deleteModal')?.classList.add('hidden');
    state.deleteTarget = null;
  }

  // ============================================
  // CRUD
  // ============================================
  async function saveLead(e) {
    e.preventDefault();
    if (!supabaseClient) { showToast('Not connected', 'error'); return; }
    const val = id => document.getElementById(id)?.value?.trim() || '';
    const data = {
      name:                val('leadName'),
      company:             val('leadCompany') || null,
      phone:               val('leadPhone')   || null,
      email:               val('leadEmail')   || null,
      industry:            val('leadIndustry') || null,
      lead_source:         val('leadSource')  || 'other',
      contact_stage:       val('leadStage')   || 'new',
      solutions_priority:  val('leadPriority') || 'not_assessed',
      free_audit_taken:    document.getElementById('leadAudit')?.checked || false,
      audit_date:          val('leadAuditDate') || null,
      problems_identified: val('leadProblems') || null,
      remarks:             val('leadRemarks')  || null,
      business_category:   val('leadCategory') || 'other',
      job_title:           val('leadJobTitle') || null,
      seniority_level:     val('leadSeniority') || 'other',
      company_size:        val('leadCompanySize') || null,
      linkedin_url:        val('leadLinkedin') || null,
      company_website:     val('leadWebsite')  || null,
    };
    if (!data.name) { showToast('Name is required', 'error'); return; }
    const id = val('leadId');
    try {
      if (id) {
        const { error } = await supabaseClient.from('leads').update(data).eq('id', id);
        if (error) throw error;
        showToast('Lead updated!', 'success');
      } else {
        const { error } = await supabaseClient.from('leads').insert(data);
        if (error) throw error;
        showToast('Lead added!', 'success');
      }
      closeModal();
      await fetchLeads();
      refreshCurrentView();
    } catch (e) { showToast('Save failed: ' + e.message, 'error'); }
  }

  async function deleteLead() {
    if (!state.deleteTarget || !supabaseClient) return;
    try {
      const { error } = await supabaseClient.from('leads').delete().eq('id', state.deleteTarget.id);
      if (error) throw error;
      showToast('Lead deleted', 'info');
      closeDeleteModal();
      await fetchLeads();
      refreshCurrentView();
    } catch (e) { showToast('Delete failed: ' + e.message, 'error'); }
  }

  // ============================================
  // NAVIGATION
  // ============================================
  function switchView(viewName) {
    state.currentView = viewName;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`.nav-item[data-view="${viewName}"]`)?.classList.add('active');
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`${viewName}View`)?.classList.add('active');
    const titles = { overview:'Overview', leads:'All Leads', pipeline:'Pipeline', audits:'Audits', apollo:'Apollo / Lusha Search', qualify:'Lead Intelligence', bulkemail:'Bulk Email' };
    const pt = document.getElementById('pageTitle');
    if (pt) pt.textContent = titles[viewName] || viewName;
    document.querySelector('.sidebar')?.classList.remove('open');
    refreshCurrentView();
  }

  function refreshCurrentView() {
    switch (state.currentView) {
      case 'overview':  renderOverview();      break;
      case 'leads':     renderLeadsTable();    break;
      case 'pipeline':  renderPipeline();      break;
      case 'audits':    renderAudits();        break;
      case 'qualify':   renderQualifyView();   break;
      case 'bulkemail': renderBulkEmailView(); break;
    }
  }

  function renderQualifyView() {
    document.getElementById('bqTotal').textContent     = state.leads.length;
    document.getElementById('bqWithSite').textContent  = state.leads.filter(l => l.company_website).length;
    document.getElementById('bqAnalyzed').textContent  = state.leads.filter(l => l.icp_match_score > 0).length;
    const noEmail = document.getElementById('lushaNoEmail');
    const noPhone = document.getElementById('lushaNoPhone');
    if (noEmail) noEmail.textContent = state.leads.filter(l => !l.email).length;
    if (noPhone) noPhone.textContent = state.leads.filter(l => !l.phone).length;
    checkLushaCredits();
  }

  // ============================================
  // EXPORT
  // ============================================
  function exportCSV() {
    const headers = ['Name','Phone','Email','Market Segment','Industry','Stage','Audit','Priority','Remarks','Source','Added'];
    const rows    = state.filteredLeads.map(l => {
      const seg = MARKET_SEGMENTS[l.business_category || detectMarketSegment(l.industry, l.company, l.job_title)] || MARKET_SEGMENTS.other;
      return [
        l.name, l.phone, l.email, seg.label, l.industry,
        STAGES[l.contact_stage]?.label || l.contact_stage,
        l.free_audit_taken ? 'Yes' : 'No',
        PRIORITIES[l.solutions_priority]?.label || l.solutions_priority,
        l.remarks, SOURCES[l.lead_source] || l.lead_source,
        formatDate(l.created_at),
      ];
    });
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const a   = document.createElement('a');
    a.href    = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `onnealabs-leads-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast('CSV exported!', 'success');
  }

  // ============================================
  // APOLLO / LUSHA SEARCH
  // ============================================
  async function searchApollo(page = 1) {
    const btn     = document.getElementById('apolloSearchBtn');
    const results = document.getElementById('apolloResults');
    const loading = document.getElementById('apolloLoading');
    btn.disabled  = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';
    if (page === 1) results.style.display = 'none';
    if (loading) loading.style.display = 'block';
    try {
      const titles = (document.getElementById('apolloJobTitles')?.value || '').split('\n').map(t => t.trim()).filter(Boolean);
      const loc    = document.getElementById('apolloLocation')?.value || '';
      const size   = document.getElementById('apolloCompanySize')?.value || '';
      const payload = { page, per_page: APOLLO_PER_PAGE, contact_email_status: ['verified','unverified','guessed'] };
      if (titles.length) payload.person_titles = titles;
      if (loc)  { const parts = loc.split(','); payload.person_locations = parts[1] ? [`${parts[1].trim()}, ${parts[0].trim()}`] : [parts[0].trim()]; }
      if (size) { const [min, max] = size.split(','); payload.organization_num_employees_ranges = [`${min},${max || '100000'}`]; }

      const res  = await fetch(APOLLO_PROXY, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || `Error ${res.status}`); }
      const data = await res.json();
      const people = data.people || data.contacts || [];
      if (page === 1) { apolloResults = people; apolloSelectedIds.clear(); }
      else apolloResults = [...apolloResults, ...people];
      apolloCurrentPage  = page;
      apolloTotalEntries = data.pagination?.total_entries || apolloResults.length;
      if (!apolloResults.length) showToast('No results. Try broadening your search.', 'info');
      else { renderApolloResults(); results.style.display = 'block'; showToast(`Found ${apolloTotalEntries.toLocaleString()} leads`, 'success'); }
    } catch (err) {
      if (err.message.includes('fetch') || err.message.includes('NetworkError')) showProxyOfflineBanner();
      else showToast('Search failed: ' + err.message, 'error');
    } finally {
      if (loading) loading.style.display = 'none';
      btn.disabled  = false;
      btn.innerHTML = '<i class="fas fa-search"></i> <span>Search Apollo</span>';
    }
  }

  // ── REPLACE YOUR ENTIRE searchLusha() FUNCTION WITH THIS ──────────────────────
 
async function searchLusha() {
  const btn = document.getElementById('lushaSearchBtn');
  if (!btn) return;
  btn.disabled  = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching Lusha...';
 
  try {
    const titlesRaw  = (document.getElementById('apolloJobTitles')?.value || '').split('\n').map(t => t.trim()).filter(Boolean);
    const industries = (document.getElementById('apolloIndustries')?.value || '').split('\n').map(t => t.trim()).filter(Boolean);
    const locRaw     = document.getElementById('apolloLocation')?.value || '';
    const sizeRaw    = document.getElementById('apolloCompanySize')?.value || '';
 
    // ── Location ────────────────────────────────────────────────────────────
    const locParts       = locRaw.split(',');
    const country        = locParts[0].trim();
    const city           = locParts[1]?.trim() || null;
    const locationFilter = country ? [city ? { country, city } : { country }] : [];
 
    // ── Company size ────────────────────────────────────────────────────────
    const sizeMap = {
      '1,10':    [{ min: 1,    max: 10    }],
      '11,50':   [{ min: 11,   max: 50    }],
      '51,200':  [{ min: 51,   max: 200   }],
      '201,500': [{ min: 201,  max: 500   }],
      '501,1000':[{ min: 501,  max: 1000  }],
      '1001,':   [{ min: 1001, max: 100000}],
    };
    const sizes = sizeMap[sizeRaw] || [];
 
    // ── Department mapping — case-insensitive fuzzy ──────────────────────────
    const deptKeywords = [
      { dept: 'C-Suite',                 keys: ['ceo','founder','co-founder','cofounder','owner','president','managing director','md','chief executive','principal','chairman'] },
      { dept: 'Marketing',               keys: ['cmo','marketing','brand','growth','content','seo','social media','demand','digital marketing','performance'] },
      { dept: 'Sales',                   keys: ['sales','business development','bd ','biz dev','account executive','ae ','revenue','partnerships','account manager'] },
      { dept: 'Engineering & Technical', keys: ['cto','engineer','developer','dev ','tech lead','software','it ','data ','product','architect','devops','backend','frontend','fullstack'] },
      { dept: 'Finance',                 keys: ['cfo','finance','financial','accounting','accounts','ca ','chartered accountant','tax','audit','treasury','investment'] },
      { dept: 'Human Resources',         keys: ['hr ','human resource','talent','recruit','people ops','workforce','staffing','hiring','payroll','chro'] },
      { dept: 'Operations',              keys: ['coo','operations','ops ','supply chain','logistics','process','procurement','general manager','gm '] },
      { dept: 'Legal',                   keys: ['legal','counsel','attorney','law ','compliance','contracts','regulatory','clegal'] },
      { dept: 'Customer Success',        keys: ['customer success','customer service','support','client success','account manager','csm ','onboarding'] },
    ];
 
    const departments = new Set();
    titlesRaw.forEach(title => {
      const t = title.toLowerCase().trim();
      let matched = false;
      for (const { dept, keys } of deptKeywords) {
        if (keys.some(k => t.includes(k))) {
          departments.add(dept);
          matched = true;
          break;
        }
      }
      if (!matched) departments.add('C-Suite'); // safe fallback
    });
 
    // ── Industry mapping — case-insensitive fuzzy ────────────────────────────
    const industryKeywords = [
      { id: 1,  keys: ['accounting','ca firm','chartered','audit firm','tax consultant'] },
      { id: 3,  keys: ['software','saas','tech','it ','information technology','computer','cloud','platform','app '] },
      { id: 5,  keys: ['education','edtech','e-learning','elearning','learning','training','coaching','school','university','college','lms','test prep'] },
      { id: 6,  keys: ['financial','finance','investment','banking','wealth','fund','asset management','insurance','fintech','neobank','forex','trading'] },
      { id: 7,  keys: ['legal','law ','attorney','advocate','counsel','law firm'] },
      { id: 8,  keys: ['hr ','human resource','recruitment','staffing','talent','hiring','manpower','workforce'] },
      { id: 9,  keys: ['health','medical','hospital','clinic','pharma','wellness','healthcare','biotech','fitness','mental health'] },
      { id: 10, keys: ['consulting','strategy','advisory','management consult','business consult'] },
      { id: 11, keys: ['marketing','advertising','media','pr ','public relation','creative agency','branding','digital agency'] },
      { id: 12, keys: ['manufacturing','industrial','factory','production','engineering'] },
      { id: 13, keys: ['retail','ecommerce','e-commerce','d2c','direct to consumer','fmcg','consumer goods','marketplace'] },
      { id: 14, keys: ['real estate','property','realty','proptech','construction','builder','housing'] },
      { id: 15, keys: ['telecom','telecommunications','network','connectivity','isp '] },
      { id: 16, keys: ['travel','tourism','hospitality','hotel','restaurant','food ','cafe'] },
      { id: 17, keys: ['logistics','supply chain','shipping','warehouse','transport','freight','delivery'] },
    ];
 
    const industryIds = new Set();
    industries.forEach(industry => {
      const t = industry.toLowerCase().trim();
      for (const { id, keys } of industryKeywords) {
        if (keys.some(k => t.includes(k))) {
          industryIds.add(id);
          break;
        }
      }
      // If nothing matched, don't add anything — broader results are better than no results
    });
 
    // ── Build Lusha filters ──────────────────────────────────────────────────
    const contactInclude = {};
    const companyInclude = {};
 
    if (departments.size > 0)   contactInclude.departments       = [...departments];
    if (locationFilter.length)  contactInclude.locations         = locationFilter;
    if (industryIds.size > 0)   companyInclude.mainIndustriesIds = [...industryIds];
    if (sizes.length)           companyInclude.sizes             = sizes;
 
    // Only add filters that have values — empty filters cause 0 results
    const filters = {};
    if (Object.keys(contactInclude).length > 0) filters.contacts  = { include: contactInclude };
    if (Object.keys(companyInclude).length > 0) filters.companies = { include: companyInclude };
 
    // Ensure at least one filter exists
    if (!filters.contacts) filters.contacts = { include: { departments: ['C-Suite'] } };
 
    const lushaBody = { pages: { page: 0, size: 25 }, filters };
 
    console.log('→ Lusha search sending:', JSON.stringify(lushaBody, null, 2));
 
    const res = await fetch(`${LUSHA_PROXY}/search`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(lushaBody),
    });
 
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
 
    const data   = await res.json();
    const people = data.data || [];
 
    if (!people.length) {
      showToast('No Lusha results — try fewer filters or broader titles', 'info');
      return;
    }
 
    apolloResults = people.map(p => ({
      id:          p.contactId || `lusha_${Math.random()}`,
      name:        p.name      || 'Unknown',
      first_name:  p.name?.split(' ')[0] || '',
      last_name:   p.name?.split(' ').slice(1).join(' ') || '',
      title:       p.jobTitle  || '',
      email:       '',
      sanitized_phone: '',
      linkedin_url:    '',
      city: '', country: '',
      organization: {
        name:        p.companyName || '',
        industry:    '',
        website_url: p.fqdn ? `https://${p.fqdn}` : '',
      },
      _lusha:      true,
      _contact_id: p.contactId,
      _person_id:  p.personId,
      _has_email:  p.hasEmails,
      _has_phone:  p.hasPhones,
    }));
 
    apolloSelectedIds.clear();
    apolloTotalEntries = data.totalResults || people.length;
    renderApolloResults();
    document.getElementById('apolloResults').style.display = 'block';
    showToast(`Lusha: ${apolloTotalEntries.toLocaleString()} results found`, 'success');
 
  } catch (err) {
    console.error('Lusha search error:', err);
    showToast('Lusha search failed: ' + err.message, 'error');
  } finally {
    btn.disabled  = false;
    btn.innerHTML = '<i class="fas fa-gem"></i> Search Lusha';
  }
}
if (!people.length && Object.keys(filters).length > 1) {
  console.log('→ 0 results, retrying with contacts-only filter...');
  
  // Retry 1: drop company filters (industry, size)
  const retryBody1 = {
    pages:   { page: 0, size: 25 },
    filters: { contacts: filters.contacts },
  };
  const r1 = await fetch(`${LUSHA_PROXY}/search`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(retryBody1),
  });
  if (r1.ok) {
    const d1 = await r1.json();
    if (d1.data?.length > 0) {
      showToast(`Found ${d1.totalResults} results (removed industry/size filters — they were too narrow)`, 'info');
      // use d1 results
      apolloResults = d1.data.map(p => ({
        id: p.contactId || `lusha_${Math.random()}`,
        name: p.name || 'Unknown',
        first_name: p.name?.split(' ')[0] || '',
        last_name:  p.name?.split(' ').slice(1).join(' ') || '',
        title: p.jobTitle || '',
        email: '', sanitized_phone: '', linkedin_url: '', city: '', country: '',
        organization: { name: p.companyName || '', industry: '', website_url: p.fqdn ? `https://${p.fqdn}` : '' },
        _lusha: true, _contact_id: p.contactId, _person_id: p.personId,
        _has_email: p.hasEmails, _has_phone: p.hasPhones,
      }));
      apolloSelectedIds.clear();
      apolloTotalEntries = d1.totalResults || d1.data.length;
      renderApolloResults();
      document.getElementById('apolloResults').style.display = 'block';
      return;
    }
  }

  // Retry 2: only department, no location either
  const retryBody2 = {
    pages:   { page: 0, size: 25 },
    filters: { contacts: { include: { departments: contactInclude.departments || ['C-Suite'] } } },
  };
  const r2 = await fetch(`${LUSHA_PROXY}/search`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(retryBody2),
  });
  if (r2.ok) {
    const d2 = await r2.json();
    if (d2.data?.length > 0) {
      showToast(`Found ${d2.totalResults} results (location + industry filters removed — too narrow)`, 'info');
      apolloResults = d2.data.map(p => ({
        id: p.contactId || `lusha_${Math.random()}`,
        name: p.name || 'Unknown',
        first_name: p.name?.split(' ')[0] || '',
        last_name:  p.name?.split(' ').slice(1).join(' ') || '',
        title: p.jobTitle || '',
        email: '', sanitized_phone: '', linkedin_url: '', city: '', country: '',
        organization: { name: p.companyName || '', industry: '', website_url: p.fqdn ? `https://${p.fqdn}` : '' },
        _lusha: true, _contact_id: p.contactId, _person_id: p.personId,
        _has_email: p.hasEmails, _has_phone: p.hasPhones,
      }));
      apolloSelectedIds.clear();
      apolloTotalEntries = d2.totalResults || d2.data.length;
      renderApolloResults();
      document.getElementById('apolloResults').style.display = 'block';
      return;
    }
  }

  showToast('No results even with broad filters — check your Lusha plan allows prospecting API', 'error');
  return;
}
window.searchLusha = searchLusha;


  function showProxyOfflineBanner() {
    document.getElementById('apolloProxyBanner')?.remove();
    const banner = document.createElement('div');
    banner.id = 'apolloProxyBanner';
    banner.style.cssText = 'background:rgba(239,68,68,0.08);border:1px solid var(--red);border-radius:10px;padding:20px 24px;margin-bottom:20px';
    banner.innerHTML = `<div style="display:flex;gap:14px"><i class="fas fa-plug" style="color:var(--red);font-size:22px;flex-shrink:0;margin-top:2px"></i><div>
      <div style="font-weight:700;color:var(--red);margin-bottom:8px">Proxy server not running</div>
      <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px">Open a terminal and run:</p>
      <div style="background:var(--bg);border-radius:8px;padding:12px 16px;font-family:monospace;color:var(--green)">node server.js</div>
    </div></div>`;
    document.getElementById('apolloSearchCard')?.parentNode.insertBefore(banner, document.getElementById('apolloSearchCard'));
    showToast('Proxy not running. See instructions.', 'error');
  }

  function renderApolloResults() {
    const list    = document.getElementById('apolloResultsList');
    const countEl = document.getElementById('apolloResultCount');
    if (!list) return;
    if (countEl) countEl.textContent = apolloTotalEntries.toLocaleString();
    list.innerHTML = apolloResults.map(r => {
      const name     = r.name || `${r.first_name||''} ${r.last_name||''}`.trim() || 'Unknown';
      const title    = r.title || r.headline || '';
      const company  = r.organization?.name || r.organization_name || '';
      const email    = r.email || '';
      const location = [r.city || r.organization?.city, r.country || r.organization?.country].filter(Boolean).join(', ');
      const seniority = detectSeniority(title);
      const segKey    = detectMarketSegment(r.organization?.industry || r.industry || '', company, title);
      const seg       = MARKET_SEGMENTS[segKey] || MARKET_SEGMENTS.other;
      let score = 0;
      if (['legal_finance','consulting_strategy','fintech_trading','saas_software'].includes(segKey)) score += 30;
      else if (['hr_recruitment','edtech_education','real_estate'].includes(segKey)) score += 20;
      if (seniority === 'founder_ceo') score += 40;
      else if (seniority === 'c_suite') score += 35;
      else if (seniority === 'vp_director') score += 25;
      else if (seniority === 'manager_lead') score += 15;
      if (email) score += 5; if (r._has_phone) score += 5;
      const cls = score >= 70 ? 'high' : score >= 50 ? 'medium' : 'low';
      const sel = apolloSelectedIds.has(r.id);
      const src = r._lusha ? `<span class="lusha-badge"><i class="fas fa-gem"></i> Lusha</span>` : '';
      return `
        <div class="apollo-result-item ${sel ? 'selected' : ''}" data-id="${escapeHtml(r.id)}">
          <div class="apollo-result-checkbox"><input type="checkbox" ${sel ? 'checked' : ''} onchange="toggleApolloSelect('${escapeHtml(r.id)}')"></div>
          <div class="apollo-result-avatar">${getInitials(name)}</div>
          <div class="apollo-result-info">
            <div class="apollo-result-name">${escapeHtml(name)} ${src}</div>
            <div class="apollo-result-title">${escapeHtml(title || 'Unknown Title')}</div>
            <div class="apollo-result-company">${company ? `<i class="fas fa-building"></i> ${escapeHtml(company)}` : ''} ${location ? `· <i class="fas fa-map-marker-alt"></i> ${escapeHtml(location)}` : ''}</div>
            <div style="margin-top:4px">
              <span class="seg-pill" style="background:${seg.color}22;color:${seg.color};border:1px solid ${seg.color}44;padding:2px 7px;border-radius:20px;font-size:10px">${seg.icon} ${seg.label}</span>
            </div>
          </div>
          <div class="apollo-result-meta">
            <div class="apollo-result-icp ${cls}"><i class="fas fa-bullseye"></i> ${score} ICP</div>
            ${r._has_email ? `<div class="apollo-result-email"><i class="fas fa-envelope"></i> <em style="color:var(--yellow)">Email available</em></div>` : `<div class="apollo-result-email" style="color:var(--text-muted)"><i class="fas fa-envelope"></i> No email</div>`}
            ${r._has_phone ? `<div class="apollo-result-email"><i class="fas fa-phone"></i> <em style="color:var(--yellow)">Phone available</em></div>` : ''}
          </div>
        </div>`;
    }).join('');

    document.getElementById('apolloLoadMoreContainer')?.remove();
    if (apolloResults.length < apolloTotalEntries) {
      const lm = document.createElement('div');
      lm.id = 'apolloLoadMoreContainer';
      lm.className = 'apollo-load-more';
      lm.innerHTML = `<button id="apolloLoadMoreBtn" class="btn-ghost"><i class="fas fa-chevron-down"></i> Load more (${apolloResults.length} of ${apolloTotalEntries.toLocaleString()})</button>`;
      list.after(lm);
      document.getElementById('apolloLoadMoreBtn')?.addEventListener('click', () => searchApollo(apolloCurrentPage + 1));
    }
    updateApolloSelectionUI();
  }

  window.toggleApolloSelect = function(id) {
    if (apolloSelectedIds.has(id)) apolloSelectedIds.delete(id); else apolloSelectedIds.add(id);
    const item = document.querySelector(`.apollo-result-item[data-id="${id}"]`);
    if (item) { item.classList.toggle('selected', apolloSelectedIds.has(id)); const cb = item.querySelector('input[type="checkbox"]'); if (cb) cb.checked = apolloSelectedIds.has(id); }
    updateApolloSelectionUI();
  };

  function updateApolloSelectionUI() {
    const c = apolloSelectedIds.size;
    ['apolloSelectedCount','importCount'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = c; });
    const ib = document.getElementById('apolloImportSelectedBtn');
    const eb = document.getElementById('apolloEmailSelectedBtn2');
    if (ib) ib.disabled = c === 0;
    if (eb) eb.disabled = c === 0;
  }

  async function importApolloSelected() {
    if (!apolloSelectedIds.size) { showToast('Select leads first', 'error'); return; }
    const btn      = document.getElementById('apolloImportSelectedBtn');
    const selected = apolloResults.filter(r => apolloSelectedIds.has(r.id));
    btn.disabled   = true;
    btn.innerHTML  = '<i class="fas fa-spinner fa-spin"></i> Importing...';
    let ok = 0, fail = 0;
    try {
      for (const r of selected) {
        const name     = r.name || `${r.first_name||''} ${r.last_name||''}`.trim() || 'Unknown';
        const company  = r.organization?.name || r.organization_name || '';
        const industry = r.organization?.industry || r.industry || '';
        const title    = r.title || r.headline || '';
        const phone    = r.sanitized_phone || r.phone_numbers?.[0]?.sanitized_number || '';
        const lead     = { name };
        if (r._lusha && r._person_id && (r._has_email || r._has_phone)) {
      try {
        showToast(`Revealing contact data for ${name}...`, 'info');
        const revealRes  = await fetch(`${LUSHA_PROXY}/reveal`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ personId: r._person_id }),
        });
        const revealData = await revealRes.json();
        if (revealData.success) {
          if (revealData.email) lead.email = revealData.email;
          if (revealData.phone) lead.phone = revealData.phone;
          // Also grab linkedin from revealed data
          if (revealData.contact?.socialLinks?.linkedin) {
            lead.linkedin_url = revealData.contact.socialLinks.linkedin;
          }
          console.log(`✅ Revealed ${name}: ${revealData.email || 'no email'} | ${revealData.phone || 'no phone'}`);
        }
      } catch (e) {
        console.warn('Reveal failed for', name, e.message);
      }
    } else if (r.email) {
      lead.email = r.email;
    }
        if (r.email) lead.email = r.email;
        if (phone)   lead.phone = phone;
        if (company) lead.company  = company;
        if (industry) lead.industry = industry;
        if (title)   lead.job_title = title;
        if (r.linkedin_url) lead.linkedin_url = r.linkedin_url;
        if (r.organization?.website_url) lead.company_website = r.organization.website_url;
        if (r._lusha && r._contact_id && (r._has_email || r._has_phone)) {
      try {
        const revealRes = await fetch(`${LUSHA_PROXY}/reveal`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ contactId: r._contact_id }),
        });
        const revealData = await revealRes.json();
        if (revealData.success && revealData.contact) {
          const c = revealData.contact;
          // Try different field names Lusha might use
          const email = c.emailAddresses?.[0]?.email || c.emails?.[0]?.email || c.workEmail || null;
          const phone = c.phoneNumbers?.[0]?.number  || c.phones?.[0]?.normalizedNumber || null;
          if (email) lead.email = email;
          if (phone) lead.phone = phone;
          console.log(`✅ Revealed: ${name} | ${email || 'no email'} | ${phone || 'no phone'}`);
        }
      } catch (e) {
        console.warn('Reveal failed for', name, e.message);
      }
    } else if (r.email) {
      lead.email = r.email;
    }

        lead.lead_source        = r._lusha ? 'lusha' : 'apollo';
        lead.contact_stage      = 'new';
        lead.solutions_priority = 'not_assessed';
        lead.business_category  = detectMarketSegment(industry, company, title);
        lead.seniority_level    = detectSeniority(title);
        lead.remarks            = `Imported from ${r._lusha ? 'Lusha' : 'Apollo'} — ${new Date().toLocaleDateString()}`;
        const { error } = await supabaseClient.from('leads').insert([lead]).select();
        if (error) { console.error(`❌ ${name}:`, error.message); fail++; } else ok++;
      }
      if (ok) { showToast(`Imported ${ok} leads${fail ? ` (${fail} failed)` : ''}!`, 'success'); apolloSelectedIds.clear(); renderApolloResults(); await fetchLeads(); }
      else showToast('All imports failed. Check console.', 'error');
    } catch (err) { showToast('Import error: ' + err.message, 'error'); }
    finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-download"></i> Import (<span id="importCount">0</span>)'; updateApolloSelectionUI(); }
  }

  // ============================================
  // LUSHA ENRICHMENT
  // ============================================
  async function checkLushaCredits() {
    try {
      const r  = await fetch(`${LUSHA_PROXY}/credits`);
      const d  = await r.json();
      const el = document.getElementById('lushaCreditsDisplay');
      if (el) { const rem = d.data?.remainingCredits ?? '?'; const tot = d.data?.totalCredits ?? '?'; el.innerHTML = `<i class="fas fa-coins" style="color:var(--yellow)"></i> ${rem}/${tot} credits`; }
    } catch (e) { const el = document.getElementById('lushaCreditsDisplay'); if (el) el.innerHTML = `<i class="fas fa-plug" style="color:var(--red)"></i> Proxy offline`; }
  }

  async function enrichLeadWithLusha(leadId) {
    const lead = state.leads.find(l => l.id === leadId);
    if (!lead) return;
    const btn = document.querySelector(`[data-lusha-id="${leadId}"]`);
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }
    try {
      const r    = await fetch(`${LUSHA_PROXY}/enrich-lead`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ name:lead.name, company:lead.company, email:lead.email, linkedin_url:lead.linkedin_url }) });
      const data = await r.json();
      if (!data.success) { showToast(`Lusha: ${data.error || 'Not found'}`, 'error'); return; }
      const e = data.enriched;
      const updates = {};
      if (!lead.email           && e.email)            updates.email           = e.email;
      if (!lead.phone           && e.phone)            updates.phone           = e.phone;
      if (!lead.job_title       && e.job_title)        updates.job_title       = e.job_title;
      if (!lead.company_website && e.company_website)  updates.company_website = e.company_website;
      if (!lead.industry        && e.industry)         updates.industry        = e.industry;
      if (!lead.company_size    && e.company_size)     updates.company_size    = e.company_size;
      if (!lead.linkedin_url    && e.linkedin_url)     updates.linkedin_url    = e.linkedin_url;
      updates.remarks = (lead.remarks ? lead.remarks + '\n' : '') + `Lusha enriched (${new Date().toLocaleDateString()}): ${[e.email && 'email', e.phone && 'phone'].filter(Boolean).join(', ') || 'no new data'}`;
      if (Object.keys(updates).length > 1) {
        const { error } = await supabaseClient.from('leads').update(updates).eq('id', leadId);
        if (error) throw error;
        showToast(`✅ Enriched ${lead.name}: ${[e.email && 'email', e.phone && 'phone'].filter(Boolean).join(' + ') || 'no new data'}`, 'success');
        await fetchLeads();
        refreshCurrentView();
      } else showToast('Already has all data Lusha found', 'info');
    } catch (err) { showToast('Enrich failed: ' + err.message, 'error'); }
    finally { if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-search-plus"></i>'; } }
  }
  window.enrichLeadWithLusha = enrichLeadWithLusha;

  async function bulkEnrichWithLusha() {
    const needs = state.leads.filter(l => !l.email || !l.phone);
    if (!needs.length) { showToast('All leads already have email and phone!', 'info'); return; }
    const btn = document.getElementById('lushaEnrichAllBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> 0/${needs.length}...`; }
    let enriched = 0, notFound = 0;
    for (let i = 0; i < needs.length; i++) {
      const lead = needs[i];
      if (btn) btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${i+1}/${needs.length}...`;
      try {
        const r    = await fetch(`${LUSHA_PROXY}/enrich-lead`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ name:lead.name, company:lead.company, email:lead.email, linkedin_url:lead.linkedin_url }) });
        const data = await r.json();
        if (data.success && data.enriched) {
          const e = data.enriched;
          const updates = {};
          if (!lead.email           && e.email)           updates.email           = e.email;
          if (!lead.phone           && e.phone)           updates.phone           = e.phone;
          if (!lead.company_website && e.company_website) updates.company_website = e.company_website;
          if (!lead.industry        && e.industry)        updates.industry        = e.industry;
          if (!lead.linkedin_url    && e.linkedin_url)    updates.linkedin_url    = e.linkedin_url;
          if (Object.keys(updates).length) { await supabaseClient.from('leads').update(updates).eq('id', lead.id); enriched++; }
        } else notFound++;
      } catch (e) { notFound++; }
      await new Promise(r => setTimeout(r, 200));
    }
    await fetchLeads();
    refreshCurrentView();
    showToast(`Lusha: ${enriched} enriched, ${notFound} not found`, enriched ? 'success' : 'info');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> Enrich All with Lusha'; }
  }
  window.bulkEnrichWithLusha = bulkEnrichWithLusha;

  function addLushaButtonsToTable() {
    document.querySelectorAll('#leadsTableBody tr').forEach(row => {
      const actionCell = row.querySelector('.action-buttons');
      if (!actionCell || actionCell.querySelector('[data-lusha-id]')) return;
      const match  = row.querySelector('.btn-icon[onclick*="openEditModal"]')?.getAttribute('onclick')?.match(/openEditModal\('([^']+)'\)/);
      if (!match) return;
      const leadId = match[1];
      const lead   = state.leads.find(l => l.id === leadId);
      if (!lead) return;
      const hasAll = !!(lead.email && lead.phone);
      const btn    = document.createElement('button');
      btn.className       = 'btn-icon';
      btn.title           = hasAll ? 'Email & phone verified by Lusha' : 'Enrich with Lusha';
      btn.dataset.lushaId = leadId;
      btn.style.color     = hasAll ? 'var(--green)' : 'var(--yellow)';
      btn.innerHTML       = `<i class="fas ${hasAll ? 'fa-check-circle' : 'fa-search-plus'}"></i>`;
      if (!hasAll) btn.onclick = () => enrichLeadWithLusha(leadId);
      actionCell.insertBefore(btn, actionCell.firstChild);
    });
  }

  // ============================================
  // LEAD INTELLIGENCE
  // ============================================
  function renderEmailVerifyResult(data) {
    const cls   = data.status === 'valid' ? 'valid' : data.status === 'risky' ? 'risky' : 'invalid';
    const label = data.status === 'valid' ? '✅ Valid' : data.status === 'risky' ? '⚠️ Risky' : '❌ Invalid';
    return `
      <div class="verify-result ${cls}">
        <div style="font-weight:700;font-size:15px;margin-bottom:6px">${label} — Score ${data.score}/100</div>
        <div class="verify-checks">
          <div class="verify-check ${data.valid_format  ? 'pass' : 'fail'}"><i class="fas ${data.valid_format  ? 'fa-check' : 'fa-times'}"></i> Valid format</div>
          <div class="verify-check ${data.domain_exists ? 'pass' : 'fail'}"><i class="fas ${data.domain_exists ? 'fa-check' : 'fa-times'}"></i> Domain exists</div>
          <div class="verify-check ${data.mx_records    ? 'pass' : 'fail'}"><i class="fas ${data.mx_records    ? 'fa-check' : 'fa-times'}"></i> Mail server (MX)</div>
          <div class="verify-check ${!data.disposable   ? 'pass' : 'fail'}"><i class="fas ${!data.disposable   ? 'fa-check' : 'fa-times'}"></i> Not disposable</div>
          <div class="verify-check ${!data.free_provider ? 'pass' : 'warn'}"><i class="fas ${!data.free_provider ? 'fa-check' : 'fa-exclamation-triangle'}"></i> ${data.free_provider ? 'Free email provider' : 'Business email'}</div>
        </div>
      </div>`;
  }

  async function quickVerifyEmail() {
    const email  = document.getElementById('quickVerifyEmail')?.value?.trim();
    if (!email)  { showToast('Enter an email address', 'error'); return; }
    const btn    = document.getElementById('quickVerifyBtn');
    const resDiv = document.getElementById('quickVerifyResult');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
    try {
      const r    = await fetch(VERIFY_PROXY, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email}) });
      const data = await r.json();
      resDiv.style.display = 'block';
      resDiv.innerHTML     = renderEmailVerifyResult(data);
    } catch (err) { showToast('Proxy not running', 'error'); }
    finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check-circle"></i> Verify Email'; }
  }

  async function qualifyLead() {
    const company  = document.getElementById('qualifyCompany')?.value?.trim();
    const website  = document.getElementById('qualifyWebsite')?.value?.trim();
    const email    = document.getElementById('qualifyEmail')?.value?.trim();
    const industry = document.getElementById('qualifyIndustry')?.value?.trim();
    const jobTitle = document.getElementById('qualifyJobTitle')?.value?.trim();
    if (!company) { showToast('Company name is required', 'error'); return; }
    const btn    = document.getElementById('qualifyBtn');
    const resDiv = document.getElementById('qualifyResults');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
    try {
      const r = await fetch(QUALIFY_PROXY, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ name:'', company, email, website, industry, job_title:jobTitle }) });
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      renderQualificationResults(data);
      resDiv.style.display = 'block';
      resDiv.scrollIntoView({ behavior:'smooth' });
    } catch (err) {
      if (err.message.includes('fetch')) showToast('Start node server.js first', 'error');
      else showToast('Analysis failed: ' + err.message, 'error');
    } finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-search"></i> Analyze & Qualify'; }
  }

  function renderQualificationResults(data) {
    window._lastQualification = data;
    const score    = data.overall_score || 0;
    const priority = data.priority      || 'not_assessed';
    const cls      = { critical:'critical', high:'high', medium:'medium', low:'low' }[priority] || 'low';
    const need     = score >= 80 ? 'CRITICAL NEED 🔥' : score >= 65 ? 'HIGH NEED — Strong Opportunity' : score >= 45 ? 'MODERATE NEED — Worth Pursuing' : 'LOW NEED — Nurture';
    const scoreHeader = document.getElementById('qualifyScoreHeader');
    if (scoreHeader) {
      scoreHeader.innerHTML = `
        <div class="qualify-score-circle ${cls}">${score}<span style="font-size:11px;font-weight:400">/100</span></div>
        <div class="qualify-score-info">
          <div class="qualify-score-title">${escapeHtml(data.lead?.company || 'Unknown')}</div>
          <div class="qualify-score-subtitle">${need}</div>
          <div class="qualify-tags">
            ${data.website_analysis?.reachable ? `<span class="qualify-tag ${data.website_analysis.score>=70?'good':data.website_analysis.score>=40?'warning':'bad'}">🌐 Site: ${data.website_analysis.score}/100</span>` : ''}
            ${data.lusha_enrichment?.success ? `<span class="qualify-tag good"><i class="fas fa-gem"></i> Lusha verified</span>` : ''}
            <span class="qualify-tag ${cls==='critical'||cls==='high'?'bad':'warning'}">${PRIORITIES[priority]?.emoji||'⚪'} ${PRIORITIES[priority]?.label||priority}</span>
          </div>
        </div>
        <div style="flex-shrink:0;display:flex;flex-direction:column;gap:8px">
          <button onclick="saveQualificationToLead()" class="btn-primary"><i class="fas fa-save"></i> Save to Leads</button>
          ${data.ai_analysis?.analysis?.suggested_subject_line ? `<button onclick="useSubjectForEmail('${escapeHtml(data.ai_analysis.analysis.suggested_subject_line)}')" class="btn-ghost btn-sm"><i class="fas fa-paper-plane"></i> Use in Email</button>` : ''}
        </div>`;
    }

    const webCard = document.getElementById('websiteAnalysisCard');
    const webResult = document.getElementById('websiteAnalysisResult');
    if (data.website_analysis && webCard && webResult) {
      webCard.style.display = 'block';
      const wa = data.website_analysis;
      webResult.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
          <span style="font-size:13px;color:var(--text-secondary)">${wa.reachable?'🟢 Reachable':'🔴 Unreachable'} · ${wa.load_time_ms}ms</span>
          <span style="font-weight:800;font-size:22px;color:${wa.score>=70?'var(--green)':wa.score>=40?'var(--yellow)':'var(--red)'}">${wa.score}/100</span>
        </div>
        ${wa.title ? `<div style="font-size:13px;margin-bottom:4px"><strong>Title:</strong> ${escapeHtml(wa.title)}</div>` : ''}
        ${wa.tech_detected?.length ? `<div style="margin-bottom:14px"><div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px">Tech Stack</div><div class="tech-tags">${wa.tech_detected.map(t=>`<span class="tech-tag">${escapeHtml(t)}</span>`).join('')}</div></div>` : ''}
        ${(wa.issues||[]).map(i=>`
          <div class="issue-item ${i.severity}">
            <div class="issue-icon">${i.severity==='critical'?'🔴':i.severity==='high'?'🟠':i.severity==='medium'?'🟡':'🟢'}</div>
            <div class="issue-content">
              <div class="issue-text">${escapeHtml(i.issue)}</div>
              <div class="issue-fix">💡 ${escapeHtml(i.fix)}</div>
            </div>
          </div>`).join('')}`;
    } else if (webCard) webCard.style.display = 'none';

    const aiCard = document.getElementById('aiAnalysisCard');
    const aiResult = document.getElementById('aiAnalysisResult');
    if (aiCard && aiResult) {
      if (data.ai_analysis?.analysis && !data.ai_analysis.analysis.parse_error) {
        aiCard.style.display = 'block';
        const ai = data.ai_analysis.analysis;
        aiResult.innerHTML = `
          ${ai.company_summary ? `<div class="ai-section"><div class="ai-section-title">Company Summary</div><p style="font-size:13px;color:var(--text-secondary);line-height:1.6">${escapeHtml(ai.company_summary)}</p></div>` : ''}
          ${ai.pain_points?.length ? `<div class="ai-section"><div class="ai-section-title">Pain Points</div>${ai.pain_points.map(p=>`<div class="ai-pain-point"><span>⚡</span><span>${escapeHtml(p)}</span></div>`).join('')}</div>` : ''}
          ${ai.recommended_pitch ? `<div class="ai-section"><div class="ai-section-title">Recommended Pitch</div><div class="ai-pitch">${escapeHtml(ai.recommended_pitch)}</div></div>` : ''}
          ${ai.suggested_subject_line ? `<div class="ai-section"><div class="ai-section-title">Email Subject Line</div><div style="padding:10px 14px;background:var(--bg-elevated);border-radius:var(--radius-sm);font-size:13px;cursor:pointer;display:flex;justify-content:space-between;align-items:center" onclick="navigator.clipboard.writeText('${escapeHtml(ai.suggested_subject_line)}');showToast('Copied!','success')">${escapeHtml(ai.suggested_subject_line)} <i class="fas fa-copy" style="color:var(--text-muted)"></i></div></div>` : ''}
          ${ai.key_talking_points?.length ? `<div class="ai-section"><div class="ai-section-title">Key Talking Points</div><ul class="ai-talking-points">${ai.key_talking_points.map(p=>`<li>${escapeHtml(p)}</li>`).join('')}</ul></div>` : ''}`;
      } else { aiCard.style.display = 'block'; aiResult.innerHTML = '<p style="color:var(--text-muted);padding:10px 0">AI analysis unavailable.</p>'; }
    }

    const oppCard = document.getElementById('opportunitiesCard');
    const oppResult = document.getElementById('opportunitiesResult');
    const allOpps = [...(data.website_analysis?.opportunities||[]), ...(data.ai_analysis?.analysis?.opportunities||[])];
    const unique  = []; const seen = new Set();
    allOpps.forEach(o => { const k = (o.service||'').toLowerCase(); if (!seen.has(k)) { seen.add(k); unique.push(o); } });
    if (unique.length && oppCard && oppResult) {
      oppCard.style.display = 'block';
      oppResult.innerHTML = unique.sort((a, b) => ({critical:0,high:1,medium:2,low:3}[a.priority]||3) - ({critical:0,high:1,medium:2,low:3}[b.priority]||3))
        .map(o => `
          <div class="opportunity-item">
            <div class="opportunity-service"><span class="badge badge-${o.priority}" style="font-size:10px">${PRIORITIES[o.priority]?.emoji||'⚪'}</span>${escapeHtml(o.service)}</div>
            <div class="opportunity-desc">${escapeHtml(o.description)}</div>
            ${o.estimated_impact ? `<div class="opportunity-impact">📈 ${escapeHtml(o.estimated_impact)}</div>` : ''}
          </div>`).join('');
    } else if (oppCard) oppCard.style.display = 'none';
  }

  async function saveQualificationToLead() {
    const q = window._lastQualification;
    if (!q) return;
    const company  = q.lead?.company || '';
    const existing = state.leads.find(l => l.company?.toLowerCase() === company.toLowerCase());
    const leadData = {
      company, email: q.lead?.email||null, industry: q.lead?.industry||null,
      company_website: q.lead?.website||null, job_title: q.lead?.job_title||null,
      solutions_priority: q.priority||'not_assessed', icp_match_score: q.overall_score||0,
      business_category: detectMarketSegment(q.lead?.industry, company, q.lead?.job_title),
      problems_identified: q.website_analysis?.issues?.map(i=>`[${i.severity.toUpperCase()}] ${i.issue}`).join('\n')||null,
      remarks: [`Qualification Score: ${q.overall_score}/100`, q.ai_analysis?.analysis?.recommended_pitch?`Pitch: ${q.ai_analysis.analysis.recommended_pitch}`:'', q.website_analysis?`Website: ${q.website_analysis.score}/100, ${q.website_analysis.issues?.length||0} issues`:'', `Analyzed: ${new Date().toLocaleDateString()}`].filter(Boolean).join('\n'),
    };
    if (q.lusha_enrichment?.success && q.lusha_enrichment.enriched) {
      const e = q.lusha_enrichment.enriched;
      if (!leadData.email && e.email) leadData.email = e.email;
      if (e.phone) leadData.phone = e.phone;
      if (e.linkedin_url) leadData.linkedin_url = e.linkedin_url;
    }
    try {
      if (existing) {
        const { error } = await supabaseClient.from('leads').update(leadData).eq('id', existing.id);
        if (error) throw error;
        showToast(`Updated lead: ${company}`, 'success');
      } else {
        leadData.name          = q.lead?.job_title ? `${q.lead.job_title} at ${company}` : company;
        leadData.lead_source   = 'manual_research';
        leadData.contact_stage = 'new';
        const { error } = await supabaseClient.from('leads').insert(leadData);
        if (error) throw error;
        showToast(`Saved new lead: ${company}`, 'success');
      }
      await fetchLeads();
    } catch (err) { showToast('Save failed: ' + err.message, 'error'); }
  }

  function useSubjectForEmail(subject) {
    document.getElementById('emailSubject').value = subject;
    switchView('bulkemail');
    showToast('Subject line added to email composer', 'success');
  }
  window.useSubjectForEmail = useSubjectForEmail;

  async function bulkQualifyLeads() {
    const leadsWithSite = state.leads.filter(l => l.company_website?.trim());
    if (!leadsWithSite.length) { showToast('No leads have website URLs', 'error'); return; }
    const btn = document.getElementById('bulkQualifyBtn');
    const resultsDiv  = document.getElementById('bulkQualifyResults');
    const resultsList = document.getElementById('bulkResultsList');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Qualifying...';
    resultsDiv.style.display = 'block';
    resultsList.innerHTML = '<p style="text-align:center;padding:30px;color:var(--text-muted)"><i class="fas fa-spinner fa-spin"></i> Processing...</p>';
    const results = [];
    for (let i = 0; i < leadsWithSite.length; i++) {
      const lead = leadsWithSite[i];
      btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${i+1}/${leadsWithSite.length}...`;
      try {
        const r    = await fetch(QUALIFY_PROXY, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ name:lead.name, company:lead.company||'', email:lead.email||'', website:lead.company_website, industry:lead.industry||'', job_title:lead.job_title||'' }) });
        const data = await r.json();
        results.push({ lead, qualification: data });
        await supabaseClient.from('leads').update({ solutions_priority: data.priority||'not_assessed', icp_match_score: data.overall_score||0, problems_identified: data.website_analysis?.issues?.map(i=>`[${i.severity.toUpperCase()}] ${i.issue}`).join('\n')||lead.problems_identified }).eq('id', lead.id);
      } catch (err) { results.push({ lead, error: err.message }); }
      await new Promise(r => setTimeout(r, 500));
    }
    results.sort((a, b) => (b.qualification?.overall_score||0) - (a.qualification?.overall_score||0));
    resultsList.innerHTML = results.map(r => {
      const s   = r.qualification?.overall_score || 0;
      const p   = r.qualification?.priority || 'not_assessed';
      const cls = { critical:'critical', high:'high', medium:'medium', low:'low' }[p] || 'low';
      return `
        <div class="bulk-result-item" onclick="openEditModal('${r.lead.id}')">
          <div class="bulk-result-score qualify-score-circle ${cls}" style="width:48px;height:48px;font-size:16px;border-width:2px">${s}</div>
          <div class="bulk-result-info">
            <div class="bulk-result-name">${escapeHtml(r.lead.name)}</div>
            <div class="bulk-result-company">${escapeHtml(r.lead.company||'')} ${r.lead.company_website?`· ${escapeHtml(r.lead.company_website)}`:''}</div>
          </div>
          <span class="badge badge-${p}">${PRIORITIES[p]?.emoji||''} ${PRIORITIES[p]?.label||''}</span>
        </div>`;
    }).join('');
    await fetchLeads();
    showToast(`Qualified ${results.length} leads!`, 'success');
    btn.disabled = false; btn.innerHTML = '<i class="fas fa-bolt"></i> Qualify All with Websites';
  }

  async function verifyAllEmails() {
    const leads = state.leads.filter(l => l.email?.trim());
    if (!leads.length) { showToast('No leads have emails', 'error'); return; }
    const btn = document.getElementById('verifyAllEmailsBtn');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
    let verified = 0, valid = 0, invalid = 0;
    for (const lead of leads) {
      try {
        const r    = await fetch(VERIFY_PROXY, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email:lead.email}) });
        const data = await r.json();
        verified++;
        if (data.status === 'valid') valid++;
        else if (['invalid','disposable','invalid_domain','no_mail_server'].includes(data.status)) invalid++;
        btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${verified}/${leads.length}...`;
        await new Promise(r => setTimeout(r, 100));
      } catch (e) { console.error(`Verify failed: ${lead.email}`, e); }
    }
    showToast(`Verified ${verified} emails: ${valid} valid, ${invalid} invalid`, 'success');
    btn.disabled = false; btn.innerHTML = '<i class="fas fa-envelope-circle-check"></i> Verify All Emails';
  }

  // ============================================
  // BULK EMAIL — GMAIL POWERED
  // ============================================
  function loadEmailTemplates() {
    try { const saved = localStorage.getItem('onnea_email_templates'); emailTemplates = saved ? JSON.parse(saved) : getDefaultTemplates(); }
    catch (e) { emailTemplates = getDefaultTemplates(); }
  }

  function saveEmailTemplates() { localStorage.setItem('onnea_email_templates', JSON.stringify(emailTemplates)); }

  function getDefaultTemplates() {
    return [
      { id:1, name:'Cold Outreach', subject:'{{first_name}}, quick question about {{company}}', body:`Hi {{first_name}},\n\nI came across {{company}} and was impressed by what you're building in {{industry}}.\n\nAt OnneaLabs, we help businesses like yours grow faster through high-converting websites, automation, and smart digital strategy.\n\nI did a quick audit of your online presence and spotted a few things that could be holding you back. Happy to share — no strings attached.\n\nWould you be open to a 15-minute call this week?\n\nBest,\nOnneaLabs Team`, createdAt: new Date().toISOString() },
      { id:2, name:'Follow Up',    subject:'Following up — {{company}}', body:`Hi {{first_name}},\n\nJust circling back on my previous note.\n\nI genuinely think there are 2-3 quick wins for {{company}} that would drive measurable results within 30 days.\n\nWould a quick call work?\n\nBest,\nOnneaLabs Team`, createdAt: new Date().toISOString() },
      { id:3, name:'Free Audit',   subject:'Free audit for {{company}} — {{first_name}}', body:`Hi {{first_name}},\n\nI'd like to offer {{company}} a complimentary digital audit — completely free, no pitch.\n\nIn 15 minutes, I'll walk you through:\n• Your biggest growth bottlenecks online\n• What your competitors are doing better\n• 3 quick wins you can implement immediately\n\nInterested? Just reply and we'll find a time.\n\nBest,\nOnneaLabs Team`, createdAt: new Date().toISOString() },
    ];
  }

  async function renderBulkEmailView() {
    loadEmailTemplates();
    if (!state.leadsLoaded || state.leads.length === 0) {
      const list = document.getElementById('recipientLeadsList');
      if (list) list.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-muted)"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
      await fetchLeads();
    }
    renderRecipientList();
    renderApolloRecipientTab();
    renderSelectedRecipients();
    updateSendButton();

    // Check Gmail status
    checkGmailStatus();
  }

  async function checkGmailStatus() {
    const statusEl = document.getElementById('gmailStatus');
    if (!statusEl) return;
    try {
      const r    = await fetch(`${PROXY_BASE}/`);
      const data = await r.json();
      const ok   = data.keys?.gmail === '✅';
      statusEl.innerHTML = ok
        ? `<span style="color:var(--green)"><i class="fas fa-check-circle"></i> Gmail connected — team@onnealabs.com</span>`
        : `<span style="color:var(--red)"><i class="fas fa-exclamation-circle"></i> Gmail not configured in server.js</span>`;
    } catch (e) {
      statusEl.innerHTML = `<span style="color:var(--red)"><i class="fas fa-plug"></i> Server offline — run node server.js</span>`;
    }
  }

  function renderRecipientList() {
    const list   = document.getElementById('recipientLeadsList');
    if (!list) return;
    const search  = (document.getElementById('recipientLeadSearch')?.value || '').toLowerCase().trim();
    const stage   = document.getElementById('recipientStageFilter')?.value || '';
    const market  = document.getElementById('recipientMarketFilter')?.value || '';
    let filtered  = state.leads.filter(l => l.email?.trim());
    if (search)  filtered = filtered.filter(l => [l.name,l.email,l.company].some(v=>(v||'').toLowerCase().includes(search)));
    if (stage)   filtered = filtered.filter(l => l.contact_stage === stage);
    if (market)  filtered = filtered.filter(l => {
      const seg = l.business_category || detectMarketSegment(l.industry, l.company, l.job_title);
      return seg === market;
    });

    if (!filtered.length) {
      list.innerHTML = `<div style="text-align:center;padding:30px;color:var(--text-muted)"><i class="fas fa-inbox" style="font-size:24px;margin-bottom:10px;display:block"></i>${state.leads.length===0?'No leads yet':search||stage||market?'No leads match filter':'No leads have email addresses'}</div>`;
      return;
    }
    list.innerHTML = filtered.map(l => {
      const sel = emailRecipients.some(r => r.email === l.email);
      const seg = MARKET_SEGMENTS[l.business_category || detectMarketSegment(l.industry, l.company, l.job_title)] || MARKET_SEGMENTS.other;
      return `
        <div class="recipient-item ${sel?'selected':''}" onclick="toggleRecipient('${l.id}')" style="cursor:pointer">
          <input type="checkbox" ${sel?'checked':''} onclick="event.stopPropagation();toggleRecipient('${l.id}')">
          <div class="recipient-info">
            <div class="recipient-name">${escapeHtml(l.name)}</div>
            <div class="recipient-email">${escapeHtml(l.email)}${l.company?` · ${escapeHtml(l.company)}`:''}</div>
            <div style="margin-top:2px"><span style="font-size:10px;color:${seg.color}">${seg.icon} ${seg.label}</span></div>
          </div>
          ${STAGES[l.contact_stage] ? `<span class="badge badge-${l.contact_stage}" style="font-size:10px;flex-shrink:0">${STAGES[l.contact_stage].icon}</span>` : ''}
        </div>`;
    }).join('');
  }

  window.toggleRecipient = function(leadId) {
    const lead = state.leads.find(l => l.id === leadId);
    if (!lead || !lead.email) return;
    const idx = emailRecipients.findIndex(r => r.email === lead.email);
    if (idx >= 0) emailRecipients.splice(idx, 1);
    else emailRecipients.push({ id:lead.id, name:lead.name||'', first_name:(lead.name||'').split(' ')[0]||'', email:lead.email, company:lead.company||'', job_title:lead.job_title||'', industry:lead.industry||'', source:'lead' });
    renderRecipientList();
    renderSelectedRecipients();
    updateSendButton();
  };

  function renderApolloRecipientTab() {
    const tab = document.getElementById('recipientApolloTab');
    if (!tab) return;
    const withEmail = apolloResults.filter(r => apolloSelectedIds.has(r.id) && r.email);
    if (!withEmail.length) {
      tab.innerHTML = `<div style="text-align:center;padding:30px;color:var(--text-muted)"><i class="fas fa-satellite-dish" style="font-size:24px;margin-bottom:12px;display:block"></i><p>${apolloResults.length?'No Apollo leads selected with email.':'Search Apollo/Lusha first.'}</p><button onclick="switchView('apollo')" class="btn-primary btn-sm" style="margin-top:12px"><i class="fas fa-search"></i> Go to Search</button></div>`;
      return;
    }
    tab.innerHTML = `<div style="margin-bottom:10px;font-size:13px;color:var(--text-muted)">${withEmail.length} leads with email</div>` +
      withEmail.map(r => {
        const name = r.name || `${r.first_name||''} ${r.last_name||''}`.trim();
        const sel  = emailRecipients.some(e => e.email === r.email);
        return `<div class="recipient-item ${sel?'selected':''}" onclick="toggleApolloEmailRecipient('${r.id}')" style="cursor:pointer">
          <input type="checkbox" ${sel?'checked':''} onclick="event.stopPropagation();toggleApolloEmailRecipient('${r.id}')">
          <div class="recipient-info"><div class="recipient-name">${escapeHtml(name)}</div><div class="recipient-email">${escapeHtml(r.email)}</div></div>
        </div>`;
      }).join('') +
      `<button onclick="addAllApolloToRecipients()" class="btn-ghost btn-sm" style="margin-top:10px;width:100%"><i class="fas fa-plus"></i> Add All</button>`;
  }

  window.toggleApolloEmailRecipient = function(id) {
    const r = apolloResults.find(a => a.id === id);
    if (!r || !r.email) return;
    const idx = emailRecipients.findIndex(e => e.email === r.email);
    if (idx >= 0) emailRecipients.splice(idx, 1);
    else { const name = r.name || `${r.first_name||''} ${r.last_name||''}`.trim(); emailRecipients.push({ id:r.id, name, first_name:r.first_name||name.split(' ')[0]||'', email:r.email, company:r.organization?.name||'', job_title:r.title||'', industry:r.organization?.industry||r.industry||'', source:r._lusha?'lusha':'apollo' }); }
    renderApolloRecipientTab();
    renderSelectedRecipients();
    updateSendButton();
  };

  window.addAllApolloToRecipients = function() {
    let added = 0;
    apolloResults.filter(r => apolloSelectedIds.has(r.id) && r.email).forEach(r => {
      if (emailRecipients.some(e => e.email === r.email)) return;
      const name = r.name || `${r.first_name||''} ${r.last_name||''}`.trim();
      emailRecipients.push({ id:r.id, name, first_name:r.first_name||name.split(' ')[0]||'', email:r.email, company:r.organization?.name||'', job_title:r.title||'', industry:r.organization?.industry||r.industry||'', source:r._lusha?'lusha':'apollo' });
      added++;
    });
    renderApolloRecipientTab();
    renderSelectedRecipients();
    updateSendButton();
    showToast(`Added ${added} recipients`, 'success');
  };

  function addManualEmails() {
    const ta = document.getElementById('manualEmails');
    if (!ta) return;
    let added = 0;
    ta.value.split('\n').map(l => l.trim()).filter(Boolean).forEach(line => {
      const match = line.match(/^(?:(.+?)\s+)?<?([^\s<>]+@[^\s<>]+)>?$/);
      if (!match) return;
      const name  = match[1]?.trim() || match[2].split('@')[0];
      const email = match[2].trim().toLowerCase();
      if (!emailRecipients.some(r => r.email === email)) {
        emailRecipients.push({ id:`manual_${Date.now()}_${added}`, name, first_name:name.split(' ')[0], email, company:'', job_title:'', industry:'', source:'manual' });
        added++;
      }
    });
    ta.value = '';
    renderSelectedRecipients();
    updateSendButton();
    showToast(`Added ${added} email${added !== 1?'s':''}`, added ? 'success' : 'info');
  }

  function renderSelectedRecipients() {
    const list    = document.getElementById('selectedRecipientsList');
    const countEl = document.getElementById('selectedRecipientCount');
    const rcEl    = document.getElementById('recipientCount');
    if (countEl) countEl.textContent = emailRecipients.length;
    if (rcEl)    rcEl.textContent    = `${emailRecipients.length} selected`;
    if (!list) return;
    if (!emailRecipients.length) { list.innerHTML = '<p style="color:var(--text-muted);font-size:12px;text-align:center;padding:8px 0">No recipients yet</p>'; return; }
    list.innerHTML = emailRecipients.map(r => `
      <div class="selected-recipient-tag">
        <span title="${escapeHtml(r.email)}">${escapeHtml(r.name || r.email)}</span>
        <button onclick="removeRecipient('${escapeHtml(r.email)}')" title="Remove">&times;</button>
      </div>`).join('');
  }

  window.removeRecipient = function(email) {
    emailRecipients = emailRecipients.filter(r => r.email !== email);
    renderRecipientList();
    renderApolloRecipientTab();
    renderSelectedRecipients();
    updateSendButton();
  };

  function selectAllRecipients() {
    const stage  = document.getElementById('recipientStageFilter')?.value  || '';
    const search = (document.getElementById('recipientLeadSearch')?.value  || '').toLowerCase();
    const market = document.getElementById('recipientMarketFilter')?.value || '';
    let leads    = state.leads.filter(l => l.email?.trim());
    if (stage)   leads = leads.filter(l => l.contact_stage === stage);
    if (search)  leads = leads.filter(l => [l.name,l.email,l.company].some(v=>(v||'').toLowerCase().includes(search)));
    if (market)  leads = leads.filter(l => {
      const seg = l.business_category || detectMarketSegment(l.industry, l.company, l.job_title);
      return seg === market;
    });
    let added = 0;
    leads.forEach(l => {
      if (!emailRecipients.some(r => r.email === l.email)) {
        emailRecipients.push({ id:l.id, name:l.name||'', first_name:(l.name||'').split(' ')[0]||'', email:l.email, company:l.company||'', job_title:l.job_title||'', industry:l.industry||'', source:'lead' });
        added++;
      }
    });
    renderRecipientList();
    renderSelectedRecipients();
    updateSendButton();
    showToast(`Added ${added} recipient${added!==1?'s':''}`, 'success');
  }

  function clearAllRecipients() {
    emailRecipients = [];
    renderRecipientList();
    renderApolloRecipientTab();
    renderSelectedRecipients();
    updateSendButton();
    showToast('Recipients cleared', 'info');
  }

  function updateSendButton() {
    const btn = document.getElementById('sendBulkEmailBtn');
    const cnt = document.getElementById('sendCount');
    if (btn) { btn.disabled = emailRecipients.length === 0; btn.style.opacity = emailRecipients.length ? '1' : '0.5'; }
    if (cnt) cnt.textContent = emailRecipients.length;
  }

  function insertPlaceholder(ph) {
    const ta = document.getElementById('emailBody');
    if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    ta.value = ta.value.substring(0, s) + ph + ta.value.substring(e);
    ta.focus();
    ta.selectionStart = ta.selectionEnd = s + ph.length;
  }

  function previewEmail() {
    if (!emailRecipients.length) { showToast('Select at least one recipient', 'error'); return; }
    const subj = document.getElementById('emailSubject')?.value?.trim();
    const body = document.getElementById('emailBody')?.value?.trim();
    if (!subj) { showToast('Enter a subject line', 'error'); return; }
    if (!body) { showToast('Write your email body', 'error'); return; }
    currentPreviewIndex = 0;
    updatePreview();
    document.getElementById('emailPreviewModal')?.classList.remove('hidden');
  }

  function updatePreview() {
    const r = emailRecipients[currentPreviewIndex];
    if (!r) return;
    const subj = document.getElementById('emailSubject')?.value || '';
    const body = document.getElementById('emailBody')?.value   || '';
    document.getElementById('previewTo').textContent     = `${r.name} <${r.email}>`;
    document.getElementById('previewSubject').textContent = replacePlaceholders(subj, r);
    const bodyEl = document.getElementById('previewBody');
    if (bodyEl) bodyEl.innerHTML = replacePlaceholders(body, r).split('\n').map(l => `<div>${escapeHtml(l)||'&nbsp;'}</div>`).join('');
    document.getElementById('previewCounter').textContent = `${currentPreviewIndex + 1} of ${emailRecipients.length}`;
    document.getElementById('prevPreviewBtn').disabled    = currentPreviewIndex === 0;
    document.getElementById('nextPreviewBtn').disabled    = currentPreviewIndex === emailRecipients.length - 1;
  }

  // ── MAIN SEND FUNCTION — uses Gmail via server.js ────────────────────────────
  async function sendBulkEmails() {
    if (!emailRecipients.length) { showToast('No recipients', 'error'); return; }
    const subj      = document.getElementById('emailSubject')?.value?.trim();
    const body      = document.getElementById('emailBody')?.value?.trim();
    const from_name = document.getElementById('emailFromName')?.value?.trim() || 'OnneaLabs';
    if (!subj || !body) { showToast('Fill in subject and body', 'error'); return; }

    document.getElementById('emailPreviewModal')?.classList.add('hidden');
    const modal    = document.getElementById('sendingModal');
    const progress = document.getElementById('sendingProgress');
    const complete = document.getElementById('sendingComplete');
    const footer   = document.getElementById('sendingModalFooter');
    modal?.classList.remove('hidden');
    if (progress) progress.style.display = 'block';
    if (complete) complete.style.display = 'none';
    if (footer)   footer.style.display   = 'none';
    document.getElementById('totalSendCount').textContent    = emailRecipients.length;
    document.getElementById('sendProgressFill').style.width  = '10%';

    try {
      const res = await fetch(`${EMAIL_PROXY}/send-bulk`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ leads: emailRecipients, subject: subj, body, from_name }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${res.status}`);
      }

      const data = await res.json();
      document.getElementById('sendProgressFill').style.width = '100%';
      document.getElementById('sentCount').textContent        = data.sent;
      document.getElementById('totalSendCount').textContent   = data.total;
      if (progress) progress.style.display = 'none';
      if (complete) complete.style.display = 'block';
      if (footer)   footer.style.display   = 'flex';
      document.getElementById('successCount').textContent = data.sent;
      document.getElementById('failCount').textContent    = data.failed;

      showToast(`✅ ${data.sent} emails sent via Gmail!${data.failed ? ` (${data.failed} failed)` : ''}`, data.sent ? 'success' : 'error');

      // Refresh leads to show updated stages
      await fetchLeads();
      renderLeadsTable();

    } catch (err) {
      if (progress) progress.style.display = 'none';
      modal?.classList.add('hidden');
      if (err.message.includes('fetch') || err.message.includes('NetworkError'))
        showToast('Server not running — start node server.js', 'error');
      else
        showToast('Send failed: ' + err.message, 'error');
    }
  }

  // Manual reply check button
  async function manualCheckReplies() {
    const btn = document.getElementById('checkRepliesBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...'; }
    try {
      const res  = await fetch(`${EMAIL_PROXY}/check-replies`, { method: 'POST' });
      const data = await res.json();
      if (data.updated > 0) {
        showToast(`🔔 ${data.updated} leads updated to responded!`, 'success');
        await fetchLeads();
        refreshCurrentView();
      } else {
        showToast(`📭 Checked ${data.checked} emails — no new replies`, 'info');
      }
    } catch (err) {
      showToast('Check failed — is server.js running?', 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-inbox"></i> Check Replies Now'; }
    }
  }
  window.manualCheckReplies = manualCheckReplies;

  function saveTemplate() {
    const name = document.getElementById('templateName')?.value?.trim();
    const subj = document.getElementById('emailSubject')?.value || '';
    const body = document.getElementById('emailBody')?.value   || '';
    if (!name) { showToast('Enter a template name', 'error'); return; }
    const existing = emailTemplates.findIndex(t => t.name === name);
    if (existing >= 0) emailTemplates[existing] = { ...emailTemplates[existing], subject:subj, body };
    else emailTemplates.push({ id: Date.now(), name, subject:subj, body, createdAt: new Date().toISOString() });
    saveEmailTemplates();
    document.getElementById('templateModal')?.classList.add('hidden');
    showToast('Template saved!', 'success');
  }

  window.loadTemplate = function(id) {
    const t = emailTemplates.find(e => e.id === id);
    if (!t) return;
    document.getElementById('emailSubject').value = t.subject;
    document.getElementById('emailBody').value    = t.body;
    document.getElementById('templateModal')?.classList.add('hidden');
    showToast(`Loaded "${t.name}"`, 'success');
  };

  window.deleteTemplate = function(id) {
    const t = emailTemplates.find(e => e.id === id);
    if (!t || !confirm(`Delete "${t.name}"?`)) return;
    emailTemplates = emailTemplates.filter(e => e.id !== id);
    saveEmailTemplates();
    renderTemplateList();
    showToast('Deleted', 'info');
  };

  function renderTemplateList() {
    const list = document.getElementById('templateList');
    if (!list) return;
    if (!emailTemplates.length) { list.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px">No saved templates</p>'; return; }
    list.innerHTML = emailTemplates.map(t => `
      <div class="template-item">
        <div onclick="loadTemplate(${t.id})" style="flex:1;cursor:pointer">
          <div class="template-item-name">${escapeHtml(t.name)}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px">${escapeHtml(t.subject||'No subject')}</div>
        </div>
        <div class="template-item-actions">
          <button class="btn-icon" onclick="loadTemplate(${t.id})" title="Load"><i class="fas fa-download" style="color:var(--primary-light)"></i></button>
          <button class="btn-icon" onclick="deleteTemplate(${t.id})" title="Delete"><i class="fas fa-trash" style="color:var(--red)"></i></button>
        </div>
      </div>`).join('');
  }

  // ============================================
  // EVENT LISTENERS
  // ============================================
  function setupEventListeners() {
    // Login
    document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email    = document.getElementById('loginEmail')?.value;
      const password = document.getElementById('loginPassword')?.value;
      const errEl    = document.getElementById('loginError');
      if (!email || !password) { if (errEl) errEl.textContent = 'Enter email and password'; return; }
      if (errEl) errEl.textContent = '';
      const { error } = await handleLogin(email, password);
      if (error) { if (errEl) errEl.textContent = error.message; }
      else showDashboard();
    });

    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
    document.getElementById('addLeadBtn')?.addEventListener('click', openAddModal);
    document.getElementById('leadForm')?.addEventListener('submit', saveLead);
    document.getElementById('modalClose')?.addEventListener('click', closeModal);
    document.getElementById('modalCancel')?.addEventListener('click', closeModal);
    document.querySelector('#leadModal .modal-overlay')?.addEventListener('click', closeModal);
    document.getElementById('deleteCancelBtn')?.addEventListener('click', closeDeleteModal);
    document.getElementById('deleteConfirmBtn')?.addEventListener('click', deleteLead);
    document.querySelector('#deleteModal .modal-overlay')?.addEventListener('click', closeDeleteModal);

    document.getElementById('leadAudit')?.addEventListener('change', function() {
      document.getElementById('auditDateGroup').style.display = this.checked ? 'block' : 'none';
      if (this.checked) { const di = document.getElementById('leadAuditDate'); if (di && !di.value) di.value = new Date().toISOString().split('T')[0]; }
    });

    // Navigation
    document.querySelectorAll('.nav-item').forEach(item =>
      item.addEventListener('click', (e) => { e.preventDefault(); if (item.dataset.view) switchView(item.dataset.view); })
    );
    document.querySelectorAll('.view-all').forEach(link =>
      link.addEventListener('click', (e) => { e.preventDefault(); if (link.dataset.view) switchView(link.dataset.view); })
    );

    // Filters
    ['filterStage','filterSource','filterPriority','filterAudit','filterMarket'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', () => {
        // Reset market card filter if dropdown used
        if (id === 'filterMarket') state.activeMarketFilter = null;
        state.currentPage = 1;
        renderLeadsTable();
      });
    });

    let searchTimeout;
    document.getElementById('globalSearch')?.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => { state.currentPage = 1; renderLeadsTable(); }, 300);
    });

    document.getElementById('sidebarToggle')?.addEventListener('click', () => document.querySelector('.sidebar')?.classList.toggle('open'));
    document.getElementById('exportBtn')?.addEventListener('click', exportCSV);

    document.getElementById('selectAllLeads')?.addEventListener('change', function() {
      document.querySelectorAll('.lead-select-cb').forEach(cb => cb.checked = this.checked);
    });

    document.querySelectorAll('.sortable').forEach(th =>
      th.addEventListener('click', () => {
        const field = th.dataset.sort;
        if (state.sortField === field) state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
        else { state.sortField = field; state.sortDirection = 'asc'; }
        renderLeadsTable();
      })
    );

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { closeModal(); closeDeleteModal(); document.getElementById('emailPreviewModal')?.classList.add('hidden'); document.getElementById('templateModal')?.classList.add('hidden'); }
    });

    // Apollo / Lusha
    document.getElementById('apolloSearchBtn')?.addEventListener('click', () => searchApollo(1));
    document.getElementById('lushaSearchBtn')?.addEventListener('click', searchLusha);
    document.getElementById('apolloClearBtn')?.addEventListener('click', () => {
      document.getElementById('apolloResults').style.display = 'none';
      document.getElementById('apolloProxyBanner')?.remove();
      apolloResults = []; apolloSelectedIds.clear();
      showToast('Search cleared', 'info');
    });
    document.getElementById('apolloSelectAllBtn')?.addEventListener('click',   () => { apolloResults.forEach(r => apolloSelectedIds.add(r.id)); renderApolloResults(); });
    document.getElementById('apolloDeselectAllBtn')?.addEventListener('click', () => { apolloSelectedIds.clear(); renderApolloResults(); });
    document.getElementById('apolloImportSelectedBtn')?.addEventListener('click', importApolloSelected);
    document.getElementById('apolloEmailSelectedBtn2')?.addEventListener('click', () => {
      apolloResults.filter(r => apolloSelectedIds.has(r.id) && r.email).forEach(r => {
        if (emailRecipients.some(e => e.email === r.email)) return;
        const name = r.name || `${r.first_name||''} ${r.last_name||''}`.trim();
        emailRecipients.push({ id:r.id, name, first_name:r.first_name||name.split(' ')[0]||'', email:r.email, company:r.organization?.name||'', job_title:r.title||'', industry:r.organization?.industry||r.industry||'', source:r._lusha?'lusha':'apollo' });
      });
      switchView('bulkemail');
      renderSelectedRecipients();
      updateSendButton();
    });

    document.getElementById('apolloSettingsBtn')?.addEventListener('click', () => document.getElementById('apolloApiModal')?.classList.remove('hidden'));
    document.getElementById('apolloApiModalClose')?.addEventListener('click', () => document.getElementById('apolloApiModal')?.classList.add('hidden'));
    document.getElementById('apolloApiSaveBtn')?.addEventListener('click', () => document.getElementById('apolloApiModal')?.classList.add('hidden'));

    // Lead Intelligence
    document.getElementById('qualifyBtn')?.addEventListener('click', qualifyLead);
    document.getElementById('quickVerifyBtn')?.addEventListener('click', quickVerifyEmail);
    document.getElementById('bulkQualifyBtn')?.addEventListener('click', bulkQualifyLeads);
    document.getElementById('verifyAllEmailsBtn')?.addEventListener('click', verifyAllEmails);
    document.getElementById('lushaEnrichAllBtn')?.addEventListener('click', bulkEnrichWithLusha);

    // Bulk Email
    document.querySelectorAll('.recipient-source-tabs .tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.recipient-source-tabs .tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.recipient-tab').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        const src   = btn.dataset.source;
        const tabId = `recipient${src.charAt(0).toUpperCase() + src.slice(1)}Tab`;
        document.getElementById(tabId)?.classList.add('active');
        if (src === 'leads')  renderRecipientList();
        if (src === 'apollo') renderApolloRecipientTab();
      });
    });

    document.getElementById('recipientLeadSearch')?.addEventListener('input', renderRecipientList);
    document.getElementById('recipientStageFilter')?.addEventListener('change', renderRecipientList);
    document.getElementById('recipientMarketFilter')?.addEventListener('change', renderRecipientList);
    document.getElementById('selectAllRecipients')?.addEventListener('click', selectAllRecipients);
    document.getElementById('clearAllRecipients')?.addEventListener('click', clearAllRecipients);
    document.getElementById('addManualEmailsBtn')?.addEventListener('click', addManualEmails);

    document.querySelectorAll('.placeholder-btn').forEach(btn =>
      btn.addEventListener('click', () => insertPlaceholder(btn.dataset.placeholder))
    );

    document.getElementById('previewEmailBtn')?.addEventListener('click', previewEmail);
    document.getElementById('sendBulkEmailBtn')?.addEventListener('click', previewEmail);

    document.getElementById('prevPreviewBtn')?.addEventListener('click', () => { if (currentPreviewIndex > 0) { currentPreviewIndex--; updatePreview(); } });
    document.getElementById('nextPreviewBtn')?.addEventListener('click', () => { if (currentPreviewIndex < emailRecipients.length - 1) { currentPreviewIndex++; updatePreview(); } });

    ['emailPreviewClose','closePreviewBtn'].forEach(id =>
      document.getElementById(id)?.addEventListener('click', () => document.getElementById('emailPreviewModal')?.classList.add('hidden'))
    );
    document.getElementById('confirmSendBtn')?.addEventListener('click', sendBulkEmails);

    document.getElementById('saveTemplateBtn')?.addEventListener('click', () => {
      document.getElementById('templateModal')?.classList.remove('hidden');
      document.getElementById('saveTemplateForm').style.display = 'block';
      document.getElementById('templateName').value = '';
      renderTemplateList();
      setTimeout(() => document.getElementById('templateName')?.focus(), 100);
    });
    document.getElementById('confirmSaveTemplate')?.addEventListener('click', saveTemplate);
    document.getElementById('loadTemplateBtn')?.addEventListener('click', () => {
      document.getElementById('templateModal')?.classList.remove('hidden');
      document.getElementById('saveTemplateForm').style.display = 'none';
      renderTemplateList();
    });
    document.getElementById('templateModalClose')?.addEventListener('click', () => document.getElementById('templateModal')?.classList.add('hidden'));

    document.getElementById('closeSendingModal')?.addEventListener('click', async () => {
      document.getElementById('sendingModal')?.classList.add('hidden');
      emailRecipients = [];
      renderSelectedRecipients();
      updateSendButton();
      renderRecipientList();
      await fetchLeads();
    });

    document.getElementById('bulkEmailFromLeadsBtn')?.addEventListener('click', () => {
      const checked = document.querySelectorAll('.lead-select-cb:checked');
      checked.forEach(cb => {
        const lead = state.leads.find(l => l.id === cb.dataset.id);
        if (lead?.email && !emailRecipients.some(r => r.email === lead.email)) {
          emailRecipients.push({ id:lead.id, name:lead.name||'', first_name:(lead.name||'').split(' ')[0]||'', email:lead.email, company:lead.company||'', job_title:lead.job_title||'', industry:lead.industry||'', source:'lead' });
        }
      });
      switchView('bulkemail');
    });
  }

  // ============================================
  // INIT
  // ============================================
  document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 OnneaLabs Lead Command Center v5.0 starting...');
    if (!supabaseReady) {
      const err = document.createElement('div');
      err.style.cssText = 'position:fixed;top:0;left:0;right:0;background:var(--red);color:white;padding:16px 24px;text-align:center;z-index:9999;font-family:Arial;font-size:14px';
      err.innerHTML = '⚠️ Configuration Error: Check config.js has valid SUPABASE_URL and SUPABASE_ANON_KEY';
      document.body.prepend(err);
      return;
    }
    setupEventListeners();
    checkAuth();
    console.log('✅ Ready!');
  });