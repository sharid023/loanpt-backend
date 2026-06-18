const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { signToken, authMiddleware } = require('../middleware/auth');

const router = express.Router();
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

async function findOrCreateUserByPhone(phone) {
  let user = await db.users.findByPhone(phone);
  if (!user) {
    user = await db.users.create({ id: uuidv4(), phone, email: null, name: null, photo: null, login_type: 'phone' });
  }
  return user;
}

async function findOrCreateUserByEmail({ email, name, photo }) {
  let user = await db.users.findByEmail(email);
  if (!user) {
    user = await db.users.create({ id: uuidv4(), phone: null, email, name, photo, login_type: 'google' });
  } else {
    user = await db.users.update(user.id, { name, photo });
  }
  return user;
}

router.post('/send-otp', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ message: 'Phone number is required' });
  try {
    const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=${FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: phone, recaptchaToken: 'server-trusted' }),
    });
    const data = await r.json();
    if (data.error) return res.status(400).json({ message: data.error.message || 'Failed to send OTP' });
    return res.json({ sessionInfo: data.sessionInfo, message: 'OTP sent successfully' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/verify-otp', async (req, res) => {
  const { phone, sessionInfo, otp } = req.body;
  if (!sessionInfo || !otp) return res.status(400).json({ message: 'sessionInfo and otp are required' });
  try {
    const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key=${FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionInfo, code: otp }),
    });
    const data = await r.json();
    if (data.error) return res.status(400).json({ message: data.error.message || 'Invalid OTP' });
    const user = await findOrCreateUserByPhone(phone || data.phoneNumber);
    const token = signToken(user);
    return res.json({ token, user });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/google', async (req, res) => {
  const { name, email, photo } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });
  try {
    const user = await findOrCreateUserByEmail({ email, name, photo });
    const token = signToken(user);
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await db.users.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { name, email, pan, city, companyName } = req.body;
    const user = await db.users.update(req.user.id, { name, email, pan, city, company_name: companyName });
    res.json(user);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/push-token', authMiddleware, async (req, res) => {
  const { expoPushToken } = req.body;
  if (!expoPushToken) return res.status(400).json({ message: 'expoPushToken is required' });
  try {
    const user = await db.users.update(req.user.id, { expo_push_token: expoPushToken });
    res.json({ message: 'Push token registered', user });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
