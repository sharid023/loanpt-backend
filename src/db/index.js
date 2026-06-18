const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const now = () => new Date().toISOString();

const db = {
  // ── USERS ──────────────────────────────────────────────────────────────
  users: {
    findAll: async () => {
      const { data } = await supabase.from('users').select('*');
      return data || [];
    },
    findByPhone: async (phone) => {
      const { data } = await supabase.from('users').select('*').eq('phone', phone).maybeSingle();
      return data || null;
    },
    findByEmail: async (email) => {
      const { data } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
      return data || null;
    },
    findById: async (id) => {
      const { data } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
      return data || null;
    },
    create: async (user) => {
      const record = { created_at: now(), pan: null, city: null, ...user };
      const { data } = await supabase.from('users').insert(record).select().single();
      return data;
    },
    update: async (id, fields) => {
      const clean = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined && v !== null));
      const { data } = await supabase.from('users').update(clean).eq('id', id).select().single();
      return data;
    },
  },

  // ── APPLICATIONS ───────────────────────────────────────────────────────
  applications: {
    findAll: async () => {
      const { data } = await supabase.from('applications').select('*').order('created_at', { ascending: false });
      return data || [];
    },
    create: async (app) => {
      const record = { status: 'SUBMITTED', created_at: now(), updated_at: now(), status_history: [], ...app };
      const { data } = await supabase.from('applications').insert(record).select().single();
      return data;
    },
    updateStatus: async (id, status, comment) => {
      const { data: existing } = await supabase.from('applications').select('status_history').eq('id', id).maybeSingle();
      if (!existing) return null;
      const history = [...(existing.status_history || []), { status, comment: comment || '', changedAt: now() }];
      const { data } = await supabase.from('applications')
        .update({ status, updated_at: now(), status_history: history })
        .eq('id', id).select().single();
      return data;
    },
    findByUser: async (userId) => {
      const { data } = await supabase.from('applications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      return data || [];
    },
    findByLan: async (lan, userId) => {
      let query = supabase.from('applications').select('*').eq('lan', lan);
      if (userId) query = query.eq('user_id', userId);
      const { data } = await query.maybeSingle();
      return data || null;
    },
    findByLans: async (lans) => {
      if (!lans || lans.length === 0) return [];
      const { data } = await supabase.from('applications').select('*').in('lan', lans);
      return data || [];
    },
  },

  // ── DOCUMENTS ──────────────────────────────────────────────────────────
  documents: {
    findAll: async () => {
      const { data } = await supabase.from('documents').select('*');
      return data || [];
    },
    create: async (doc) => {
      const record = { uploaded_at: now(), ...doc };
      const { data } = await supabase.from('documents').insert(record).select().single();
      return data;
    },
    findByUser: async (userId) => {
      const { data } = await supabase.from('documents').select('*').eq('user_id', userId).order('uploaded_at', { ascending: false });
      return data || [];
    },
  },

  // ── TICKETS ────────────────────────────────────────────────────────────
  tickets: {
    findAll: async () => {
      const { data } = await supabase.from('tickets').select('*');
      return data || [];
    },
    create: async (ticket) => {
      const record = { status: 'OPEN', created_at: now(), ...ticket };
      const { data } = await supabase.from('tickets').insert(record).select().single();
      return data;
    },
    findByUser: async (userId) => {
      const { data } = await supabase.from('tickets').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      return data || [];
    },
  },
};

module.exports = db;
