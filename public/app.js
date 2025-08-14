// public/app.js
const postsContainer = document.getElementById('posts');
const form = document.getElementById('new-post-form');

function nl2br(s){ return s.replace(/\n/g,'<br>'); }
function formatDate(d){ try{ return new Date(d).toLocaleString(); }catch(e){ return d; } }
function escapeHtml(unsafe){ return String(unsafe)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;'); }

async function fetchPosts(){
  try{
    const resp = await fetch('/api/posts', { cache: 'no-store' });
    if(!resp.ok) throw new Error('Failed to fetch posts: ' + resp.status);
    const data = await resp.json();
    return data;
  }catch(err){
    console.error(err);
    return [];
  }
}

function renderPosts(posts){
  postsContainer.innerHTML = '';
  if(!posts || posts.length === 0){
    postsContainer.innerHTML = '<div>No posts yet.</div>';
    return;
  }
  posts.sort((a,b)=> new Date(b.date) - new Date(a.date));
  for(const p of posts){
    const art = document.createElement('article');
    const titleHtml = `<h2>${escapeHtml(p.title)}</h2>`;
    const metaHtml = `<div class="post-meta">By ${escapeHtml(p.author)} — ${formatDate(p.date)}</div>`;
    const contentHtml = `<div class="content">${nl2br(escapeHtml(p.content))}</div>`;
    art.innerHTML = titleHtml + metaHtml + contentHtml;

    if(p.image){
      const img = document.createElement('img');
      img.alt = p.title || 'post image';
      img.src = p.image;
      art.appendChild(img);
    }

    const tagsDiv = document.createElement('div');
    tagsDiv.className = 'tags';
    tagsDiv.textContent = (p.tags || []).map(t => `#${t}`).join(' ');
    art.appendChild(tagsDiv);

    postsContainer.appendChild(art);
  }
}

async function init(){
  const posts = await fetchPosts();
  renderPosts(posts);
}

form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const formData = new FormData(form);

  const payload = new FormData();
  payload.append('title', formData.get('title') ? formData.get('title').trim() : '');
  payload.append('author', formData.get('author') ? formData.get('author').trim() : '');
  payload.append('tags', formData.get('tags') || '');
  payload.append('content', formData.get('content') ? formData.get('content').trim() : '');

  const fileInput = document.getElementById('imageFile');
  if (fileInput && fileInput.files && fileInput.files.length) {
    payload.append('imageFile', fileInput.files[0]);
  } else {
    payload.append('imageURL', (formData.get('imageURL') || '').trim());
  }

  try {
    const resp = await fetch('/api/posts', {
      method: 'POST',
      body: payload
    });

    // read text first for safer error reporting
    const text = await resp.text();
    let data;
    if (text && text.trim()) {
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        throw new Error('Server returned invalid JSON: ' + text);
      }
    } else {
      if (!resp.ok) throw new Error('Server returned status ' + resp.status + ' with empty body.');
    }

    if (!resp.ok) {
      const message = data && data.error ? data.error : ('Server error: ' + resp.status);
      throw new Error(message);
    }

    // success: refresh posts
    const posts = await fetchPosts();
    renderPosts(posts);
    form.reset();
    alert('Post published!');
  } catch (err) {
    console.error('Submit error:', err);
    alert('Failed to save post: ' + (err.message || err));
  }
});

init();
