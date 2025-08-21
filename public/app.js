const API_BASE = '';

const POSTS_PER_PAGE = 6;
const state = {
  posts: [],
  filtered: [],
  shown: 0,
  theme: localStorage.getItem('glow_theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme:light)').matches ? 'light' : 'dark')
};

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
const brandTitle = document.getElementById('brandTitle');

function applyTheme() {
  if (state.theme === 'light') {
    document.documentElement.classList.add('light');
    brandTitle.textContent = 'Solar Blog';
    themeToggle.textContent = '🌙';
    document.title = 'Solar Blog';
  } else {
    document.documentElement.classList.remove('light');
    brandTitle.textContent = 'Lunar Blog';
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

async function loadPosts() {
  try {
    const r = await fetch(API_BASE + '/api/posts', { cache: 'no-store' });
    if (!r.ok) throw new Error('Failed to fetch posts: ' + r.status);
    const posts = await r.json();
    state.posts = Array.isArray(posts) ? posts : [];
  } catch (e) {
    console.error('Could not load posts', e);
    state.posts = [];
  }
  sortPosts();
  state.filtered = state.posts.slice();
  populateTagFilter();
  postsGrid.innerHTML = '';
  state.shown = 0;
  renderNext();
}

function sortPosts() {
  state.posts.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function renderNext(n = POSTS_PER_PAGE) {
  const start = state.shown;
  const end = Math.min(state.filtered.length, start + n);
  for (let i = start; i < end; i++) {
    createPostCard(state.filtered[i], i);
  }
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
  tagsDiv.innerHTML = (post.tags || []).map(t => `<span class="tag" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</span>`).join(' ');
  tagsDiv.querySelectorAll('.tag').forEach(t => {
    t.addEventListener('click', () => {
      const tag = t.getAttribute('data-tag');
      applyTagFilter(tag);
    });
  });
  art.appendChild(tagsDiv);

  postsGrid.appendChild(art);
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
function nl2br(s){ return String(s || '').replace(/\n/g, '<br>'); }
function formatDate(d){ try{ return new Date(d).toLocaleString(); }catch(e){ return d; } }

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

loadMoreBtn.addEventListener('click', () => renderNext());

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
  try {
    const resp = await fetch(API_BASE + '/api/posts', {
      method: 'POST',
      body: fm
    });

    const text = await resp.text();
    let data;
    if (text && text.trim()) {
      try { data = JSON.parse(text); } catch (e) { throw new Error('Server returned invalid JSON: ' + text); }
    } else {
      if (!resp.ok) throw new Error('Server returned status ' + resp.status + ' with empty body.');
    }

    if (!resp.ok) {
      const message = data && data.error ? data.error : ('Server error: ' + resp.status);
      throw new Error(message);
    }

    await loadPosts();
    closeModal();
  } catch (err) {
    console.error('Submit error:', err);
    alert('Failed to publish: ' + (err.message || err));
  }
});

loadPosts();
