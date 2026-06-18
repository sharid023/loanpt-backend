const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/tickets', authMiddleware, async (req, res) => {
  try {
    const tickets = await db.tickets.findByUser(req.user.id);
    res.json({ tickets });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/tickets', authMiddleware, async (req, res) => {
  const { subject, message } = req.body;
  if (!subject || !message) return res.status(400).json({ message: 'Subject and message are required' });
  try {
    const ticket = await db.tickets.create({ id: uuidv4(), user_id: req.user.id, subject, message, status: 'OPEN' });
    res.status(201).json({ message: 'Support ticket created', ticket });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/faqs', (req, res) => {
  res.json({ faqs: [
    { q: 'How long does loan approval take?', a: 'Most personal loans are approved within 24-48 hours after document verification.' },
    { q: 'What documents are required?', a: 'PAN Card, Aadhaar Card, Bank Statements (3 months), and Salary Slips (for salaried applicants).' },
    { q: 'Is there any processing fee?', a: 'Processing fees vary by lender, typically 0.5%-2% of the loan amount.' },
    { q: 'How do I track my application?', a: 'Use the LAN (Loan Application Number) shown after submission in the Loan Track section.' },
    { q: 'Can I prepay my loan?', a: 'Yes, most lenders allow prepayment after 12 EMIs with nominal charges.' },
  ]});
});

module.exports = router;
