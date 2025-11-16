// Textura AI frontend main.js (v2.3.1) — Cost-saver sizes + forced TURBO

const API_BASE = 'https://textura-api.onrender.com';
const API_URL = API_BASE + '/api/generate-image';
const DOWNLOAD_URL = API_BASE + '/api/download';
const DEFAULT_ASPECT_RATIO = '1:1';
const REQUEST_TIMEOUT_MS = 60000;

console.log('Main.js v2.3.1 loaded');

const TRIALS_KEY = 'textura_trials_left';
const preview = document.getElementById('preview');
const trialsEl = document.getElementById('trials-left');
const genBtn = document.getElementById('generate');
const subBtn = document.getElementById('subscribe');
const downloadBtn = document.getElementById('download');
const promptEl = document.getElementById('prompt');
const ratioSelect = document.getElementById('aspect-ratio');
const sizeSelect = document.getElementById('size');

let trials = Number(localStorage.getItem(TRIALS_KEY));
if (!Number.isFinite(trials) || trials <= 0) trials = 3;
let currentImageUrl = '';
updateTrials();
setDownloadEnabled(false);

genBtn.addEventListener('click', onGenerate);
subBtn.addEventListener('click', () => {
  alert('Subscribe flow Windows Store me baad me add hoga (demo).');
});
downloadBtn.addEventListener('click', onDownload);

async function onGenerate() {
  const prompt = (promptEl.value || '').trim();
  if (!prompt) { alert('Please enter a prompt.'); return; }
  if (trials <= 0) { alert('Free trials khatam. Please Subscribe.'); return; }

  setLoading(true);
  clearPreview();

  try {
    const ar = (ratioSelect?.value || DEFAULT_ASPECT_RATIO);
    const base = Number(sizeSelect?.value || '1024');
    const resolution = computeResolution(ar, base);

    // Force cheapest speed
    const payload = { prompt, aspect_ratio: ar, resolution, speed: 'TURBO' };

    const data = await postWithTimeout(API_URL, payload, REQUEST_TIMEOUT_MS);
    if (!data || !data.imageUrl) throw new Error('No imageUrl returned.');

    currentImageUrl = data.imageUrl;
    showImage(currentImageUrl);

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
    const filename = makeFilename(promptEl.value);
    const link = `${DOWNLOAD_URL}?url=${encodeURIComponent(currentImageUrl)}&filename=${encodeURIComponent(filename)}`;
    window.location.href = link;
  } finally {
    setTimeout(() => {
      downloadBtn.textContent = 'Download';
      downloadBtn.disabled = false;
    }, 1200);
  }
}

function computeResolution(ar, base) {
  switch ((ar || '').replace(/\s/g, '')) {
    case '1:1': return `${base}x${base}`;
    case '16:9': return `${base}x${Math.round(base * 9 / 16)}`;
    case '9:16': return `${Math.round(base * 9 / 16)}x${base}`;
    case '3:2': return `${base}x${Math.round(base * 2 / 3)}`;
    case '2:3': return `${Math.round(base * 2 / 3)}x${base}`;
    default: return `${base}x${base}`;
  }
}

function makeFilename(prompt) {
  const slug = String(prompt || 'textura')
      .toLowerCase()
      .replace(/[^a-z0-9\- _]+/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 40) || 'textura';
  return `${slug}-${Date.now()}.png`;
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

window.addEventListener('unhandledrejection', (ev) => {
  console.error('Unhandled promise rejection:', ev.reason);
  showError('Unhandled error: ' + (ev.reason?.message || ev.reason));
});
