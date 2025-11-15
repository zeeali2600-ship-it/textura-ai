// Textura AI frontend main.js
// Backend integrated with Render service (POST /api/generate-image)
// IMPORTANT: API key stays ONLY on server (Render env), never here.

// ====== CONFIG ======
const API_URL = 'https://textura-api.onrender.com/api/generate-image'; // Replace only if your Render URL different
const DEFAULT_MODEL_ID = 'imagen-4.0-fast-generate';
const DEFAULT_ASPECT_RATIO = '1:1';

// ====== DOM REFERENCES ======
const TRIALS_KEY = 'textura_trials_left';
const preview = document.getElementById('preview');
const trialsEl = document.getElementById('trials-left');
const genBtn = document.getElementById('generate');
const subBtn = document.getElementById('subscribe');
const promptEl = document.getElementById('prompt');

// (Optional) If you later add dropdowns:
// const modelSelect = document.getElementById('model');        // e.g. <select id="model">
// const ratioSelect = document.getElementById('aspect-ratio'); // e.g. <select id="aspect-ratio">

// ====== STATE ======
let trials = Number(localStorage.getItem(TRIALS_KEY));
if (!Number.isFinite(trials) || trials <= 0) trials = 3;
updateTrials();

// ====== EVENT HANDLERS ======
genBtn.addEventListener('click', async () => {
  const prompt = (promptEl.value || '').trim();
  if (!prompt) { alert('Please enter a prompt.'); return; }

  if (trials <= 0) {
    alert('Free trials khatam. Please Subscribe.');
    return;
  }

  setLoading(true);
  try {
    // Build request payload (model/aspect_ratio future dropdowns se hasil ho sakte hain)
    const payload = {
      prompt,
      model_id: DEFAULT_MODEL_ID,        // replace if user chooses different
      aspect_ratio: DEFAULT_ASPECT_RATIO // replace if user chooses different
    };

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      // Try to read error details
      let detail = '';
      try {
        const errData = await res.json();
        detail = errData.error || JSON.stringify(errData).slice(0, 120);
      } catch {
        detail = res.status + ' ' + res.statusText;
      }
      throw new Error('API error: ' + detail);
    }

    const data = await res.json();
    const imgUrl = data.imageUrl;
    if (!imgUrl) throw new Error('No imageUrl returned from server');

    showImage(imgUrl);

    // consume trial
    trials -= 1;
    localStorage.setItem(TRIALS_KEY, String(trials));
    updateTrials();
  } catch (e) {
    console.error(e);
    alert('Kuch ghalt hogaya: ' + (e.message || e));
  } finally {
    setLoading(false);
  }
});

subBtn.addEventListener('click', () => {
  alert('Subscribe flow Windows Store me baad me add hoga (demo).');
});

// ====== UI HELPERS ======
function updateTrials() {
  if (trialsEl) trialsEl.textContent = String(trials);
}

function setLoading(isLoading) {
  genBtn.disabled = isLoading;
  genBtn.textContent = isLoading ? 'Generating…' : 'Generate Image';
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

// ====== (Optional) GLOBAL ERROR CATCH FOR UNHANDLED PROMISES ======
window.addEventListener('unhandledrejection', (ev) => {
  console.error('Unhandled promise rejection:', ev.reason);
});

// ====== END ======
