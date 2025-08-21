// public/app.js (static/GitHub-Pages-friendly)
// - Loads posts from POSTS_JSON_PATH (read-only).
// - Merges user-created posts stored in localStorage (visible only locally).
// - Supports image uploads (saved locally as data: URLs).
// - Keeps theme toggle, search, tags, pagination, lightbox.

const POSTS_JSON_PATH = 'data/posts.json'; // <-- EDIT THIS if your posts.json is at root use 'posts.json'
const POSTS_PER_PAGE = 6;

const state = {
  posts: [],
  filtered: [],
  shown: 0,
  theme: localStorage.getItem('glow_theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme:light)').matches ? 'light' : 'dark')
};

// Dom refs
const postsGrid = document.getElementById('postsGrid');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const searchInput = document.getElementById('searchInput');
const tagFilter = document.getElementById('tagFilter');
const tagList = document.getElementById('tagList');
const newPostBtn = document.getElementById('newPostBtn');
const newPostModal = document.getElementById('newPostModal');
const modalClose = document.getElementById('modalClose');
const newPostForm = document.getElementById('newPostForm');
const cancelPost = document.getElementById('cancelPost');
const themeToggle = document.getElementById('themeToggle');
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxClose = document.getElementById('lightboxClose');
const lightboxCaption = document.getElementById('lightboxCaption');
const brandTitle = document.getElementById('brandTitle'); // if you added this earlier

/* ---------------- THEME ---------------- */
function applyTheme() {
  if (state.theme === 'light') {
    document.documentElement.classList.add('light');
    if (brandTitle) brandTitle.textContent = 'Solar Blog';
    themeToggle.textContent = '🌙';
    document.title = 'Solar Blog';
  } else {
    document.documentElement.classList.remove('light');
    if (brandTitle) brandTitle.textContent = 'Lunar Blog';
    themeToggle.textContent = '☀️';
    document.title = 'Lunar Blog';
  }
  localStorage.setItem('glow_theme', state.theme);
}
applyTheme();
themeToggle.addEventListener('click', () => {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  applyTheme();
});

/* ---------------- LOAD POSTS (static) ---------------- */
async function loadPosts() {
  // load static posts JSON from repo
  let disk = [];
  try {
    const r = await fetch(POSTS_JSON_PATH, { cache: 'no-store' });
    if (r.ok) disk = await r.json();
  } catch (e) {
    console.warn('Could not load posts.json:', e);
    disk = [];
  }

  // load local posts stored in browser
  const local = JSON.parse(localStorage.getItem('glow_local_posts') || '[]');

  // combine: disk posts first (older), then local posts on top
  state.posts = Array.isArray(disk) ? [...disk, ...local] : [...local];
  sortPosts();
  state.filtered = state.posts.slice();
  populateTagFilter();
  postsGrid.innerHTML = '';
  state.shown = 0;
  renderNext();
}

function sortPosts() {
  state.posts.sort((a,b) => new Date(b.date) - new Date(a.date));
}

/* ---------------- RENDER / PAGINATION ---------------- */
function renderNext(n = POSTS_PER_PAGE) {
  const start = state.shown;
  const end = Math.min(state.filtered.length, start + n);
  for (let i = start; i < end; i++) createPostCard(state.filtered[i], i);
  state.shown = end;
  loadMoreBtn.style.display = state.shown < state.filtered.length ? 'inline-block' : 'none';
}

function createPostCard(post, idx) {
  const art = document.createElement('article');
  art.className = 'post card post-animate';
  art.style.animationDelay = `${(idx % POSTS_PER_PAGE) * 40}ms`;

  const titleHtml = `<h2>${escapeHtml(post.title)}</h2>`;
  const metaHtml = `<div class="post-meta">By ${escapeHtml(post.author)} — ${formatDate(post.date)}</div>`;
  const contentHtml = `<div class="post-content">${nl2br(escapeHtml(post.content || ''))}</div>`;
  art.innerHTML = titleHtml + metaHtml + contentHtml;

  if (post.image) {
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.alt = post.title || 'post image';
    img.src = post.image;
    img.addEventListener('click', () => openLightbox(post.image, post.title));
    art.appendChild(img);
  }

  const tagsDiv = document.createElement('div');
  tagsDiv.className = 'tags-inline';
  const tagsHtml = (post.tags || []).map(t => `<span class="tag" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</span>`).join(' ');
  tagsDiv.innerHTML = tagsHtml;
  tagsDiv.querySelectorAll('.tag').forEach(t => {
    t.addEventListener('click', () => {
      applyTagFilter(t.getAttribute('data-tag'));
    });
  });
  // give some vertical spacing if needed (in case css didn't)
  tagsDiv.style.marginTop = '0.8rem';
  art.appendChild(tagsDiv);

  postsGrid.appendChild(art);
}

/* ---------------- HELPERS ---------------- */
function escapeHtml(s){ if (s==null) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
function nl2br(s){ return String(s || '').replace(/\n/g, '<br>'); }
function formatDate(d){ try{ return new Date(d).toLocaleString(); }catch(e){ return d; } }

/* ---------------- FILTERS / TAGS ---------------- */
searchInput.addEventListener('input', () => applyFilters());
tagFilter.addEventListener('change', () => applyFilters());

function applyFilters() {
  const q = (searchInput.value || '').trim().toLowerCase();
  const tag = (tagFilter.value || '').trim().toLowerCase();
  state.filtered = state.posts.filter(p => {
    const hay = `${p.title} ${p.author} ${p.content} ${(p.tags || []).join(' ')}`.toLowerCase();
    const matchesQ = q ? hay.includes(q) : true;
    const matchesTag = tag ? (p.tags || []).map(t=>t.toLowerCase()).includes(tag) : true;
    return matchesQ && matchesTag;
  });
  postsGrid.innerHTML = '';
  state.shown = 0;
  renderNext();
}

function populateTagFilter() {
  const allTags = new Set();
  state.posts.forEach(p => (p.tags || []).forEach(t => allTags.add(t)));
  tagFilter.innerHTML = '<option value="">All tags</option>';
  allTags.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    tagFilter.appendChild(opt);
  });

  tagList.innerHTML = '';
  allTags.forEach(t => {
    const but = document.createElement('button');
    but.className = 'tag';
    but.textContent = t;
    but.addEventListener('click', () => applyTagFilter(t));
    tagList.appendChild(but);
  });
}

function applyTagFilter(tag) {
  tagFilter.value = tag;
  searchInput.value = '';
  applyFilters();
  postsGrid.scrollIntoView({behavior:'smooth'});
}

/* ---------------- LOAD MORE ---------------- */
loadMoreBtn.addEventListener('click', () => renderNext());

/* ---------------- LIGHTBOX ---------------- */
function openLightbox(src, caption) {
  lightboxImg.src = src;
  lightboxImg.alt = caption || '';
  lightboxCaption.textContent = caption || '';
  lightbox.classList.add('show');
  lightbox.setAttribute('aria-hidden', 'false');
}
function closeLightbox() {
  lightbox.classList.remove('show');
  lightbox.setAttribute('aria-hidden', 'true');
  lightboxImg.src = '';
}
lightboxClose.addEventListener('click', closeLightbox);
lightbox.addEventListener('click', (e) => { if (e.target === lightbox || e.target === lightboxImg) closeLightbox(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeLightbox(); closeModal(); } });

/* ---------------- NEW POST (local only) ---------------- */
newPostBtn.addEventListener('click', openModal);
modalClose.addEventListener('click', closeModal);
cancelPost.addEventListener('click', closeModal);

function openModal() {
  newPostModal.classList.add('show');
  newPostModal.setAttribute('aria-hidden','false');
}
function closeModal() {
  newPostModal.classList.remove('show');
  newPostModal.setAttribute('aria-hidden','true');
  newPostForm.reset();
}

function readFileAsDataURL(file){
  return new Promise((resolve,reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject(new Error('File read error'));
    fr.readAsDataURL(file);
  });
}

newPostForm.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const fm = new FormData(newPostForm);

  let imageVal = null;
  const fileInput = newPostForm.querySelector('input[name="imageFile"]');
  const file = fileInput && fileInput.files && fileInput.files[0];
  if (file && file.size && file.type) {
    try {
      imageVal = await readFileAsDataURL(file); // stored locally as data URL
    } catch (e) {
      alert('Failed to read image file.');
      return;
    }
  } else {
    const url = (fm.get('imageURL') || '').trim();
    if (url) imageVal = url;
  }

  const post = {
    id: Date.now(),
    title: (fm.get('title') || '').trim() || 'Untitled',
    author: (fm.get('author') || 'Anonymous').trim(),
    tags: (fm.get('tags') || '').split(',').map(s => s.trim()).filter(Boolean),
    content: (fm.get('content') || '').trim(),
    image: imageVal || null,
    date: new Date().toISOString()
  };

  // save to localStorage
  const existing = JSON.parse(localStorage.getItem('glow_local_posts') || '[]');
  existing.unshift(post);
  localStorage.setItem('glow_local_posts', JSON.stringify(existing));

  // merge into current in-memory posts and re-render (makes it visible immediately)
  state.posts.unshift(post);
  populateTagFilter();
  applyFilters();
  closeModal();
  alert('Post added locally — visible only in your browser. To make it permanent, add to posts.json in the repo.');
});

/* ---------------- INIT ---------------- */
loadPosts();
