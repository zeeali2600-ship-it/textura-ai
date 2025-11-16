// Textura AI frontend main.js (v2.10) — native subscription click debug + stable bridge

const API_BASE = 'https://textura-api.onrender.com';
const API_URL = API_BASE + '/api/generate-image';
const DOWNLOAD_URL = API_BASE + '/api/download';
const DEFAULT_ASPECT_RATIO = '1:1';
const REQUEST_TIMEOUT_MS = 60000;

console.log('Main.js v2.10 (subscription bridge) loaded');
document.body && (document.body.dataset.jsv = 'v2.10');

const TRIALS_KEY = 'textura_trials_left';
let trials = Number(localStorage.getItem(TRIALS_KEY));
if (!Number.isFinite(trials) || trials <= 0) trials = 3;

let currentImageUrl = '';

const preview = document.getElementById('preview');
const trialsEl = document.getElementById('trials-left');
const genBtn = document.getElementById('generate');
const subBtn = document.getElementById('subscribe');
const downloadBtn = document.getElementById('download');
const promptEl = document.getElementById('prompt');
const ratioSelect = document.getElementById('aspect-ratio');

// Modal elements (web-only)
const subModal = document.getElementById('subModal');
const subClose = document.getElementById('subClose');

// ========= Native Windows WebView2 subscription bridge =========
const isNative = !!(window.chrome && window.chrome.webview);
let subStatus = 'INACTIVE'; // ACTIVE / INACTIVE

if (isNative) {
  try { window.chrome.webview.postMessage('CHECK_LICENSE'); } catch {}

  window.chrome.webview.addEventListener('message', (ev) => {
    const msg = ev.data;
    if (typeof msg === 'string' && msg.startsWith('SUB_STATUS:')) {
      subStatus = msg.split(':')[1];
      updateSubscribeUI();
    }
  });
}

function updateSubscribeUI() {
  if (!subBtn) return;
  if (subStatus === 'ACTIVE') {
    subBtn.textContent = 'Pro User';
    subBtn.disabled = true;
    const wrap = trialsEl?.parentElement;
    if (wrap) wrap.style.display = 'none';
    if (subModal) subModal.style.display = 'none';
  } else {
    subBtn.textContent = 'Subscribe';
    subBtn.disabled = false;
  }
}

// Attach handlers
(function attachHandlers() {
  updateTrials();
  setDownloadEnabled(false);
  updateSubscribeUI();

  if (genBtn) genBtn.addEventListener('click', onGenerate);
  if (downloadBtn) downloadBtn.addEventListener('click', onDownload);

  if (subBtn) {
    subBtn.setAttribute('type', 'button');
    subBtn.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();

      // DEBUG: show what environment we are in
      alert('Native=' + (!!(window.chrome&&window.chrome.webview)) + ' | status=' + subStatus);

      if (isNative) {
        if (subStatus === 'ACTIVE') return;
        try {
          console.log('Posting REQUEST_SUBSCRIBE to native');
          window.chrome.webview.postMessage('REQUEST_SUBSCRIBE');
        } catch (err) {
          console.error('postMessage failed', err);
        }
        return;
      }

      // Browser: open modal
      openSubscribeModal();
    });
  }

  subClose?.addEventListener('click', closeSubscribeModal);
  subModal?.addEventListener('click', (e) => { if (e.target === subModal) closeSubscribeModal(); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isModalOpen()) closeSubscribeModal(); });
})();

// ------------- UI helpers -------------
function isModalOpen() { return subModal && subModal.style.display === 'flex'; }
function openSubscribeModal() {
  if (isNative && subStatus === 'ACTIVE') return;
  if (subModal) { subModal.style.display = 'flex'; subModal.setAttribute('aria-hidden', 'false'); }
}
function closeSubscribeModal() { if (subModal) { subModal.style.display = 'none'; subModal.setAttribute('aria-hidden', 'true'); } }
function updateTrials() { trialsEl && (trialsEl.textContent = String(trials)); }
function setLoading(isLoading) {
  if (!genBtn) return;
  genBtn.disabled = isLoading;
  genBtn.textContent = isLoading ? 'Generating…' : 'Generate Image';
  if (isLoading) setDownloadEnabled(false); else if (currentImageUrl) setDownloadEnabled(true);
}
function setDownloadEnabled(enabled) { if (!downloadBtn) return; downloadBtn.disabled = !enabled; downloadBtn.textContent = 'Download'; }
function clearPreview() {
  if (!preview) return;
  preview.innerHTML = `
    <div class="placeholder">
      <img src="icons/image-placeholder.svg" alt="" />
      <p>Generating…</p>
    </div>
  `;
}
function showImage(url) {
  if (!preview) return;
  preview.innerHTML = '';
  const img = document.createElement('img');
  img.className = 'generated';
  img.alt = 'Generated image';
  img.src = url;
  img.loading = 'lazy';
  preview.appendChild(img);
}
function showError(msg) {
  if (!preview) return;
  const div = document.createElement('div');
  div.className = 'error-box';
  div.style.padding = '12px';
  div.style.color = '#b00020';
  div.style.background = '#ffecec';
  div.style.border = '1px solid #ffb3b3';
  div.style.borderRadius = '8px';
  div.textContent = msg;
  preview.innerHTML = '';
  preview.appendChild(div);
}

// ------------- Generate / Download -------------
async function onGenerate() {
  const prompt = (promptEl?.value || '').trim();
  if (!prompt) { alert('Please enter a prompt.'); return; }

  if (trials <= 0 && !(isNative && subStatus === 'ACTIVE')) { openSubscribeModal(); return; }

  setLoading(true);
  clearPreview();

  try {
    const ar = (ratioSelect?.value || DEFAULT_ASPECT_RATIO);
    const payload = { prompt, aspect_ratio: ar };

    const data = await postWithTimeout(API_URL, payload, REQUEST_TIMEOUT_MS);
    if (!data || !data.imageUrl) throw new Error('No imageUrl returned.');

    currentImageUrl = data.imageUrl;
    showImage(currentImageUrl);

    if (!(isNative && subStatus === 'ACTIVE')) {
      trials -= 1;
      localStorage.setItem(TRIALS_KEY, String(trials));
      updateTrials();
      if (trials <= 0) setTimeout(openSubscribeModal, 400);
    }

    setDownloadEnabled(true);
  } catch (e) {
    console.error(e);
    if (String(e.message).toLowerCase().includes('rate limit')) {
      showError('Limit 5/hour ho gayi. Thoda wait karo.');
      alert('Limit 5/hour ho gayi. 1 ghanta wait karo.');
    } else {
      showError('Error: ' + (e.message || e));
      alert('Kuch ghalt hogaya: ' + (e.message || e));
    }
    setDownloadEnabled(false);
  } finally {
    setLoading(false);
  }
}

async function onDownload() {
  if (!currentImageUrl) return;
  downloadBtn.disabled = true;
  downloadBtn.textContent = 'Downloading…';
  try {
    const filename = makeFilename(promptEl?.value);
    const link = `${DOWNLOAD_URL}?url=${encodeURIComponent(currentImageUrl)}&filename=${encodeURIComponent(filename)}`;
    window.location.href = link;
  } finally {
    setTimeout(() => { downloadBtn.textContent = 'Download'; downloadBtn.disabled = false; }, 1200);
  }
}

function makeFilename(prompt) {
  const slug = String(prompt || 'textura').toLowerCase().replace(/[^a-z0-9\- _]+/g, '').trim().replace(/\s+/g, '-').slice(0, 40) || 'textura';
  return `${slug}-${Date.now()}.png`;
}

async function postWithTimeout(url, body, timeoutMs) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  const headers = { 'Content-Type': 'application/json' };
  if (isNative && subStatus === 'ACTIVE') headers['X-Sub'] = '1';

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal })
    .catch(err => { clearTimeout(id); throw new Error('Network fail: ' + err.message); });

  clearTimeout(id);

  if (res.status === 429) {
    let msg = 'Rate limit exceeded (5/hour)'; try { const j = await res.json(); if (j && j.error) msg = j.error; } catch {}
    throw new Error(msg);
  }

  if (!res.ok) {
    let detail = ''; try { const jsonErr = await res.json(); detail = (jsonErr.error || res.statusText) + (jsonErr.detail ? ' — ' + jsonErr.detail : ''); }
    catch { detail = res.status + ' ' + res.statusText; }
    throw new Error('API error: ' + detail);
  }

  return res.json().catch(() => { throw new Error('Bad JSON response'); });
}

// Global error guard
window.addEventListener('unhandledrejection', (ev) => {
  console.error('Unhandled promise rejection:', ev.reason);
  showError('Unhandled error: ' + (ev.reason?.message || ev.reason));
});
