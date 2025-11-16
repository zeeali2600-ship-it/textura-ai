// Textura AI frontend main.js (v2.2 with Download)
// Backend: Render POST /api/generate-image (Ideogram)
// IMPORTANT: NEVER expose API keys here.

// ====== CONFIG ======
const API_URL = 'https://textura-api.onrender.com/api/generate-image';
const DEFAULT_MODEL_ID = '';           // Not needed for Ideogram backend; leave empty
const DEFAULT_ASPECT_RATIO = '1:1';
const REQUEST_TIMEOUT_MS = 60000;

console.log('Main.js v2.2 loaded');

// ====== DOM ======
const TRIALS_KEY = 'textura_trials_left';
const preview = document.getElementById('preview');
const trialsEl = document.getElementById('trials-left');
const genBtn = document.getElementById('generate');
const subBtn = document.getElementById('subscribe');
const downloadBtn = document.getElementById('download');
const promptEl = document.getElementById('prompt');

// ====== STATE ======
let trials = Number(localStorage.getItem(TRIALS_KEY));
if (!Number.isFinite(trials) || trials <= 0) trials = 3;
let currentImageUrl = '';
updateTrials();
setDownloadEnabled(false);

// ====== EVENTS ======
genBtn.addEventListener('click', onGenerate);
subBtn.addEventListener('click', () => {
  alert('Subscribe flow Windows Store me baad me add hoga (demo).');
});
downloadBtn.addEventListener('click', onDownload);

// ====== HANDLERS ======
async function onGenerate() {
  const prompt = (promptEl.value || '').trim();
  if (!prompt) { alert('Please enter a prompt.'); return; }
  if (trials <= 0) { alert('Free trials khatam. Please Subscribe.'); return; }

  setLoading(true);
  clearPreview();

  try {
    const payload = buildPayload(prompt);
    const data = await postWithTimeout(API_URL, payload, REQUEST_TIMEOUT_MS);

    if (!data || !data.imageUrl) throw new Error('No imageUrl returned.');
    currentImageUrl = data.imageUrl;
    showImage(currentImageUrl);

    // consume trial on success
    trials -= 1;
    localStorage.setItem(TRIALS_KEY, String(trials));
    updateTrials();
    setDownloadEnabled(true);
  } catch (e) {
    console.error(e);
    showError('Error: ' + (e.message || e));
    alert('Kuch ghalt hogaya: ' + (e.message || e));
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
    // Try blob download (best UX). If CORS blocks, fallback to open in new tab.
    const resp = await fetch(currentImageUrl, { mode: 'cors' });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const blob = await resp.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = 'textura-' + Date.now() + '.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  } catch (e) {
    console.warn('Blob download failed, opening in new tab:', e);
    window.open(currentImageUrl, '_blank');
  } finally {
    downloadBtn.textContent = 'Download';
    downloadBtn.disabled = false;
  }
}

// ====== HELPERS ======
function buildPayload(prompt) {
  // For Ideogram backend, model_id is not required; keeping for future flexibility
  const model_id = DEFAULT_MODEL_ID || undefined;
  const aspect_ratio = DEFAULT_ASPECT_RATIO;
  const payload = { prompt, aspect_ratio };
  if (model_id) payload.model_id = model_id;
  return payload;
}

async function postWithTimeout(url, body, timeoutMs) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: controller.signal
  }).catch(err => {
    clearTimeout(id);
    throw new Error('Network fail: ' + err.message);
  });

  clearTimeout(id);

  if (!res.ok) {
    let detail = '';
    try {
      const jsonErr = await res.json();
      detail = jsonErr.error || JSON.stringify(jsonErr).slice(0, 150);
    } catch {
      detail = res.status + ' ' + res.statusText;
    }
    throw new Error('API error: ' + detail);
  }

  return res.json().catch(() => {
    throw new Error('Bad JSON response');
  });
}

function updateTrials() {
  if (trialsEl) trialsEl.textContent = String(trials);
}

function setLoading(isLoading) {
  genBtn.disabled = isLoading;
  genBtn.textContent = isLoading ? 'Generating…' : 'Generate Image';
  // Optional: prevent download click during generation
  if (isLoading) setDownloadEnabled(false);
  else if (currentImageUrl) setDownloadEnabled(true);
}

function setDownloadEnabled(enabled) {
  if (!downloadBtn) return;
  downloadBtn.disabled = !enabled;
  downloadBtn.textContent = enabled ? 'Download' : 'Download';
}

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

// Global unhandled promise catcher
window.addEventListener('unhandledrejection', (ev) => {
  console.error('Unhandled promise rejection:', ev.reason);
  showError('Unhandled error: ' + (ev.reason?.message || ev.reason));
});
