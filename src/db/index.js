// Lightweight JSON-file database (no native build tools required)
// Provides a tiny query helper compatible with the rest of the codebase.

const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', '..', 'loanpt-data.json');

function loadData() {
  if (!fs.existsSync(DB_FILE)) {
    const initial = { users: [], applications: [], documents: [], tickets: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

function saveData(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

let data = loadData();

const now = () => new Date().toISOString();

const db = {
  // ── USERS ──────────────────────────────────────────────────────────────
  users: {
    findByPhone: (phone) => data.users.find(u => u.phone === phone) || null,
    findByEmail: (email) => data.users.find(u => u.email === email) || null,
    findById: (id) => data.users.find(u => u.id === id) || null,
    create: (user) => {
      const record = { created_at: now(), pan: null, city: null, ...user };
      data.users.push(record);
      saveData(data);
      return record;
    },
    update: (id, fields) => {
      const user = data.users.find(u => u.id === id);
      if (!user) return null;
      Object.entries(fields).forEach(([k, v]) => {
        if (v !== undefined && v !== null) user[k] = v;
      });
      saveData(data);
      return user;
    },
  },

  // ── APPLICATIONS ───────────────────────────────────────────────────────
  applications: {
    create: (app) => {
      const record = {
        status: 'SUBMITTED',
        created_at: now(),
        updated_at: now(),
        ...app,
      };
      data.applications.push(record);
      saveData(data);
      return record;
    },
    findByUser: (userId) =>
      data.applications
        .filter(a => a.user_id === userId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    findByLan: (lan, userId) =>
      data.applications.find(a => a.lan === lan && (!userId || a.user_id === userId)) || null,
  },

  // ── DOCUMENTS ──────────────────────────────────────────────────────────
  documents: {
    create: (doc) => {
      const record = { uploaded_at: now(), ...doc };
      data.documents.push(record);
      saveData(data);
      return record;
    },
    findByUser: (userId) =>
      data.documents
        .filter(d => d.user_id === userId)
        .sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at)),
  },

  // ── TICKETS ────────────────────────────────────────────────────────────
  tickets: {
    create: (ticket) => {
      const record = { status: 'OPEN', created_at: now(), ...ticket };
      data.tickets.push(record);
      saveData(data);
      return record;
    },
    findByUser: (userId) =>
      data.tickets
        .filter(t => t.user_id === userId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
  },
};

module.exports = db;
