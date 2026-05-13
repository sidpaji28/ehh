const express = require('express');
const fetch   = require('node-fetch');
const cors    = require('cors');
const { setDefaultResultOrder } = require('dns');
const dnsPromises = require('dns').promises;

// Fix Node.js DNS resolution (must be before any fetch calls)
setDefaultResultOrder('ipv4first');

const app = express();

// ════════════════════════════════════════════
// 🔑 YOUR API KEYS — fill these in
// ════════════════════════════════════════════
const APOLLO_API_KEY = "";
const LUSHA_API_KEY  = '';
const GROQ_API_KEY   = '';
const GEMINI_API_KEY = '';
const GMAIL_FROM    = '';
const GMAIL_CLIENT_ID     = '';
const GMAIL_CLIENT_SECRET = '';
const GMAIL_REFRESH_TOKEN = '';
const SUPABASE_SERVICE_KEY = ''; // NOT the anon key
const SUPABASE_URL = '';
const nodemailer       = require('nodemailer');
const { google }       = require('googleapis');
const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  realtime: { transport: ws }
});
// ← ADD THIS HERE
function extractLushaContact(d) {
  // Lusha v2 real structure: d.contact.data = person object
  const candidates = [d?.contact?.data, d.contact, d.data, d];
  for (const c of candidates) {
    if (c && !c.error && (c.fullName || c.firstName || c.emailAddresses?.length || c.phoneNumbers?.length || c.personId || c.id)) {
      return c;
    }
  }
  return null;
}
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'api_key',
    'x-api-key',
    'ngrok-skip-browser-warning'
  ],
}));

app.options('*', cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// ════════════════════════════════════════════
// HEALTH CHECK
// ════════════════════════════════════════════
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    keys: {
      apollo: APOLLO_API_KEY ? '✅' : '❌',
      lusha:  LUSHA_API_KEY  ? '✅' : '❌ MISSING',
      groq:   GROQ_API_KEY   ? '✅' : '❌',
      gemini: GEMINI_API_KEY ? '✅' : '❌',
    },
    routes: [
      'GET  /',
      'POST /apollo/search',
      'POST /lusha/search',
      'POST /lusha/person',
      'POST /lusha/company',
      'POST /lusha/enrich-lead',
      'POST /lusha/bulk-enrich',
      'GET  /lusha/credits',
      'POST /verify/email',
      'POST /analyze/website',
      'POST /analyze/ai',
      'POST /qualify/lead',
    ]
  });
});

// ════════════════════════════════════════════
// APOLLO SEARCH
// ════════════════════════════════════════════
app.post('/apollo/search', async (req, res) => {
  if (!APOLLO_API_KEY) {
    return res.status(400).json({ error: 'APOLLO_API_KEY not set in server.js' });
  }
  try {
    const params = new URLSearchParams();
    const body   = req.body;

    if (body.person_titles?.length)
      body.person_titles.forEach(t => params.append('person_titles[]', t));
    if (body.person_locations?.length)
      body.person_locations.forEach(l => params.append('person_locations[]', l));
    if (body.organization_num_employees_ranges?.length)
      body.organization_num_employees_ranges.forEach(r =>
        params.append('organization_num_employees_ranges[]', r));
    if (body.contact_email_status?.length)
      body.contact_email_status.forEach(s => params.append('contact_email_status[]', s));

    params.append('page',     body.page     || 1);
    params.append('per_page', body.per_page || 25);

    const url = `https://api.apollo.io/api/v1/mixed_people/api_search?${params}`;
    console.log('→ Apollo URL:', url);

    const response = await fetch(url, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Cache-Control': 'no-cache',
        'accept':        'application/json',
        'x-api-key':     APOLLO_API_KEY,
      },
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); }
    catch (e) { return res.status(response.status).json({ error: text }); }

    if (!response.ok) {
      console.error('Apollo error:', data);
      return res.status(response.status).json({ error: data.message || data.error || 'Apollo error' });
    }

    console.log(`✅ Apollo: ${data.people?.length || 0} results`);
    res.json(data);
  } catch (err) {
    console.error('Apollo exception:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════
// LUSHA — PROSPECT SEARCH
// POST /lusha/search
// ════════════════════════════════════════════
app.post('/lusha/search', async (req, res) => {
  if (!LUSHA_API_KEY) return res.status(400).json({ error: 'LUSHA_API_KEY not set' });

  try {
    const body = req.body;
    let lushaBody;

    if (body.pages && body.filters) {
      lushaBody = body;
    } else {
      const { job_titles, industries, countries, company_sizes, page = 0, per_page = 25 } = body;

      const contactInclude = {};
      const companyInclude = {};

      // ── DEPARTMENTS — case-insensitive, fuzzy match ──────────────────
      if (job_titles?.length) {
        const deptMap = [
          { dept: 'C-Suite',                  keywords: ['ceo','founder','co-founder','cofounder','owner','president','managing director','md','chief executive','principal'] },
          { dept: 'Marketing',                keywords: ['cmo','marketing','brand','growth','content','seo','social media','demand'] },
          { dept: 'Sales',                    keywords: ['sales','business development','bd','account executive','ae','revenue','partnerships'] },
          { dept: 'Engineering & Technical',  keywords: ['cto','engineer','developer','tech','software','it ','data','product','architect'] },
          { dept: 'Finance',                  keywords: ['cfo','finance','financial','accounting','accounts','ca ','chartered','tax','audit'] },
          { dept: 'Human Resources',          keywords: ['hr','human resource','talent','recruit','people','workforce','staffing'] },
          { dept: 'Operations',               keywords: ['coo','operations','ops','supply chain','logistics','process'] },
          { dept: 'Legal',                    keywords: ['legal','counsel','attorney','law','compliance','contract'] },
          { dept: 'Customer Success',         keywords: ['customer success','customer service','support','client','account manager'] },
        ];

        const depts = new Set();
        job_titles.forEach(title => {
          const t = title.toLowerCase().trim();
          let matched = false;
          for (const { dept, keywords } of deptMap) {
            if (keywords.some(k => t.includes(k))) {
              depts.add(dept);
              matched = true;
              break;
            }
          }
          // If no match, default to C-Suite (safest for prospecting)
          if (!matched) depts.add('C-Suite');
        });
        contactInclude.departments = [...depts];
        console.log('→ Mapped departments:', contactInclude.departments);
      }

      // ── LOCATIONS ────────────────────────────────────────────────────
      if (countries?.length) {
        contactInclude.locations = countries.map(c => {
          const parts = c.split(',');
          return parts[1]
            ? { country: parts[0].trim(), city: parts[1].trim() }
            : { country: parts[0].trim() };
        });
      }

      // ── INDUSTRIES — case-insensitive, fuzzy match ───────────────────
      if (industries?.length) {
        const industryMap = [
          { id: 1,  keywords: ['accounting','ca firm','chartered','audit','tax'] },
          { id: 2,  keywords: ['aerospace','aviation','airline'] },
          { id: 3,  keywords: ['software','saas','tech','it ','information technology','computer'] },
          { id: 4,  keywords: ['automotive','car','vehicle','automobile'] },
          { id: 5,  keywords: ['education','edtech','e-learning','elearning','learning','training','coaching','school','university','college','lms'] },
          { id: 6,  keywords: ['financial','finance','investment','banking','wealth','fund','asset','insurance','fintech'] },
          { id: 7,  keywords: ['legal','law','attorney','advocate','counsel'] },
          { id: 8,  keywords: ['hr','human resource','recruitment','staffing','talent','hiring','manpower'] },
          { id: 9,  keywords: ['health','medical','hospital','clinic','pharma','wellness','healthcare','biotech'] },
          { id: 10, keywords: ['consulting','strategy','advisory','management consult'] },
          { id: 11, keywords: ['marketing','advertising','media','pr ','public relation','creative','agency','branding'] },
          { id: 12, keywords: ['manufacturing','industrial','factory','production'] },
          { id: 13, keywords: ['retail','ecommerce','e-commerce','d2c','direct to consumer','fmcg','consumer goods'] },
          { id: 14, keywords: ['real estate','property','realty','proptech','construction','builder'] },
          { id: 15, keywords: ['telecom','telecommunications','network','connectivity'] },
          { id: 16, keywords: ['travel','tourism','hospitality','hotel','restaurant','food'] },
          { id: 17, keywords: ['logistics','supply chain','shipping','warehouse','transport','freight'] },
          { id: 18, keywords: ['energy','oil','gas','renewable','solar','power'] },
          { id: 19, keywords: ['nonprofit','ngo','social','charity'] },
          { id: 20, keywords: ['crypto','blockchain','web3','defi'] },
        ];

        const ids = new Set();
        industries.forEach(industry => {
          const t = industry.toLowerCase().trim();
          for (const { id, keywords } of industryMap) {
            if (keywords.some(k => t.includes(k))) {
              ids.add(id);
              break;
            }
          }
        });
        if (ids.size > 0) {
          companyInclude.mainIndustriesIds = [...ids];
          console.log('→ Mapped industry IDs:', companyInclude.mainIndustriesIds);
        }
        // If no industry matched, don't filter by industry — return broader results
      }

      // ── COMPANY SIZE ─────────────────────────────────────────────────
      const sizeMap = {
        '1,10':    [{ min: 1,    max: 10    }],
        '11,50':   [{ min: 11,   max: 50    }],
        '51,200':  [{ min: 51,   max: 200   }],
        '201,500': [{ min: 201,  max: 500   }],
        '501,1000':[{ min: 501,  max: 1000  }],
        '1001,':   [{ min: 1001, max: 100000}],
      };
      if (company_sizes?.length) {
        companyInclude.sizes = company_sizes.flatMap(s => sizeMap[s] || []);
      }

      // ── BUILD FILTERS ─────────────────────────────────────────────────
      // Only include non-empty filters — too many filters = no results
      const filters = {};

      if (Object.keys(contactInclude).length > 0) {
        filters.contacts = { include: contactInclude };
      }
      if (Object.keys(companyInclude).length > 0) {
        filters.companies = { include: companyInclude };
      }

      // If absolutely no filters, at least filter by department C-Suite
      if (!filters.contacts && !filters.companies) {
        filters.contacts = { include: { departments: ['C-Suite'] } };
      }

      lushaBody = {
        pages: { page: Math.max(0, page), size: Math.min(25, per_page) },
        filters,
      };
    }

    console.log('→ Lusha search body:', JSON.stringify(lushaBody, null, 2));

    const response = await fetch('https://api.lusha.com/prospecting/contact/search', {
      method: 'POST',
      headers: {
        'api_key':      LUSHA_API_KEY,
        'Content-Type': 'application/json',
        'accept':       'application/json',
      },
      body: JSON.stringify(lushaBody),
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); }
    catch (e) { return res.status(response.status).json({ error: text }); }

    if (!response.ok) {
      console.error('Lusha search error:', JSON.stringify(data, null, 2));
      return res.status(response.status).json({ error: data.message || 'Lusha API error', details: data });
    }

    // If 0 results, retry with fewer filters
    if (data.data?.length === 0 && lushaBody.filters.companies) {
      console.log('→ 0 results with company filter, retrying with contacts only...');
      const retryBody = {
        pages:   lushaBody.pages,
        filters: { contacts: lushaBody.filters.contacts || { include: { departments: ['C-Suite'] } } },
      };
      const retry = await fetch('https://api.lusha.com/v2/prospecting/contact/search', {
        method: 'POST',
        headers: { 'api_key': LUSHA_API_KEY, 'Content-Type': 'application/json', 'accept': 'application/json' },
        body: JSON.stringify(retryBody),
      });
      if (retry.ok) {
        const retryData = await retry.json();
        if (retryData.data?.length > 0) {
          console.log(`✅ Retry got ${retryData.data.length} results`);
          return res.json({ ...retryData, _retried: true });
        }
      }
    }

    console.log(`✅ Lusha: ${data.data?.length || 0} results (${data.totalResults || 0} total)`);
    res.json(data);

  } catch (err) {
    console.error('Lusha search exception:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════
// LUSHA — PERSON LOOKUP
// POST /lusha/person
// ════════════════════════════════════════════
app.post('/lusha/person', async (req, res) => {
  if (!LUSHA_API_KEY) return res.status(400).json({ error: 'LUSHA_API_KEY not set' });

  try {
    const { firstName, lastName, company, linkedinUrl, email } = req.body;

    if (linkedinUrl) {
      const params = new URLSearchParams({ linkedinUrl });
      console.log('→ Lusha person by LinkedIn:', linkedinUrl);
      const response = await fetch(
        `https://api.lusha.com/v2/person?${params}`,
        { headers: { 'api_key': LUSHA_API_KEY, 'accept': 'application/json' } }
      );
      const data = await response.json();
      if (response.ok) return res.json(data);
      console.log('LinkedIn lookup failed:', data.message);
    }

    if (firstName) {
      const params = new URLSearchParams();
      params.append('firstName', firstName);
      if (lastName) params.append('lastName', lastName);
      console.log('→ Lusha person by name:', params.toString());
      const response = await fetch(
        `https://api.lusha.com/v2/person?${params}`,
        { headers: { 'api_key': LUSHA_API_KEY, 'accept': 'application/json' } }
      );
      const data = await response.json();
      if (response.ok) return res.json(data);
      return res.status(response.status).json({ error: data.message || 'Person not found', details: data });
    }

    if (email) {
      const params = new URLSearchParams({ email });
      const response = await fetch(
        `https://api.lusha.com/v2/person?${params}`,
        { headers: { 'api_key': LUSHA_API_KEY, 'accept': 'application/json' } }
      );
      const data = await response.json();
      if (response.ok) return res.json(data);
    }

    return res.status(400).json({ error: 'Provide firstName, email, or linkedinUrl' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
  personData = extractLushaContact(d);
});

// ════════════════════════════════════════════
// LUSHA — COMPANY LOOKUP
// POST /lusha/company
// ════════════════════════════════════════════
app.post('/lusha/company', async (req, res) => {
  if (!LUSHA_API_KEY) return res.status(400).json({ error: 'LUSHA_API_KEY not set' });

  try {
    const { company_name, domain } = req.body;
    if (!company_name && !domain)
      return res.status(400).json({ error: 'company_name or domain required' });

    const params = new URLSearchParams();
    if (domain)       params.append('domain',      domain);
    if (company_name) params.append('companyName', company_name);

    const response = await fetch(
      `https://api.lusha.com/v2/company?${params}`,
      { method: 'GET', headers: { 'api_key': LUSHA_API_KEY, 'accept': 'application/json' } }
    );

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.message || 'Lusha company error' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════
// LUSHA — ENRICH A SINGLE LEAD
// POST /lusha/enrich-lead
// ════════════════════════════════════════════
app.post('/lusha/enrich-lead', async (req, res) => {
  if (!LUSHA_API_KEY) return res.status(400).json({ error: 'LUSHA_API_KEY not set' });

  const { name, company, email, linkedin_url } = req.body;

  const result = {
    original:     { name, company, email, linkedin_url },
    enriched:     null,
    company_data: null,
    credits_used: 0,
    success:      false,
    error:        null,
  };

  try {
    const nameParts = (name || '').trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName  = nameParts.slice(1).join(' ') || '';

    let personData = null;
    let personRes;

    // 1. Try LinkedIn URL first
    if (linkedin_url) {
      const params = new URLSearchParams({ linkedinUrl: linkedin_url });
      console.log('→ Lusha enrich by LinkedIn:', linkedin_url);
      personRes = await fetch(
        `https://api.lusha.com/v2/person?${params}`,
        { headers: { 'api_key': LUSHA_API_KEY, 'accept': 'application/json' } }
      );
      if (personRes.ok) {
        const d = await personRes.json();
        console.log('→ Full Lusha response:', JSON.stringify(d, null, 2));
        personData = extractLushaContact(d);
        console.log('→ LinkedIn result:', personData ? 'found' : 'empty');
      } else {
        const err = await personRes.json().catch(() => ({}));
        console.log('→ LinkedIn lookup failed:', err.message || personRes.status);
      }
    }

    // 2. Try email lookup
    if (!personData && email) {
      const params = new URLSearchParams({ email });
      console.log('→ Lusha enrich by email:', email);
      personRes = await fetch(
        `https://api.lusha.com/v2/person?${params}`,
        { headers: { 'api_key': LUSHA_API_KEY, 'accept': 'application/json' } }
      );
      if (personRes.ok) {
        const d = await personRes.json();
        console.log('→ Full Lusha response:', JSON.stringify(d, null, 2));
        personData = extractLushaContact(d);
        console.log('→ Email result:', personData ? 'found' : 'empty');
      }
    }

    // 3. Try firstName + lastName + companyDomain
    if (!personData && firstName && lastName && company) {
      const guessDomain = company
        .toLowerCase()
        .replace(/\b(inc|llc|ltd|corp|limited|pvt|private|group|holdings|services|solutions|technologies|consulting)\b/g, '')
        .replace(/[^a-z0-9]/g, '')
        .trim() + '.com';

      const params = new URLSearchParams();
      params.append('firstName',     firstName);
      params.append('lastName',      lastName);
      params.append('companyDomain', guessDomain);
      console.log('→ Lusha enrich by name + domain:', firstName, lastName, guessDomain);

      personRes = await fetch(
        `https://api.lusha.com/v2/person?${params}`,
        { headers: { 'api_key': LUSHA_API_KEY, 'accept': 'application/json' } }
      );
      if (personRes.ok) {
        const d = await personRes.json();
        console.log('→ Raw Lusha response keys:', Object.keys(d));
        console.log('→ Full Lusha response:', JSON.stringify(d, null, 2));
        personData = extractLushaContact(d);
        console.log('→ Name result:', personData ? 'found' : 'empty');
      } else {
        const err = await personRes.json().catch(() => ({}));
        console.log('→ Name lookup error:', JSON.stringify(err));
      }
    } else if (!personData && firstName && lastName && !company) {
      console.log('→ Skipping name lookup — no company to guess domain from');
    }

    if (personData) {
      result.success      = true;
      result.credits_used = 1;
      result.enriched = {
  name:         personData.fullName || `${personData.firstName || ''} ${personData.lastName || ''}`.trim() || name,
  
  // emailAddresses array, not emails
  email:        personData.emailAddresses?.[0]?.email || personData.email || personData.workEmail || email || null,
  
  // phoneNumbers with .number not .normalizedNumber
  phone:        personData.phoneNumbers?.[0]?.number || personData.phones?.[0]?.normalizedNumber || null,
  
  // jobTitle is an object { title, departments, seniority }
  job_title:    personData.jobTitle?.title || personData.jobTitle || null,
  
  linkedin_url: personData.socialLinks?.linkedin || personData.linkedinUrl || linkedin_url || null,
  
  // company is a nested object
  company:      personData.company?.name || personData.companyName || company || null,
  company_website: personData.company?.homepageUrl || personData.company?.domains?.homepage
                   ? `https://${personData.company.domains.homepage}` : null,
  
  industry:     personData.company?.mainIndustry || personData.industry || null,
  company_size: personData.company?.companySize?.[0]
                ? `${personData.company.companySize[0]}–${personData.company.companySize[1]}`
                : personData.companySize || null,
  
  city:         personData.location?.city || personData.city || null,
  country:      personData.location?.country || personData.country || null,
  
  lusha_id:     personData.personId || personData.id || null,
  all_emails:   personData.emailAddresses || personData.emails || [],
  all_phones:   personData.phoneNumbers   || [],
};

      console.log(`✅ Lusha enriched: ${result.enriched.name} | ${result.enriched.email || 'no email'} | ${result.enriched.phone || 'no phone'}`);

      if (personData.companyDomain) {
        try {
          const compRes = await fetch(
            `https://api.lusha.com/v2/company?domain=${encodeURIComponent(personData.companyDomain)}`,
            { headers: { 'api_key': LUSHA_API_KEY, 'accept': 'application/json' } }
          );
          if (compRes.ok) {
            const compData = await compRes.json();
            result.company_data = compData.data || null;
          }
        } catch (e) { /* ignore */ }
      }
    } else {
      result.error = 'Not found in Lusha — try adding LinkedIn URL for better results';
      console.log(`⚠️  Not found in Lusha: ${name} @ ${company}`);
    }

  } catch (err) {
    result.error = err.message;
    console.error('Enrich error:', err.message);
  }

  res.json(result);
});

// ════════════════════════════════════════════
// LUSHA — REVEAL CONTACT
// POST /lusha/reveal
// ════════════════════════════════════════════
app.post('/lusha/reveal', async (req, res) => {
  if (!LUSHA_API_KEY) return res.status(400).json({ error: 'LUSHA_API_KEY not set' });

  const { personId, contactId } = req.body;
  if (!personId && !contactId) return res.status(400).json({ error: 'personId required' });

  try {
    console.log('→ Lusha reveal personId:', personId);

    const params = new URLSearchParams();
    params.append('personId',     personId);
    params.append('revealEmails', 'true');
    params.append('revealPhones', 'true');

    const response = await fetch(`https://api.lusha.com/v2/person?${params}`, {
      method:  'GET',
      headers: { 'api_key': LUSHA_API_KEY, 'accept': 'application/json' },
    });

    const data = await response.json();
    console.log('→ Reveal status:', response.status);

    if (!response.ok) {
      return res.status(response.status).json({ error: data.message || 'Reveal failed', details: data });
    }

    const contact = data.contact?.data || null;
    const email   = contact?.emailAddresses?.[0]?.email || null;
    const phone   = contact?.phoneNumbers?.[0]?.number  || null;

    console.log(`✅ Revealed: ${contact?.fullName} | ${email || 'no email'} | ${phone || 'no phone'}`);

    res.json({
      success:  !!contact && !data.contact?.error,
      email,
      phone,
      contact,
      credits_charged: data.contact?.isCreditCharged || false,
    });

  } catch (err) {
    console.error('Reveal error:', err.message);
    res.status(500).json({ error: err.message });
  }
});
// ════════════════════════════════════════════
// LUSHA — BULK ENRICH
// POST /lusha/bulk-enrich
// ════════════════════════════════════════════
app.post('/lusha/bulk-enrich', async (req, res) => {
  if (!LUSHA_API_KEY) return res.status(400).json({ error: 'LUSHA_API_KEY not set' });

  const { leads } = req.body;
  if (!leads?.length) return res.status(400).json({ error: 'leads array required' });

  const results    = [];
  let totalCredits = 0;

  for (const lead of leads.slice(0, 100)) {
    try {
      const r = await fetch('http://localhost:3001/lusha/enrich-lead', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(lead),
      });
      const d = await r.json();
      results.push({ lead_id: lead.id, ...d });
      totalCredits += d.credits_used || 0;
      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      results.push({ lead_id: lead.id, success: false, error: err.message });
    }
  }

  res.json({
    results,
    total_leads:  leads.length,
    successful:   results.filter(r => r.success).length,
    failed:       results.filter(r => !r.success).length,
    credits_used: totalCredits,
  });
});

// ════════════════════════════════════════════
// LUSHA — CHECK CREDITS
// GET /lusha/credits
// ════════════════════════════════════════════
app.get('/lusha/credits', async (req, res) => {
  if (!LUSHA_API_KEY) return res.status(400).json({ error: 'LUSHA_API_KEY not set' });
  // Lusha v2 API has no public credits endpoint — return placeholder
  res.json({
    data: {
      remainingCredits: 'Active',
      totalCredits:     'Active',
    }
  });
});

// ════════════════════════════════════════════
// FREE EMAIL VERIFICATION (DNS-based)
// POST /verify/email
// ════════════════════════════════════════════
app.post('/verify/email', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const result = {
    email,
    valid_format:  false,
    domain_exists: false,
    mx_records:    false,
    disposable:    false,
    free_provider: false,
    score:         0,
    status:        'unknown',
  };

  try {
    result.valid_format = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!result.valid_format) { result.status = 'invalid_format'; return res.json(result); }

    const domain = email.split('@')[1].toLowerCase();

    const freeProviders = [
      'gmail.com','yahoo.com','hotmail.com','outlook.com','aol.com',
      'icloud.com','mail.com','protonmail.com','zoho.com','yandex.com',
      'gmx.com','live.com','rediffmail.com','yahoo.in','yahoo.co.in',
    ];
    result.free_provider = freeProviders.includes(domain);

    const disposable = [
      'tempmail.com','throwaway.email','guerrillamail.com','mailinator.com',
      'yopmail.com','temp-mail.org','fakeinbox.com','trashmail.com',
      '10minutemail.com','maildrop.cc','sharklasers.com',
    ];
    result.disposable = disposable.includes(domain);

    try {
      const mx = await dnsPromises.resolveMx(domain);
      result.mx_records    = mx?.length > 0;
      result.domain_exists = true;
    } catch {
      try {
        await dnsPromises.resolve4(domain);
        result.domain_exists = true;
      } catch {
        result.domain_exists = false;
      }
    }

    let score = 0;
    if (result.valid_format)   score += 20;
    if (result.domain_exists)  score += 25;
    if (result.mx_records)     score += 30;
    if (!result.disposable)    score += 15;
    if (!result.free_provider) score += 10;
    result.score = score;

    if (result.disposable)          result.status = 'disposable';
    else if (!result.domain_exists) result.status = 'invalid_domain';
    else if (!result.mx_records)    result.status = 'no_mail_server';
    else if (score >= 80)           result.status = 'valid';
    else if (score >= 50)           result.status = 'risky';
    else                            result.status = 'invalid';

  } catch (err) {
    result.status = 'error';
    result.error  = err.message;
  }

  console.log(`→ Verify ${email}: ${result.status} (${result.score}/100)`);
  res.json(result);
});

// ════════════════════════════════════════════
// FREE WEBSITE ANALYSIS
// POST /analyze/website
// ════════════════════════════════════════════
app.post('/analyze/website', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  const result = {
    url,
    reachable:     false,
    load_time_ms:  0,
    has_ssl:       false,
    title:         '',
    description:   '',
    issues:        [],
    opportunities: [],
    tech_detected: [],
    score:         0,
    timestamp:     new Date().toISOString(),
  };

  try {
    let targetUrl = url;
    if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;

    console.log('→ Analyzing website:', targetUrl);

    const start    = Date.now();
    const response = await fetch(targetUrl, {
      timeout:  15000,
      headers:  { 'User-Agent': 'Mozilla/5.0 (compatible; OnneaLabsBot/1.0)' },
      redirect: 'follow',
    });
    result.load_time_ms = Date.now() - start;
    result.reachable    = true;
    result.has_ssl      = targetUrl.startsWith('https');

    const html  = await response.text();
    const lower = html.toLowerCase();

    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    result.title = titleMatch ? titleMatch[1].trim().substring(0, 200) : '';

    const descMatch =
      html.match(/<meta[^>]*name=["\']description["\'][^>]*content=["\']([^"\']*)["\'][^>]*>/i) ||
      html.match(/<meta[^>]*content=["\']([^"\']*)["\'][^>]*name=["\']description["\'][^>]*>/i);
    result.description = descMatch ? descMatch[1].trim().substring(0, 500) : '';

    const techChecks = [
      ['WordPress',        ['wp-content', 'wordpress']],
      ['Shopify',          ['shopify']],
      ['Wix',              ['wix.com']],
      ['Squarespace',      ['squarespace']],
      ['Webflow',          ['webflow']],
      ['React/Next.js',    ['__next', 'react']],
      ['Angular',          ['angular']],
      ['Vue.js',           ['vue']],
      ['Bootstrap',        ['bootstrap']],
      ['Tailwind',         ['tailwind']],
      ['jQuery',           ['jquery']],
      ['Google Analytics', ['gtag', 'google-analytics', 'googletagmanager']],
      ['Facebook Pixel',   ['fbq(', 'facebook.com/tr']],
      ['Hotjar',           ['hotjar']],
      ['Intercom',         ['intercom']],
      ['Crisp Chat',       ['crisp']],
      ['Tawk.to',          ['tawk.to']],
      ['HubSpot',          ['hubspot']],
      ['Calendly',         ['calendly']],
      ['Stripe',           ['stripe']],
      ['Razorpay',         ['razorpay']],
      ['Drift',            ['drift']],
      ['Typeform',         ['typeform']],
      ['Mailchimp',        ['mailchimp']],
    ];
    techChecks.forEach(([name, keywords]) => {
      if (keywords.some(k => lower.includes(k))) result.tech_detected.push(name);
    });

    const issues = [];
    if (!result.has_ssl)
      issues.push({ category:'security',     severity:'critical', issue:'No SSL (HTTP only)',                    fix:'Install SSL certificate' });
    if (result.load_time_ms > 5000)
      issues.push({ category:'performance',  severity:'high',     issue:`Slow: ${(result.load_time_ms/1000).toFixed(1)}s load time`, fix:'Optimize images, use CDN' });
    else if (result.load_time_ms > 3000)
      issues.push({ category:'performance',  severity:'medium',   issue:`Load: ${(result.load_time_ms/1000).toFixed(1)}s (target <3s)`, fix:'Compress images, enable caching' });
    if (!result.title)
      issues.push({ category:'seo',          severity:'critical', issue:'Missing page title',                    fix:'Add descriptive <title> tag' });
    if (!result.description)
      issues.push({ category:'seo',          severity:'high',     issue:'Missing meta description',              fix:'Add meta description for Google' });
    if (!lower.includes('viewport'))
      issues.push({ category:'mobile',       severity:'critical', issue:'Not mobile-optimized',                  fix:'Add viewport meta tag' });
    if (!result.tech_detected.includes('Google Analytics') && !lower.includes('analytics'))
      issues.push({ category:'analytics',    severity:'high',     issue:'No analytics tracking',                 fix:'Install Google Analytics' });
    if (!['Intercom','Crisp Chat','Tawk.to','Drift'].some(t => result.tech_detected.includes(t)))
      issues.push({ category:'automation',   severity:'medium',   issue:'No live chat or chatbot',               fix:'Add chatbot for instant lead capture' });
    if (!result.tech_detected.includes('Calendly') && !lower.includes('book') && !lower.includes('schedule'))
      issues.push({ category:'automation',   severity:'medium',   issue:'No online booking system',              fix:'Add Calendly or booking widget' });
    if (!lower.includes('testimonial') && !lower.includes('review') && !lower.includes('case study'))
      issues.push({ category:'conversion',   severity:'medium',   issue:'No social proof / testimonials',        fix:'Add client testimonials' });
    if (!lower.includes('<form'))
      issues.push({ category:'lead_capture', severity:'high',     issue:'No contact form detected',              fix:'Add lead capture form' });
    if (!lower.includes('blog') && !lower.includes('article'))
      issues.push({ category:'content',      severity:'medium',   issue:'No blog or content section',            fix:'Start a blog for SEO authority' });
    if (!lower.includes('pricing') && !lower.includes('price'))
      issues.push({ category:'conversion',   severity:'low',      issue:'No pricing information',                fix:'Add pricing page or CTA' });

    result.issues = issues;

    const opps = [];
    if (issues.some(i => ['performance','mobile'].includes(i.category)))
      opps.push({ service:'Website Redesign & Speed Optimization', priority:'high',   description:'Faster, mobile-first site means more leads and lower bounce rate' });
    if (issues.some(i => i.category === 'seo'))
      opps.push({ service:'SEO & Content Strategy',                priority:'high',   description:'Fix SEO fundamentals and rank on Google for buyer keywords' });
    if (issues.some(i => i.category === 'automation'))
      opps.push({ service:'Marketing Automation',                  priority:'medium', description:'Chatbot, booking, and email automation to capture leads 24/7' });
    if (issues.some(i => ['conversion','lead_capture'].includes(i.category)))
      opps.push({ service:'Conversion Rate Optimization',          priority:'high',   description:'Better CTAs, forms, and social proof to turn visitors into leads' });
    if (issues.some(i => i.category === 'analytics'))
      opps.push({ service:'Analytics & Tracking Setup',            priority:'medium', description:'Track visitors, conversions, and ROI accurately' });
    if (issues.some(i => i.category === 'content'))
      opps.push({ service:'Content Marketing',                     priority:'medium', description:'Blog + LinkedIn content for authority and organic traffic' });

    result.opportunities = opps;

    let score = 100;
    issues.forEach(i => {
      if (i.severity === 'critical')    score -= 20;
      else if (i.severity === 'high')   score -= 12;
      else if (i.severity === 'medium') score -= 7;
      else                              score -= 3;
    });
    result.score = Math.max(0, Math.min(100, score));

    console.log(`✅ Website ${targetUrl}: score ${result.score}, ${issues.length} issues`);

  } catch (err) {
    result.reachable = false;
    result.issues.push({ category:'availability', severity:'critical', issue:`Unreachable: ${err.message}`, fix:'Fix hosting / DNS configuration' });
    result.opportunities.push({ service:'Complete Web Presence Build', priority:'critical', description:'Website is down — critical first step' });
    result.score = 0;
    console.log(`❌ Website unreachable:`, err.message);
  }

  res.json(result);
});

// ════════════════════════════════════════════
// FREE AI ANALYSIS (Groq → Gemini fallback)
// POST /analyze/ai
// ════════════════════════════════════════════
app.post('/analyze/ai', async (req, res) => {
  const { company, website_data, industry, job_title, lusha_data } = req.body;
  if (!company) return res.status(400).json({ error: 'company required' });

  const prompt = `You are a senior digital strategy consultant at OnneaLabs.
OnneaLabs helps businesses with: website design/development, SEO, marketing automation, lead generation, conversion optimization, performance marketing, and brand strategy.

Analyze this company and identify EXACTLY how OnneaLabs can help them. Be specific and actionable.

Company: ${company}
Industry: ${industry || 'Unknown'}
Contact Role: ${job_title || 'Decision maker'}
${lusha_data ? `Verified company data: employees ${lusha_data.employees || '?'}, revenue ${lusha_data.revenue || '?'}` : ''}
${website_data ? `
Website Analysis:
- Score: ${website_data.score}/100 (lower = more problems = hotter lead)
- Load time: ${website_data.load_time_ms}ms
- Tech stack: ${website_data.tech_detected?.join(', ') || 'unknown'}
- Issues found: ${website_data.issues?.map(i => `[${i.severity}] ${i.issue}`).join(' | ') || 'none'}
` : 'No website data available.'}

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "company_summary": "one sentence describing what this company does",
  "biggest_gap": "the single most critical thing missing from their digital presence",
  "pain_points": ["specific pain point 1", "specific pain point 2", "specific pain point 3"],
  "opportunities": [
    {
      "service": "Service name",
      "priority": "critical",
      "description": "Specific reason why they need this",
      "estimated_impact": "Expected business outcome"
    }
  ],
  "recommended_pitch": "A 2-3 sentence personalized outreach pitch referencing their specific situation",
  "qualification_score": 78,
  "qualification_reason": "One sentence explaining the score",
  "suggested_subject_line": "Email subject under 50 characters",
  "key_talking_points": ["talking point 1", "talking point 2", "talking point 3"]
}`;

  try {
    let aiResponse;

    if (GROQ_API_KEY) {
      console.log('→ Trying Groq AI...');
      try {
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method:  'POST',
          headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            model:           'llama-3.3-70b-versatile',
            messages:        [{ role: 'user', content: prompt }],
            temperature:     0.3,
            max_tokens:      2000,
            response_format: { type: 'json_object' },
          }),
        });
        if (r.ok) {
          const d = await r.json();
          aiResponse = d.choices?.[0]?.message?.content;
          console.log('✅ Groq responded');
        } else {
          console.warn('Groq failed:', r.status);
        }
      } catch (e) { console.warn('Groq error:', e.message); }
    }

    if (!aiResponse && GEMINI_API_KEY) {
      console.log('→ Trying Gemini AI...');
      try {
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
              contents:         [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.3, maxOutputTokens: 2000 },
            }),
          }
        );
        if (r.ok) {
          const d = await r.json();
          aiResponse = d.candidates?.[0]?.content?.parts?.[0]?.text;
          console.log('✅ Gemini responded');
        } else {
          console.warn('Gemini failed:', r.status);
        }
      } catch (e) { console.warn('Gemini error:', e.message); }
    }

    if (!aiResponse) {
      return res.status(200).json({
        company,
        analysis: null,
        error: 'No AI API key configured.',
      });
    }

    let analysis;
    try {
      const cleaned = aiResponse
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/gi, '')
        .trim();
      analysis = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('AI JSON parse failed:', parseErr.message);
      analysis = { raw_response: aiResponse, parse_error: true };
    }

    res.json({
      company,
      analysis,
      provider:  GROQ_API_KEY ? 'groq' : 'gemini',
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    console.error('AI analysis error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════
// FULL LEAD QUALIFICATION PIPELINE
// POST /qualify/lead
// ════════════════════════════════════════════
app.post('/qualify/lead', async (req, res) => {
  const { name, company, email, website, industry, job_title, linkedin_url } = req.body;
  console.log(`→ Qualifying lead: ${name || 'unknown'} @ ${company || 'unknown'}`);

  const q = {
    lead:             { name, company, email, website, industry, job_title, linkedin_url },
    lusha_enrichment: null,
    website_analysis: null,
    ai_analysis:      null,
    overall_score:    0,
    priority:         'not_assessed',
    timestamp:        new Date().toISOString(),
  };

  try {
    // STEP 1: Lusha enrichment
    if (LUSHA_API_KEY && (name || linkedin_url)) {
      try {
        const r = await fetch('http://localhost:3001/lusha/enrich-lead', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ name, company, email, linkedin_url }),
        });
        const d = await r.json();
        if (d.success) {
          q.lusha_enrichment = d;
          if (!email && d.enriched?.email) q.lead.email = d.enriched.email;
          console.log('  → Lusha enrichment: ✅');
        } else {
          console.log('  → Lusha enrichment: not found');
        }
      } catch (e) { console.warn('  → Lusha enrichment failed:', e.message); }
    }

    // STEP 2: Website analysis
    const siteUrl = website || q.lusha_enrichment?.enriched?.company_website;
    if (siteUrl) {
      try {
        const r = await fetch('http://localhost:3001/analyze/website', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ url: siteUrl }),
        });
        q.website_analysis = await r.json();
        console.log(`  → Website: score ${q.website_analysis.score}/100`);
      } catch (e) { console.warn('  → Website analysis failed:', e.message); }
    }

    // STEP 3: AI analysis
    if (company) {
      try {
        const r = await fetch('http://localhost:3001/analyze/ai', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            company,
            website_data: q.website_analysis,
            industry:     industry || q.lusha_enrichment?.enriched?.industry,
            job_title:    job_title || q.lusha_enrichment?.enriched?.job_title,
            lusha_data:   q.lusha_enrichment?.company_data,
          }),
        });
        q.ai_analysis = await r.json();
        console.log(`  → AI: ${q.ai_analysis.analysis ? 'success' : 'failed'}`);
      } catch (e) { console.warn('  → AI analysis failed:', e.message); }
    }

    // STEP 4: Calculate overall score
    let score = 50;

    if (q.lusha_enrichment?.success) {
      if (q.lusha_enrichment.enriched?.email) score += 10;
      if (q.lusha_enrichment.enriched?.phone) score += 5;
    }

    if (q.website_analysis) {
      const issueCount = q.website_analysis.issues?.length || 0;
      const webScore   = q.website_analysis.score || 50;
      score += issueCount >= 6 ? 25 : issueCount >= 4 ? 18 : issueCount >= 2 ? 10 : 0;
      score += webScore < 30 ? 15 : webScore < 50 ? 10 : webScore < 70 ? 5 : 0;
    }

    if (q.ai_analysis?.analysis?.qualification_score) {
      const aiScore = Number(q.ai_analysis.analysis.qualification_score) || 0;
      score = Math.round((score + aiScore) / 2);
    }

    q.overall_score = Math.max(0, Math.min(100, score));
    q.priority      = q.overall_score >= 80 ? 'critical'
                    : q.overall_score >= 65 ? 'high'
                    : q.overall_score >= 45 ? 'medium'
                    : 'low';

    console.log(`✅ Qualification done: score ${q.overall_score} → ${q.priority}`);

  } catch (err) {
    console.error('Qualify pipeline error:', err.message);
    q.error = err.message;
  }

  res.json(q);
});


// ════════════════════════════════════════════
// GMAIL — SEND BULK EMAILS
// POST /email/send-bulk
// ════════════════════════════════════════════
function createGmailTransport() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type:         'OAuth2',
      user:         GMAIL_FROM,
      clientId:     GMAIL_CLIENT_ID,
      clientSecret: GMAIL_CLIENT_SECRET,
      refreshToken: GMAIL_REFRESH_TOKEN,
    },
  });
}

function replacePlaceholders(text, lead) {
  const firstName = (lead.name || '').split(' ')[0] || 'there';
  return text
    .replace(/\{\{first_name\}\}/gi, firstName)
    .replace(/\{\{name\}\}/gi,       lead.name      || 'there')
    .replace(/\{\{company\}\}/gi,    lead.company   || 'your company')
    .replace(/\{\{title\}\}/gi,      lead.job_title || 'your role')
    .replace(/\{\{industry\}\}/gi,   lead.industry  || 'your industry');
}

app.post('/email/send-bulk', async (req, res) => {
  const { leads, subject, body, from_name } = req.body;
  if (!leads?.length)    return res.status(400).json({ error: 'leads array required' });
  if (!subject || !body) return res.status(400).json({ error: 'subject and body required' });

  const transport = createGmailTransport();
  const results   = [];
  let sent = 0, failed = 0;

  for (const lead of leads) {
    if (!lead.email) {
      results.push({ id: lead.id, success: false, error: 'no email' });
      failed++;
      continue;
    }

    try {
      const pSubject = replacePlaceholders(subject, lead);
      const pBody    = replacePlaceholders(body,    lead);

      await transport.sendMail({
        from:    `${from_name || 'OnneaLabs'} <${GMAIL_FROM}>`,
        to:      lead.email,
        subject: pSubject,
        text:    pBody,
        html:    pBody.replace(/\n/g, '<br>'),
      });

      // Update lead stage to contacted
      const { data: current } = await supabase
        .from('leads')
        .select('remarks')
        .eq('id', lead.id)
        .single();

      await supabase
        .from('leads')
        .update({
          contact_stage: 'contacted',
          remarks: (current?.remarks ? current.remarks + '\n' : '') +
                   `Email sent ${new Date().toLocaleDateString()}: "${pSubject}"`,
        })
        .eq('id', lead.id);

      results.push({ id: lead.id, success: true });
      sent++;
      console.log(`✅ Sent to ${lead.email}`);
      await new Promise(r => setTimeout(r, 300));

    } catch (err) {
      console.error(`❌ Failed ${lead.email}:`, err.message);
      results.push({ id: lead.id, success: false, error: err.message });
      failed++;
    }
  }

  res.json({ sent, failed, total: leads.length, results });
});

// ════════════════════════════════════════════
// GMAIL — CHECK FOR REPLIES
// POST /email/check-replies
// ════════════════════════════════════════════
app.post('/email/check-replies', async (req, res) => {
  try {
    const oauth2Client = new google.auth.OAuth2(
      GMAIL_CLIENT_ID,
      GMAIL_CLIENT_SECRET,
      'urn:ietf:wg:oauth:2.0:oob'
    );
    oauth2Client.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN });

    const gmail   = google.gmail({ version: 'v1', auth: oauth2Client });
    const response = await gmail.users.messages.list({
      userId:     'me',
      q:          'in:inbox is:unread newer_than:7d',
      maxResults: 50,
    });

    const messages    = response.data.messages || [];
    let updatedCount  = 0;

    for (const msg of messages) {
      const full = await gmail.users.messages.get({
        userId:          'me',
        id:              msg.id,
        format:          'metadata',
        metadataHeaders: ['From', 'In-Reply-To', 'References'],
      });

      const headers    = full.data.payload.headers;
      const inReplyTo  = headers.find(h => h.name === 'In-Reply-To')?.value;
      const references = headers.find(h => h.name === 'References')?.value;
      const fromHeader = headers.find(h => h.name === 'From')?.value || '';

      // Only process actual replies (must have In-Reply-To or References)
      if (!inReplyTo && !references) continue;

      const emailMatch  = fromHeader.match(/<([^>]+)>/) || [null, fromHeader.match(/([^\s]+@[^\s]+)/)?.[1]];
      const senderEmail = emailMatch?.[1]?.toLowerCase().trim();
      if (!senderEmail) continue;

      console.log('→ Reply from:', senderEmail);

      // Find matching lead in Supabase
      const { data: leads } = await supabase
        .from('leads')
        .select('id, name, contact_stage, remarks')
        .ilike('email', senderEmail);

      for (const lead of (leads || [])) {
        // Only update if not already responded/meeting/won
        if (['responded','meeting_scheduled','proposal_sent','negotiation','won'].includes(lead.contact_stage)) continue;

        await supabase
          .from('leads')
          .update({
            contact_stage: 'responded',
            remarks: (lead.remarks ? lead.remarks + '\n' : '') +
                     `✅ Reply received ${new Date().toLocaleDateString()} — follow up now!`,
          })
          .eq('id', lead.id);

        console.log(`✅ ${lead.name} → responded`);
        updatedCount++;
      }

      // Mark email as read so we don't process it again
      await gmail.users.messages.modify({
        userId:  'me',
        id:      msg.id,
        requestBody: { removeLabelIds: ['UNREAD'] },
      });
    }

    res.json({ checked: messages.length, updated: updatedCount });

  } catch (err) {
    console.error('Reply check error:', err.message);
    res.status(500).json({ error: err.message });
  }
});
// ════════════════════════════════════════════
// 404 HANDLER
// ════════════════════════════════════════════
app.use((req, res) => {
  console.warn(`⚠️  404: ${req.method} ${req.path}`);
  res.status(404).json({
    error:     `Route not found: ${req.method} ${req.path}`,
    available: [
      'GET  /',
      'POST /apollo/search',
      'POST /lusha/search',
      'POST /lusha/person',
      'POST /lusha/company',
      'POST /lusha/enrich-lead',
      'POST /lusha/bulk-enrich',
      'GET  /lusha/credits',
      'POST /verify/email',
      'POST /analyze/website',
      'POST /analyze/ai',
      'POST /qualify/lead',
    ]
  });
});
// Auto-check replies every 10 minutes
setInterval(async () => {
  try {
    const res  = await fetch('http://localhost:3001/email/check-replies', { method: 'POST' });
    const data = await res.json();
    if (data.updated > 0) console.log(`🔔 ${data.updated} leads updated to responded`);
  } catch (e) { console.error('Reply check failed:', e.message); }
}, 1 * 60 * 1000);
// ════════════════════════════════════════════
// START
// ════════════════════════════════════════════
app.listen(3001, () => {
  console.log('');
  console.log('╔════════════════════════════════════════╗');
  console.log('║   OnneaLabs Proxy  →  localhost:3001   ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('');
  console.log('API Keys:');
  console.log(`  Apollo:  ${APOLLO_API_KEY  ? '✅ Set' : '❌ Not set (optional)'}`);
  console.log(`  Lusha:   ${LUSHA_API_KEY   ? '✅ Set' : '❌ MISSING — add your key!'}`);
  console.log(`  Groq:    ${GROQ_API_KEY    ? '✅ Set' : '❌ Not set — free at console.groq.com'}`);
  console.log(`  Gemini:  ${GEMINI_API_KEY  ? '✅ Set' : '❌ Not set — free at aistudio.google.com'}`);
  console.log('');
  console.log('Routes ready:');
  console.log('  POST /apollo/search');
  console.log('  POST /lusha/search        ← prospecting');
  console.log('  POST /lusha/person        ← single lookup');
  console.log('  POST /lusha/enrich-lead   ← enrich from DB');
  console.log('  POST /lusha/bulk-enrich   ← batch enrich');
  console.log('  GET  /lusha/credits       ← check balance');
  console.log('  POST /verify/email        ← free DNS check');
  console.log('  POST /analyze/website     ← site scanner');
  console.log('  POST /analyze/ai          ← AI insights');
  console.log('  POST /qualify/lead        ← full pipeline');
  console.log('');
  console.log('Keep this terminal open while using the app.');
  console.log('');
});