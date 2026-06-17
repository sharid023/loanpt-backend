const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'loanpt_dev_secret';

function signToken(user) {
  return jwt.sign(
    { id: user.id, phone: user.phone, email: user.email },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

module.exports = { signToken, authMiddleware, JWT_SECRET };
