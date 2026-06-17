const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { signToken, authMiddleware } = require('../middleware/auth');

const router = express.Router();
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

// ─── helper: find or create user ────────────────────────────────────────────
function findOrCreateUserByPhone(phone) {
  let user = db.users.findByPhone(phone);
  if (!user) {
    user = db.users.create({
      id: uuidv4(),
      phone,
      email: null,
      name: null,
      photo: null,
      login_type: 'phone',
    });
  }
  return user;
}

function findOrCreateUserByEmail({ email, name, photo }) {
  let user = db.users.findByEmail(email);
  if (!user) {
    user = db.users.create({
      id: uuidv4(),
      phone: null,
      email,
      name,
      photo,
      login_type: 'google',
    });
  } else {
    user = db.users.update(user.id, { name, photo });
  }
  return user;
}

// ─── POST /auth/send-otp ─────────────────────────────────────────────────────
// Sends real SMS OTP via Firebase Identity Toolkit (works for verified test numbers
// and real numbers once Play Integrity / billing is enabled in Firebase Console)
router.post('/send-otp', async (req, res) => {
  const { phone } = req.body; // e.g. +919625913455
  if (!phone) return res.status(400).json({ message: 'Phone number is required' });

  try {
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=${FIREBASE_API_KEY}`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber: phone,
        recaptchaToken: 'server-trusted', // Server-side calls bypass app reCAPTCHA
      }),
    });
    const data = await r.json();

    if (data.error) {
      return res.status(400).json({ message: data.error.message || 'Failed to send OTP' });
    }
    return res.json({ sessionInfo: data.sessionInfo, message: 'OTP sent successfully' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error sending OTP', error: err.message });
  }
});

// ─── POST /auth/verify-otp ────────────────────────────────────────────────────
router.post('/verify-otp', async (req, res) => {
  const { phone, sessionInfo, otp } = req.body;
  if (!sessionInfo || !otp) {
    return res.status(400).json({ message: 'sessionInfo and otp are required' });
  }

  try {
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key=${FIREBASE_API_KEY}`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionInfo, code: otp }),
    });
    const data = await r.json();

    if (data.error) {
      return res.status(400).json({ message: data.error.message || 'Invalid OTP' });
    }

    const user = findOrCreateUserByPhone(phone || data.phoneNumber);
    const token = signToken(user);
    return res.json({ token, user });
  } catch (err) {
    return res.status(500).json({ message: 'Server error verifying OTP', error: err.message });
  }
});

// ─── POST /auth/google ────────────────────────────────────────────────────────
// Body: { name, email, photo }  (already verified client-side via Google OAuth)
router.post('/google', (req, res) => {
  const { name, email, photo } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  const user = findOrCreateUserByEmail({ email, name, photo });
  const token = signToken(user);
  res.json({ token, user });
});

// ─── GET /user/profile ────────────────────────────────────────────────────────
router.get('/profile', authMiddleware, (req, res) => {
  const user = db.users.findById(req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

// ─── PUT /user/profile ────────────────────────────────────────────────────────
router.put('/profile', authMiddleware, (req, res) => {
  const { name, email, pan, city } = req.body;
  const user = db.users.update(req.user.id, { name, email, pan, city });
  res.json(user);
});

// ─── POST /user/push-token ────────────────────────────────────────────────────
router.post('/push-token', authMiddleware, (req, res) => {
  const { expoPushToken } = req.body;
  if (!expoPushToken) return res.status(400).json({ message: 'expoPushToken is required' });
  const user = db.users.update(req.user.id, { expo_push_token: expoPushToken });
  res.json({ message: 'Push token registered', user });
});

module.exports = router;
