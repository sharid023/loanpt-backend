const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { generateLAN } = require('../utils/lan');

const router = express.Router();

router.get('/offers', (req, res) => {
  res.json({
    cards: [
      { id: 1, name: 'LoanPT Platinum', bank: 'HDFC Bank', limit: '₹1L – ₹5L', fee: 'Zero Fee', badge: 'Best Seller' },
      { id: 2, name: 'LoanPT Gold', bank: 'ICICI Bank', limit: '₹50K – ₹3L', fee: '₹500/yr', badge: '₹200 Cashback' },
      { id: 3, name: 'LoanPT Classic', bank: 'Axis Bank', limit: '₹25K – ₹1L', fee: 'Zero Fee', badge: '100% Approval' },
      { id: 4, name: 'RuPay Credit Card', bank: 'Bank of Baroda', limit: '₹20K – ₹75K', fee: 'Zero Fee', badge: 'UPI Enabled' },
    ],
  });
});

router.post('/apply', authMiddleware, (req, res) => {
  const { name, mobile, email, city, incomeType, selectedCard, bank } = req.body;
  const id = uuidv4();
  const lan = generateLAN('CREDIT_CARD');

  const application = db.applications.create({
    id, lan, user_id: req.user.id, product_type: 'CREDIT_CARD', status: 'SUBMITTED',
    employment_type: incomeType, card_name: selectedCard, applicant_name: name,
    applicant_mobile: mobile, applicant_email: email, city, source: 'app', bank_name: bank || null,
  });

  res.status(201).json({ message: 'Credit card application submitted', application });
});

module.exports = router;
