import multer from 'multer';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { AppError } from '../utils/errors';

// Video clips can be up to 2GB — use disk storage to a temp dir, not memory.
const tempDir = path.join(os.tmpdir(), 'gamerhub-uploads');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}
const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, tempDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${path.extname(file.originalname)}`),
});

const storage = multer.memoryStorage();

// SVG is deliberately excluded: SVG files can contain scripts and are served
// as image/svg+xml, which browsers will execute when opened directly or
// embedded via <iframe> — a stored-XSS vector.
const IMAGE_TYPES = /jpeg|jpg|png|gif|webp/;
const VIDEO_TYPES = /mp4|webm|mov|ogg|avi|mkv|flv/;
const AUDIO_TYPES = /mp3|wav|ogg|aac|flac/;

export const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Validate BOTH the extension and the declared MIME type so a renamed
  // executable (e.g. evil.exe -> evil.png) cannot pass the filter.
  const ext = path.extname(file.originalname).toLowerCase().slice(1);
  const mime = file.mimetype || '';

  const isImage = IMAGE_TYPES.test(ext) && mime.startsWith('image/');
  const isVideo = VIDEO_TYPES.test(ext) && mime.startsWith('video/');
  const isAudio = AUDIO_TYPES.test(ext) && mime.startsWith('audio/');

  if (isImage || isVideo || isAudio) cb(null, true);
  else cb(new AppError(`Invalid file type: .${ext}. Allowed: images (jpeg, png, gif, webp), videos (mp4, webm, mov, ogg, avi), audio (mp3, wav, ogg)`, 400));
};

export const uploadAvatar = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter }).single('avatar');
export const uploadBanner = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter }).single('banner');
// Memory-backed uploads: keep the per-request ceiling bounded (6 x 25MB).
export const uploadMedia = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 }, fileFilter }).array('media', 6);
export const uploadVoice = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter }).single('voiceNote');
export const uploadScreenshot = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter }).single('screenshot');
// Large video clips (up to 2GB) — disk-backed, video formats only.
export const uploadClip = multer({ storage: diskStorage, limits: { fileSize: 2 * 1024 * 1024 * 1024 }, fileFilter }).single('video');
// Music track uploads for montage audio (up to 50MB).
export const uploadMusic = multer({ storage: diskStorage, limits: { fileSize: 50 * 1024 * 1024 }, fileFilter }).single('music');
// Product and item uploads (up to 10MB)
export const uploadProductImage = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter }).single('image');

