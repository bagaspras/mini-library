import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(here, '../..');
const uploadDir = path.resolve(backendRoot, process.env.UPLOAD_DIR || 'uploads/covers');
fs.mkdirSync(uploadDir, { recursive: true });

const extensions = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const storage = multer.diskStorage({
  destination(_req, _file, callback) {
    callback(null, uploadDir);
  },
  filename(_req, file, callback) {
    callback(null, `${crypto.randomUUID()}${extensions[file.mimetype] || '.img'}`);
  },
});

const parser = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, callback) {
    if (!Object.hasOwn(extensions, file.mimetype)) {
      return callback(new Error('Format sampul harus JPG, PNG, atau WebP.'));
    }
    callback(null, true);
  },
});

export function uploadCover(req, res, next) {
  parser.single('cover')(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError) {
      const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({
        message: error.code === 'LIMIT_FILE_SIZE'
          ? 'Ukuran sampul maksimal 5 MB.'
          : 'Upload sampul tidak valid.',
      });
    }
    return res.status(400).json({ message: error.message || 'Upload sampul gagal.' });
  });
}
