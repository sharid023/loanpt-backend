const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { optionalAuth } = require('../middleware/auth');
const { generateLAN } = require('../utils/lan');

const router = express.Router();

router.get('/offers', (req, res) => {
  res.json({ cards: [
    { id: 1, name: 'LoanPT Platinum', bank: 'HDFC Bank', limit: '₹1L – ₹5L', fee: 'Zero Fee', badge: 'Best Seller' },
    { id: 2, name: 'LoanPT Gold', bank: 'ICICI Bank', limit: '₹50K – ₹3L', fee: '₹500/yr', badge: '₹200 Cashback' },
    { id: 3, name: 'LoanPT Classic', bank: 'Axis Bank', limit: '₹25K – ₹1L', fee: 'Zero Fee', badge: '100% Approval' },
    { id: 4, name: 'RuPay Credit Card', bank: 'Bank of Baroda', limit: '₹20K – ₹75K', fee: 'Zero Fee', badge: 'UPI Enabled' },
  ]});
});

router.post('/apply', optionalAuth, async (req, res) => {
  const { name, mobile, email, city, incomeType, cardName, bankName, applicantName, applicantMobile, applicantEmail } = req.body;
  try {
    const id = uuidv4();
    const lan = generateLAN('CREDIT_CARD');
    const application = await db.applications.create({
      id, lan, user_id: req.user?.id || null, product_type: 'CREDIT_CARD', status: 'SUBMITTED',
      employment_type: incomeType, card_name: cardName,
      applicant_name: applicantName || name, applicant_mobile: applicantMobile || mobile,
      applicant_email: applicantEmail || email, city, source: 'app', bank_name: bankName || null,
    });
    res.status(201).json({ message: 'Credit card application submitted', application });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
