const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const httpError = require('../utils/httpError');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const ALLOWED = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ALLOWED[file.mimetype]}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (req, file, cb) => {
    if (!ALLOWED[file.mimetype]) return cb(httpError(400, 'Only JPG, PNG, WEBP or GIF images are allowed'));
    cb(null, true);
  },
});

exports.uploadImage = upload.single('image');
exports.UPLOAD_DIR = UPLOAD_DIR;
