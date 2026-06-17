require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const db = require('./db');
const { generateLAN } = require('./utils/lan');
const { sendPushNotification } = require('./utils/push');

const authRoutes = require('./routes/auth');
const loanRoutes = require('./routes/loans');
const creditCardRoutes = require('./routes/creditcards');
const documentRoutes = require('./routes/documents');
const supportRoutes = require('./routes/support');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ── Health check ──────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'LoanPT Backend API', version: '1.0.0' });
});

// ── Mount routes ──────────────────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/user', authRoutes); // /user/profile handled inside auth.js
app.use('/loans', loanRoutes);
app.use('/loan-track', loanRoutes); // /loan-track/* handled inside loans.js
app.use('/credit-cards', creditCardRoutes);
app.use('/documents', documentRoutes);
app.use('/support', supportRoutes);

// ─────────────────────────────────────────────────────────────────────────
// 🌐 WEBSITE SYNC WEBHOOK
// loanpt.com calls this endpoint whenever a customer applies for a loan
// on the WEBSITE. It creates the same application record, so it instantly
// shows up in "Recent Activities" inside the mobile app (matched by phone/email).
//
// Secure with header:  x-admin-key: <ADMIN_KEY from .env>
// ─────────────────────────────────────────────────────────────────────────
app.post('/webhook/website-application', (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const {
    productType,        // PERSONAL_LOAN | OD_LIMIT | CREDIT_CARD | BALANCE_TRANSFER
    phone, email, name,
    amount, tenure, employmentType, monthlyIncome, bankName, cardName, city,
  } = req.body;

  if (!productType || (!phone && !email)) {
    return res.status(400).json({ message: 'productType and phone/email are required' });
  }

  // Find matching app user by phone or email (so it appears after they log in)
  let user = null;
  if (phone) user = db.users.findByPhone(phone);
  if (!user && email) user = db.users.findByEmail(email);

  const id = uuidv4();
  const lan = generateLAN(productType);

  const application = db.applications.create({
    id, lan, user_id: user ? user.id : null, product_type: productType, status: 'SUBMITTED',
    amount: amount || null, tenure: tenure || null, employment_type: employmentType || null,
    monthly_income: monthlyIncome || null, bank_name: bankName || null, card_name: cardName || null,
    applicant_name: name || null, applicant_mobile: phone || null, applicant_email: email || null,
    city: city || null, source: 'website',
  });

  if (user && user.expo_push_token) {
    sendPushNotification(
      user.expo_push_token,
      'New Application Synced',
      `Your ${productType.replace('_', ' ')} application (${lan}) is now visible in Recent Activities.`,
      { lan }
    );
  }

  res.status(201).json({
    message: 'Website application synced to LoanPT app',
    matchedExistingUser: !!user,
    application,
  });
});

// ── Recent Activities (combined app + website) ───────────────────────────
const { authMiddleware } = require('./middleware/auth');
app.get('/activities/recent', authMiddleware, (req, res) => {
  const apps = db.applications.findByUser(req.user.id).slice(0, 20);
  res.json({ activities: apps });
});

// ── 404 handler ───────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ message: 'Not found' }));

// ── Error handler ─────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

app.listen(PORT, () => {
  console.log(`✅ LoanPT Backend running on http://localhost:${PORT}`);
});
