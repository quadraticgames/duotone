const imageInput = document.getElementById('imageInput');
const color1Input = document.getElementById('color1');
const color2Input = document.getElementById('color2');
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const swapButton = document.getElementById('swapButton');
const downloadButton = document.getElementById('downloadButton');
const fullscreenButton = document.getElementById('fullscreenButton');
const presetGrid = document.getElementById('presetGrid');
const stage = document.getElementById('stage');
const loader = document.getElementById('loader');
const credit = document.getElementById('credit');
const hex1 = document.getElementById('hex1');
const hex2 = document.getElementById('hex2');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });

let image = new Image();
image.crossOrigin = "anonymous"; // Allow CORS for Unsplash images
let imageLoaded = false;

// Curated duotone pairs: [shadows, highlights]
const PRESETS = [
    ['#212121', '#ffa406'],
    ['#6736dd', '#10c5f8'],
    ['#0f2c5c', '#ff6f91'],
    ['#00393a', '#b5f44a'],
    ['#3d0b37', '#ffcf56'],
    ['#1b1b3a', '#f72585'],
    ['#14213d', '#e5e5e5'],
    ['#7b1e1e', '#ffd6a5'],
];

// Render the preset swatches
PRESETS.forEach(([a, b]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'preset';
    btn.title = `${a} / ${b}`;
    btn.style.background = `linear-gradient(90deg, ${a} 50%, ${b} 50%)`;
    btn.addEventListener('click', () => setColors(a, b));
    presetGrid.appendChild(btn);
});

// Function to draw the image on the canvas (used for preview)
function drawImage() {
    const bounds = stage.getBoundingClientRect();
    const maxWidth = Math.min(1600, bounds.width - 56);
    const isStacked = window.matchMedia('(max-width: 860px)').matches;
    const maxHeight = (isStacked ? window.innerHeight * 0.65 : bounds.height) - 56;
    const widthScale = image.width > maxWidth ? maxWidth / image.width : 1;
    const heightScale = image.height > maxHeight ? maxHeight / image.height : 1;
    const scale = Math.min(widthScale, heightScale);

    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);

    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
}

// Map pixel luminance onto the gradient between the two colors
function duotonePixels(data, color1, color2) {
    for (let i = 0; i < data.length; i += 4) {
        const t = (0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2]) / 255;
        data[i] = color1.r + (color2.r - color1.r) * t;
        data[i + 1] = color1.g + (color2.g - color1.g) * t;
        data[i + 2] = color1.b + (color2.b - color1.b) * t;
    }
}

// Function to apply the duotone effect
function applyDuotone() {
    if (!imageLoaded) return;

    // Draw the image first to ensure it displays correctly
    drawImage();

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    duotonePixels(imageData.data, hexToRgb(color1Input.value), hexToRgb(color2Input.value));
    ctx.putImageData(imageData, 0, 0);
}

// Throttle live re-renders to one per animation frame
let renderQueued = false;
function scheduleRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
        renderQueued = false;
        applyDuotone();
    });
}

// Sync CSS variables, hex labels, and active preset with the pickers
function syncUI() {
    const c1 = color1Input.value;
    const c2 = color2Input.value;
    document.documentElement.style.setProperty('--c1', c1);
    document.documentElement.style.setProperty('--c2', c2);
    hex1.textContent = c1;
    hex2.textContent = c2;
    hex1.classList.toggle('is-dark', isLight(c1));
    hex2.classList.toggle('is-dark', isLight(c2));

    [...presetGrid.children].forEach((btn, i) => {
        const [a, b] = PRESETS[i];
        btn.classList.toggle('is-active', a === c1 && b === c2);
    });
}

function setColors(c1, c2) {
    color1Input.value = c1;
    color2Input.value = c2;
    syncUI();
    scheduleRender();
}

[color1Input, color2Input].forEach(input => {
    input.addEventListener('input', () => { syncUI(); scheduleRender(); });
});

swapButton.addEventListener('click', () => setColors(color2Input.value, color1Input.value));

function setLoading(isLoading) {
    loader.hidden = !isLoading;
}

function setCredit(html) {
    credit.innerHTML = html || '';
    credit.hidden = !html;
}

// Handle file upload and load the image onto the canvas
imageInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            imageLoaded = false; // Reset the loaded flag
            setCredit('');
            setLoading(true);
            image.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    imageInput.value = ''; // Allow re-uploading the same file
});

// Handle Unsplash search to load a random image based on the search term
async function fetchUnsplashImage(queryOverride) {
    const query = (queryOverride ?? searchInput.value).trim();
    if (!query) return;

    setLoading(true);
    try {
        const response = await fetch(`/.netlify/functions/fetchUnsplash?query=${encodeURIComponent(query)}`);
        const data = await response.json();
        if (data && data.urls && data.urls.regular) {
            imageLoaded = false;
            image.src = data.urls.regular;
            if (data.user) {
                const ref = '?utm_source=hue_two&utm_medium=referral';
                setCredit(`Photo by <a href="${data.user.links.html}${ref}" target="_blank" rel="noopener">${escapeHtml(data.user.name)}</a> on <a href="https://unsplash.com/${ref}" target="_blank" rel="noopener">Unsplash</a>`);
            }
        } else {
            setLoading(false);
            const msg = !response.ok
                ? `Search failed (${response.status}): ${data?.error || (data?.errors || []).join(', ') || 'Unknown error'}`
                : "No image found for the specified query.";
            console.error('Unsplash search error:', response.status, data);
            if (!queryOverride) alert(msg);
        }
    } catch (error) {
        setLoading(false);
        if (!queryOverride) alert("Failed to fetch image.");
    }
}

searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    fetchUnsplashImage();
});

// Set imageLoaded to true only after the image is fully loaded
image.onload = () => {
    imageLoaded = true;
    setLoading(false);
    stage.classList.add('has-image');
    downloadButton.disabled = false;
    applyDuotone(); // Preview is live, so apply immediately
};

image.onerror = () => {
    setLoading(false);
    alert("Couldn't load that image.");
};

// Keep the preview fitted to the stage
window.addEventListener('resize', scheduleRender);

// Helper function to convert hex color to RGB
function hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255,
    };
}

// Perceived brightness check so hex labels stay readable on the swatch
function isLight(hex) {
    const { r, g, b } = hexToRgb(hex);
    return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Download the duotone image as PNG at full resolution (capped at 4000px)
downloadButton.addEventListener('click', () => {
    if (!imageLoaded) return;

    const scale = Math.min(1, 4000 / Math.max(image.naturalWidth, image.naturalHeight));
    const out = document.createElement('canvas');
    out.width = Math.round(image.naturalWidth * scale);
    out.height = Math.round(image.naturalHeight * scale);
    const octx = out.getContext('2d');
    octx.drawImage(image, 0, 0, out.width, out.height);
    const imageData = octx.getImageData(0, 0, out.width, out.height);
    duotonePixels(imageData.data, hexToRgb(color1Input.value), hexToRgb(color2Input.value));
    octx.putImageData(imageData, 0, 0);

    const link = document.createElement('a');
    link.download = 'duotone-image.png';
    link.href = out.toDataURL();
    link.click();
});

// Fullscreen toggle (mimics F11 for the whole browser/app)
function isFullscreen() {
    return Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
    );
}

function updateFullscreenIcon() {
    if (!fullscreenButton) return;
    const icon = fullscreenButton.querySelector('i');
    if (!icon) return;
    const isFull = isFullscreen();
    icon.className = isFull ? 'fas fa-compress' : 'fas fa-expand';
    fullscreenButton.title = isFull ? 'Exit Fullscreen' : 'Fullscreen';
    fullscreenButton.setAttribute('aria-label', fullscreenButton.title);
}

if (fullscreenButton) {
    fullscreenButton.addEventListener('click', async () => {
        try {
            if (!isFullscreen()) {
                const elem = document.documentElement;
                if (elem.requestFullscreen) {
                    await elem.requestFullscreen();
                } else if (elem.webkitRequestFullscreen) {
                    await elem.webkitRequestFullscreen();
                } else if (elem.msRequestFullscreen) {
                    await elem.msRequestFullscreen();
                }
            } else {
                if (document.exitFullscreen) {
                    await document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    await document.webkitExitFullscreen();
                } else if (document.msExitFullscreen) {
                    await document.msExitFullscreen();
                }
            }
        } catch (err) {
            console.warn('Fullscreen request failed:', err);
        }
    });

    ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(evt => {
        document.addEventListener(evt, () => {
            updateFullscreenIcon();
            setTimeout(scheduleRender, 60);
        });
    });
}

// Initial state
downloadButton.disabled = true;
syncUI();
