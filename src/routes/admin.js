const express = require('express');
const router = express.Router();
const db = require('../db');

const adminAuth = (req, res, next) => {
  const key = req.query.key || req.headers['x-admin-key'];
  if (key !== process.env.ADMIN_KEY) {
    return res.status(401).send(`<!DOCTYPE html><html><head><title>LoanPT Admin</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;background:#1a237e}
    .box{background:white;padding:40px;border-radius:16px;text-align:center;max-width:400px;width:90%}
    h2{color:#1a237e;margin-bottom:8px}p{color:#64748b;margin-bottom:20px}
    input{width:100%;padding:12px;margin:8px 0 16px;border:2px solid #ddd;border-radius:8px;font-size:15px}
    button{background:#1a237e;color:white;border:none;padding:14px;border-radius:8px;font-size:16px;cursor:pointer;width:100%}
    </style></head><body><div class="box"><h2>🔐 LoanPT Admin</h2><p>Enter admin key to continue</p>
    <form method="GET" action="/admin"><input type="password" name="key" placeholder="Admin Key" required/><button>Login →</button></form>
    </div></body></html>`);
  }
  req.adminKey = key;
  next();
};

const STATUS_OPTIONS = [
  { value: 'SUBMITTED',         label: '📥 Submitted',          color: '#6b7280' },
  { value: 'UNDER_PROCESS',     label: '⚙️ Under Process',      color: '#3b82f6' },
  { value: 'HOLD',              label: '⏸️ Hold',               color: '#f59e0b' },
  { value: 'CREDIT_ALLOCATION', label: '💳 Credit Allocation',  color: '#8b5cf6' },
  { value: 'APPROVED',          label: '✅ Approved',            color: '#10b981' },
  { value: 'REJECTED',          label: '❌ Rejected',            color: '#ef4444' },
  { value: 'DISBURSED',         label: '💰 Disbursed',          color: '#059669' },
  { value: 'CLOSED',            label: '🔒 Closed',              color: '#374151' },
];

// Update application status + comment
router.post('/update-status', async (req, res) => {
  const { key, appId, status, comment } = req.body;
  if (key !== process.env.ADMIN_KEY) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const app = await db.applications.updateStatus(appId, status, comment);
    if (!app) return res.status(404).json({ message: 'Application not found' });
    res.json({ message: 'Updated', application: app });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/', adminAuth, async (req, res) => {
  const key = req.adminKey;
  const [applications, users, documents, tickets] = await Promise.all([
    db.applications.findAll(),
    db.users.findAll(),
    db.documents.findAll(),
    db.tickets.findAll(),
  ]);
  const getStatusObj = (s) => STATUS_OPTIONS.find(o => o.value === s) || STATUS_OPTIONS[0];

  const statusOptionsHtml = STATUS_OPTIONS.map(s =>
    `<option value="${s.value}">${s.label}</option>`
  ).join('');

  const appRows = applications.length === 0
    ? `<tr><td colspan="9" style="text-align:center;padding:40px;color:#94a3b8">📭 No applications yet</td></tr>`
    : applications.map(a => {
        const st = getStatusObj(a.status);
        const historyHtml = (a.statusHistory || []).map(h => `
          <div style="font-size:11px;color:#64748b;padding:3px 0;border-bottom:1px solid #f1f5f9">
            <span style="color:${getStatusObj(h.status).color};font-weight:700">${getStatusObj(h.status).label}</span>
            ${h.comment ? `· ${h.comment}` : ''}
            <span style="color:#94a3b8">· ${new Date(h.changedAt).toLocaleString('en-IN')}</span>
          </div>`).join('');
        return `
        <tr id="row-${a.id}">
          <td><span style="font-weight:800;color:#1a237e;font-size:13px">${a.lan || '—'}</span></td>
          <td style="font-size:13px">${a.product_type?.replace('_',' ') || '—'}</td>
          <td style="font-size:13px">${a.applicant_name || '—'}<br><span style="color:#94a3b8;font-size:11px">${a.applicant_mobile || ''}</span></td>
          <td style="font-size:13px">${a.amount || '—'}</td>
          <td>
            <span id="badge-${a.id}" style="background:${st.color}20;color:${st.color};padding:4px 10px;border-radius:20px;font-weight:700;font-size:12px;white-space:nowrap">${st.label}</span>
          </td>
          <td style="min-width:160px">
            <select id="status-${a.id}" style="padding:6px;border-radius:6px;border:1px solid #ddd;font-size:12px;width:100%">
              ${STATUS_OPTIONS.map(s => `<option value="${s.value}"${a.status===s.value?' selected':''}>${s.label}</option>`).join('')}
            </select>
          </td>
          <td style="min-width:180px">
            <textarea id="comment-${a.id}" rows="2" placeholder="Add comment..." style="width:100%;padding:6px;border:1px solid #ddd;border-radius:6px;font-size:12px;resize:none">${(a.statusHistory||[]).slice(-1)[0]?.comment||''}</textarea>
          </td>
          <td>
            <button onclick="updateStatus('${a.id}','${key}')" style="background:#1a237e;color:white;border:none;padding:7px 14px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:700;white-space:nowrap">
              Save ✓
            </button>
          </td>
          <td style="font-size:11px;color:#94a3b8;min-width:120px">
            ${new Date(a.created_at).toLocaleString('en-IN')}
            ${historyHtml ? `<div style="margin-top:6px">${historyHtml}</div>` : ''}
          </td>
        </tr>`;
      }).join('');

  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>LoanPT Admin Dashboard</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f1f5f9;color:#1e293b}
    .header{background:linear-gradient(135deg,#1a237e,#283593);color:white;padding:18px 28px;display:flex;align-items:center;justify-content:space-between}
    .header h1{font-size:20px;font-weight:800}.header p{font-size:12px;opacity:.8}
    .stats{display:flex;gap:12px;padding:20px 28px;flex-wrap:wrap}
    .stat{background:white;border-radius:12px;padding:16px 20px;flex:1;min-width:130px;box-shadow:0 2px 8px rgba(0,0,0,.06);border-left:4px solid #1a237e}
    .stat .num{font-size:28px;font-weight:900;color:#1a237e}.stat .lbl{font-size:12px;color:#64748b;margin-top:3px}
    .section{margin:0 28px 28px}.section h2{font-size:16px;font-weight:700;margin-bottom:12px}
    .card{background:white;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.06);overflow-x:auto}
    table{width:100%;border-collapse:collapse;min-width:900px}
    th{background:#f8fafc;padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #e2e8f0;white-space:nowrap}
    td{padding:12px 14px;border-bottom:1px solid #f1f5f9;vertical-align:top}
    tr:last-child td{border-bottom:none}tr:hover td{background:#fafafa}
    .refresh{background:rgba(255,255,255,.2);color:white;border:1px solid rgba(255,255,255,.4);padding:7px 16px;border-radius:8px;cursor:pointer;font-size:13px;text-decoration:none}
    .toast{position:fixed;bottom:24px;right:24px;background:#10b981;color:white;padding:12px 20px;border-radius:10px;font-weight:700;display:none;z-index:999;font-size:14px}
  </style>
</head>
<body>
<div class="header">
  <div><h1>🏦 LoanPT Admin Dashboard</h1><p>Live data · Auto-saves on status update</p></div>
  <a href="/admin?key=${key}" class="refresh">🔄 Refresh</a>
</div>

<div class="stats">
  <div class="stat"><div class="num">${applications.length}</div><div class="lbl">Total Applications</div></div>
  <div class="stat"><div class="num">${applications.filter(a=>a.status==='SUBMITTED').length}</div><div class="lbl">New (Submitted)</div></div>
  <div class="stat"><div class="num">${applications.filter(a=>a.status==='UNDER_PROCESS').length}</div><div class="lbl">Under Process</div></div>
  <div class="stat"><div class="num">${applications.filter(a=>a.status==='APPROVED').length}</div><div class="lbl">Approved</div></div>
  <div class="stat"><div class="num">${applications.filter(a=>a.status==='DISBURSED').length}</div><div class="lbl">Disbursed</div></div>
  <div class="stat"><div class="num">${users.length}</div><div class="lbl">Registered Users</div></div>
</div>

<div class="section">
  <h2>📋 Loan Applications</h2>
  <div class="card">
    <table>
      <thead><tr>
        <th>LAN</th><th>Product</th><th>Applicant</th><th>Amount</th>
        <th>Current Status</th><th>Change Status</th><th>Comment</th><th>Action</th><th>Date / History</th>
      </tr></thead>
      <tbody>${appRows}</tbody>
    </table>
  </div>
</div>

<div class="section">
  <h2>👥 Registered Users (${users.length})</h2>
  <div class="card">
    <table>
      <thead><tr><th>Phone</th><th>Name</th><th>Email</th><th>City</th><th>Company</th><th>Joined</th></tr></thead>
      <tbody>
        ${users.length===0?`<tr><td colspan="6" style="text-align:center;padding:30px;color:#94a3b8">No users yet</td></tr>`:
          users.map(u=>`<tr>
            <td style="font-weight:700">${u.phone||'—'}</td>
            <td>${u.name||'—'}</td><td>${u.email||'—'}</td>
            <td>${u.city||'—'}</td><td>${u.companyName||'—'}</td>
            <td style="font-size:11px;color:#94a3b8">${new Date(u.created_at).toLocaleString('en-IN')}</td>
          </tr>`).join('')}
      </tbody>
    </table>
  </div>
</div>

<div class="section">
  <h2>🎫 Support Tickets (${tickets.length})</h2>
  <div class="card">
    <table>
      <thead><tr><th>Subject</th><th>Category</th><th>Status</th><th>Date</th></tr></thead>
      <tbody>
        ${tickets.length===0?`<tr><td colspan="4" style="text-align:center;padding:30px;color:#94a3b8">No tickets yet</td></tr>`:
          tickets.map(t=>`<tr>
            <td>${t.subject||'—'}</td><td>${t.category||'—'}</td>
            <td style="color:${t.status==='OPEN'?'#f59e0b':'#10b981'};font-weight:700">${t.status}</td>
            <td style="font-size:11px;color:#94a3b8">${new Date(t.created_at).toLocaleString('en-IN')}</td>
          </tr>`).join('')}
      </tbody>
    </table>
  </div>
</div>

<div class="toast" id="toast">✅ Status updated!</div>

<script>
async function updateStatus(appId, key) {
  const status = document.getElementById('status-'+appId).value;
  const comment = document.getElementById('comment-'+appId).value;
  const btn = event.target;
  btn.textContent = '...'; btn.disabled = true;
  try {
    const res = await fetch('/admin/update-status', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ key, appId, status, comment })
    });
    const data = await res.json();
    if (res.ok) {
      // Update badge color inline
      const colors = ${JSON.stringify(Object.fromEntries(STATUS_OPTIONS.map(s=>[s.value,{color:s.color,label:s.label}])))};
      const badge = document.getElementById('badge-'+appId);
      const c = colors[status];
      badge.textContent = c.label;
      badge.style.background = c.color+'20';
      badge.style.color = c.color;
      showToast('✅ Status updated to ' + c.label);
    } else { showToast('❌ ' + data.message); }
  } catch(e) { showToast('❌ Network error'); }
  btn.textContent = 'Save ✓'; btn.disabled = false;
}
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.style.display='block';
  setTimeout(()=>t.style.display='none', 3000);
}
</script>
</body></html>`);
});

module.exports = router;
