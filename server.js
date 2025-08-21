const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(new Date().toISOString(), req.ip, req.method, req.url);
  next();
});

const PUBLIC = path.join(__dirname, 'public');
const UPLOADS = path.join(PUBLIC, 'uploads');
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'posts.json');

(async () => {
  try {
    if (!fsSync.existsSync(PUBLIC)) await fs.mkdir(PUBLIC, { recursive: true });
    if (!fsSync.existsSync(UPLOADS)) await fs.mkdir(UPLOADS, { recursive: true });
    if (!fsSync.existsSync(DATA_DIR)) await fs.mkdir(DATA_DIR, { recursive: true });
    if (!fsSync.existsSync(DATA_FILE)) await fs.writeFile(DATA_FILE, '[]', 'utf8');
  } catch (err) {
    console.error('Startup dir creation failed:', err);
    process.exit(1);
  }
})();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_.]/g, '');
    cb(null, Date.now() + '-' + safe);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 6 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|gif|webp|bmp)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type. Only images allowed.'));
  }
});

app.use(express.static(PUBLIC));

app.get('/api/posts', async (req, res) => {
  try {
    const txt = await fs.readFile(DATA_FILE, 'utf8');
    const posts = JSON.parse(txt || '[]');
    res.json(posts);
  } catch (err) {
    console.error('Read posts error:', err);
    res.status(500).json({ error: 'Failed to read posts' });
  }
});

app.post('/api/posts', upload.single('imageFile'), async (req, res, next) => {
  try {
    const { title, author, tags, content, imageURL } = req.body;
    if (!title || !author || !content) {
      return res.status(400).json({ error: 'title, author and content are required' });
    }

    let image = null;
    if (req.file) {
      image = '/uploads/' + req.file.filename;
    } else if (imageURL && String(imageURL).trim()) {
      image = String(imageURL).trim();
    }

    const post = {
      id: Date.now(),
      title: String(title),
      author: String(author),
      tags: tags ? String(tags).split(',').map(s => s.trim()).filter(Boolean) : [],
      content: String(content),
      image: image || null,
      date: new Date().toISOString()
    };

    let posts = [];
    try {
      const txt = await fs.readFile(DATA_FILE, 'utf8');
      posts = JSON.parse(txt || '[]');
      if (!Array.isArray(posts)) posts = [];
    } catch (e) {
      posts = [];
    }

    posts.unshift(post);
    await fs.writeFile(DATA_FILE, JSON.stringify(posts, null, 2), 'utf8');

    res.status(201).json({ success: true, post });
  } catch (err) {
    next(err);
  }
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err && (err.stack || err.message || err));
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large. Max size is 6 MB.' });
  }
  res.status(err && err.status ? err.status : 500).json({ error: err && err.message ? err.message : 'Server error' });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
