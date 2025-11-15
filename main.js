// Simple PWA UI logic (no real API yet) — backend wire-up next steps.
const TRIALS_KEY = 'textura_trials_left';
const preview = document.getElementById('preview');
const trialsEl = document.getElementById('trials-left');
const genBtn = document.getElementById('generate');
const subBtn = document.getElementById('subscribe');
const promptEl = document.getElementById('prompt');

let trials = Number(localStorage.getItem(TRIALS_KEY));
if (!Number.isFinite(trials) || trials <= 0) trials = 3;
updateTrials();

genBtn.addEventListener('click', async () => {
  const prompt = (promptEl.value || '').trim();
  if (!prompt) { alert('Please enter a prompt.'); return; }

  if (trials <= 0) {
    alert('Free trials khatam. Please Subscribe.');
    return;
  }

  setLoading(true);
  try {
    // TODO: yahan real backend call ayega: POST /api/generate-image
    // For now: demo placeholder image
    const imgUrl = `https://picsum.photos/seed/${encodeURIComponent(prompt)}-${Date.now()}/768/512`;
    await delay(900);
    showImage(imgUrl);

    // consume trial
    trials -= 1;
    localStorage.setItem(TRIALS_KEY, String(trials));
    updateTrials();
  } catch (e) {
    console.error(e);
    alert('Kuch ghalt hogaya, dobara koshish karein.');
  } finally {
    setLoading(false);
  }
});

subBtn.addEventListener('click', () => {
  // Windows package me yahan Store purchase UI call hoga (later step).
  alert('Subscribe flow Windows Store ke andar enable hoga (baad me). Abhi demo UI hai.');
});

function updateTrials(){ trialsEl.textContent = String(trials); }
function delay(ms){ return new Promise(r => setTimeout(r, ms)); }

function setLoading(isLoading){
  genBtn.disabled = isLoading;
  genBtn.textContent = isLoading ? 'Generating…' : 'Generate Image';
}

function showImage(url){
  preview.innerHTML = '';
  const img = document.createElement('img');
  img.className = 'generated';
  img.alt = 'Generated image';
  img.src = url;
  preview.appendChild(img);
}
