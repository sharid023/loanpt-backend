const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, unique);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  try {
    const id = uuidv4();
    const documentType = req.body.document_type || 'OTHER';
    await db.documents.create({ id, user_id: req.user.id, document_type: documentType, file_name: req.file.originalname, file_path: req.file.filename });
    res.status(201).json({ message: 'Document uploaded successfully', document: { id, documentType, fileName: req.file.originalname } });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/my-documents', authMiddleware, async (req, res) => {
  try {
    const docs = await db.documents.findByUser(req.user.id);
    res.json({ documents: docs });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
