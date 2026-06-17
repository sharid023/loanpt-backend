const express = require('express');
const router = express.Router();
const db = require('../db');

// Simple key-based auth for admin
const adminAuth = (req, res, next) => {
  const key = req.query.key || req.headers['x-admin-key'];
  if (key !== process.env.ADMIN_KEY) {
    return res.status(401).send(`
      <!DOCTYPE html>
      <html>
      <head><title>LoanPT Admin</title>
      <style>
        body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #1a237e; }
        .box { background: white; padding: 40px; border-radius: 16px; text-align: center; max-width: 400px; width: 90%; }
        h2 { color: #1a237e; } input { width: 100%; padding: 12px; margin: 12px 0; border: 2px solid #ddd; border-radius: 8px; font-size: 15px; box-sizing: border-box; }
        button { background: #1a237e; color: white; border: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; cursor: pointer; width: 100%; }
      </style></head>
      <body><div class="box">
        <h2>🔐 LoanPT Admin</h2>
        <p>Enter admin key to access dashboard</p>
        <form method="GET" action="/admin">
          <input type="password" name="key" placeholder="Admin Key" required />
          <button type="submit">Login</button>
        </form>
      </div></body></html>
    `);
  }
  next();
};

router.get('/', adminAuth, (req, res) => {
  const key = req.query.key;
  const applications = [...db.applications.findAll()].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
  const users = db.users.findAll();
  const documents = db.documents.findAll();
  const tickets = db.tickets.findAll();

  const statusColor = { SUBMITTED: '#f59e0b', APPROVED: '#10b981', REJECTED: '#ef4444', PROCESSING: '#3b82f6' };

  const appRows = applications.map(a => `
    <tr>
      <td><span style="font-weight:700;color:#1a237e">${a.lan || '—'}</span></td>
      <td>${a.product_type || '—'}</td>
      <td>${a.applicant_name || a.applicant_mobile || '—'}</td>
      <td>${a.amount || '—'}</td>
      <td>${a.tenure || '—'}</td>
      <td><span style="background:${statusColor[a.status] || '#6b7280'}20;color:${statusColor[a.status] || '#6b7280'};padding:4px 10px;border-radius:20px;font-weight:700;font-size:12px">${a.status}</span></td>
      <td>${a.source || 'app'}</td>
      <td style="font-size:12px;color:#6b7280">${new Date(a.created_at).toLocaleString('en-IN')}</td>
    </tr>
  `).join('');

  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>LoanPT Admin Dashboard</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f1f5f9; color: #1e293b; }
    .header { background: linear-gradient(135deg, #1a237e, #283593); color: white; padding: 20px 32px; display: flex; align-items: center; gap: 16px; }
    .header h1 { font-size: 22px; font-weight: 800; }
    .header p { font-size: 13px; opacity: 0.8; }
    .stats { display: flex; gap: 16px; padding: 24px 32px; flex-wrap: wrap; }
    .stat { background: white; border-radius: 14px; padding: 20px 24px; flex: 1; min-width: 150px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); border-left: 4px solid #1a237e; }
    .stat .num { font-size: 32px; font-weight: 900; color: #1a237e; }
    .stat .lbl { font-size: 13px; color: #64748b; margin-top: 4px; }
    .section { margin: 0 32px 32px; }
    .section h2 { font-size: 18px; font-weight: 700; margin-bottom: 16px; color: #1e293b; }
    .card { background: white; border-radius: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f8fafc; padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; }
    td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #f8fafc; }
    .empty { text-align: center; padding: 40px; color: #94a3b8; font-size: 15px; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
    .refresh { background: #1a237e; color: white; border: none; padding: 8px 18px; border-radius: 8px; cursor: pointer; font-size: 13px; text-decoration: none; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>🏦 LoanPT Admin Dashboard</h1>
      <p>Live data from backend · <a href="/admin?key=${key}" style="color:white">Refresh</a></p>
    </div>
  </div>

  <div class="stats">
    <div class="stat"><div class="num">${applications.length}</div><div class="lbl">Total Applications</div></div>
    <div class="stat"><div class="num">${applications.filter(a=>a.status==='SUBMITTED').length}</div><div class="lbl">Pending Review</div></div>
    <div class="stat"><div class="num">${users.length}</div><div class="lbl">Registered Users</div></div>
    <div class="stat"><div class="num">${documents.length}</div><div class="lbl">Documents Uploaded</div></div>
    <div class="stat"><div class="num">${tickets.length}</div><div class="lbl">Support Tickets</div></div>
  </div>

  <div class="section">
    <h2>📋 Loan Applications</h2>
    <div class="card">
      ${applications.length === 0
        ? '<div class="empty">📭 No applications yet</div>'
        : `<table>
          <thead><tr>
            <th>LAN</th><th>Product</th><th>Applicant</th><th>Amount</th><th>Tenure</th><th>Status</th><th>Source</th><th>Date</th>
          </tr></thead>
          <tbody>${appRows}</tbody>
        </table>`
      }
    </div>
  </div>

  <div class="section">
    <h2>👥 Registered Users (${users.length})</h2>
    <div class="card">
      ${users.length === 0
        ? '<div class="empty">No users yet</div>'
        : `<table>
            <thead><tr><th>Phone</th><th>Name</th><th>Email</th><th>City</th><th>Joined</th></tr></thead>
            <tbody>
              ${users.map(u => `<tr>
                <td style="font-weight:700">${u.phone || '—'}</td>
                <td>${u.name || '—'}</td>
                <td>${u.email || '—'}</td>
                <td>${u.city || '—'}</td>
                <td style="font-size:12px;color:#6b7280">${new Date(u.created_at).toLocaleString('en-IN')}</td>
              </tr>`).join('')}
            </tbody>
          </table>`
      }
    </div>
  </div>

  <div class="section">
    <h2>🎫 Support Tickets (${tickets.length})</h2>
    <div class="card">
      ${tickets.length === 0
        ? '<div class="empty">No tickets yet</div>'
        : `<table>
            <thead><tr><th>Subject</th><th>Category</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              ${tickets.map(t => `<tr>
                <td>${t.subject || '—'}</td>
                <td>${t.category || '—'}</td>
                <td><span style="color:${t.status==='OPEN'?'#f59e0b':'#10b981'};font-weight:700">${t.status}</span></td>
                <td style="font-size:12px;color:#6b7280">${new Date(t.created_at).toLocaleString('en-IN')}</td>
              </tr>`).join('')}
            </tbody>
          </table>`
      }
    </div>
  </div>
</body>
</html>`);
});

module.exports = router;
