const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const { generateLAN } = require('../utils/lan');

const router = express.Router();

// ─── Generic application creator ─────────────────────────────────────────────
function createApplication({ userId, productType, body, source = 'app' }) {
  const id = uuidv4();
  const lan = generateLAN(productType);

  return db.applications.create({
    id, lan, user_id: userId || null, product_type: productType, status: 'SUBMITTED',
    amount: body.amount || body.selectedAmount || null,
    tenure: body.tenure || body.selectedTenure || null,
    employment_type: body.employment || body.employmentType || null,
    monthly_income: body.monthlyIncome || null,
    bank_name: body.bankName || body.bank || null,
    card_name: body.cardName || body.selectedCard || null,
    applicant_name: body.name || body.applicantName || null,
    applicant_mobile: body.mobile || body.phone || null,
    applicant_email: body.email || null,
    city: body.city || null,
    source,
  });
}

// ─── PERSONAL LOAN ─────────────────────────────────────────────────────────
router.get('/personal/offers', (req, res) => {
  res.json({
    offers: [
      { lender: 'HDFC Bank', maxAmount: '₹50,00,000', rate: '10.5% p.a.', tenure: 'Up to 60 months' },
      { lender: 'ICICI Bank', maxAmount: '₹40,00,000', rate: '10.75% p.a.', tenure: 'Up to 60 months' },
      { lender: 'Axis Bank', maxAmount: '₹35,00,000', rate: '11% p.a.', tenure: 'Up to 60 months' },
      { lender: 'Bajaj Finserv', maxAmount: '₹25,00,000', rate: '12% p.a.', tenure: 'Up to 60 months' },
    ],
  });
});

router.post('/personal/apply', optionalAuth, (req, res) => {
  const app = createApplication({ userId: req.user.id, productType: 'PERSONAL_LOAN', body: req.body });
  res.status(201).json({ message: 'Application submitted', application: app });
});

// ─── OD LIMIT ──────────────────────────────────────────────────────────────
router.get('/od/offers', (req, res) => {
  res.json({
    offers: [
      { lender: 'SBI', maxLimit: '₹25,00,000', rate: '11.5% p.a. (on usage)' },
      { lender: 'Kotak Bank', maxLimit: '₹15,00,000', rate: '12% p.a. (on usage)' },
      { lender: 'PNB', maxLimit: '₹10,00,000', rate: '12.5% p.a. (on usage)' },
    ],
  });
});

router.post('/od/apply', optionalAuth, (req, res) => {
  const app = createApplication({ userId: req.user.id, productType: 'OD_LIMIT', body: req.body });
  res.status(201).json({ message: 'OD application submitted', application: app });
});

// ─── BALANCE TRANSFER ─────────────────────────────────────────────────────────
router.get('/balance-transfer/offers', (req, res) => {
  res.json({
    offers: [
      { lender: 'HDFC Bank', rate: '9.99% p.a.', processingFee: '0.5%', topUp: 'Up to ₹10,00,000' },
      { lender: 'ICICI Bank', rate: '10.25% p.a.', processingFee: '0.75%', topUp: 'Up to ₹8,00,000' },
    ],
  });
});

router.post('/balance-transfer/apply', optionalAuth, (req, res) => {
  const app = createApplication({ userId: req.user.id, productType: 'BALANCE_TRANSFER', body: req.body });
  res.status(201).json({ message: 'Balance Transfer application submitted', application: app });
});

// ─── LOAN TRACK (LoanPT-LAN) ──────────────────────────────────────────────────
router.get('/loan-track/my-loans', authMiddleware, (req, res) => {
  const apps = db.applications.findByUser(req.user.id);
  res.json({ loans: apps });
});

router.get('/loan-track/:lan', authMiddleware, (req, res) => {
  const app = db.applications.findByLan(req.params.lan, req.user.id);
  if (!app) return res.status(404).json({ message: 'Application not found' });
  res.json(app);
});

router.get('/loan-track/:lan/emi-schedule', authMiddleware, (req, res) => {
  const app = db.applications.findByLan(req.params.lan, req.user.id);
  if (!app) return res.status(404).json({ message: 'Application not found' });

  // Generate a simple demo EMI schedule based on amount/tenure
  const amount = parseFloat((app.amount || '0').replace(/[^0-9.]/g, '')) || 100000;
  const months = parseInt((app.tenure || '12').replace(/[^0-9]/g, '')) || 12;
  const rate = 0.11 / 12;
  const emi = (amount * rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1);

  const schedule = [];
  let balance = amount;
  for (let i = 1; i <= months; i++) {
    const interest = balance * rate;
    const principal = emi - interest;
    balance -= principal;
    schedule.push({
      month: i,
      emi: Math.round(emi),
      principal: Math.round(principal),
      interest: Math.round(interest),
      balance: Math.max(0, Math.round(balance)),
    });
  }
  res.json({ lan: app.lan, monthlyEMI: Math.round(emi), schedule });
});

module.exports = router;
