const imageInput = document.getElementById('imageInput');
const color1Input = document.getElementById('color1');
const color2Input = document.getElementById('color2');
const searchButton = document.getElementById('searchButton');
const searchInput = document.getElementById('searchInput');
const applyButton = document.getElementById('applyButton');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const downloadButton = document.getElementById('downloadButton');

let image = new Image();
image.crossOrigin = "anonymous"; // Allow CORS for Unsplash images
let imageLoaded = false;

// Function to draw the image on the canvas (used for preview)
function drawImage() {
    const maxWidth = 1080;
    const maxHeight = window.innerHeight * 0.7; // Dynamically limit canvas height to 70% of the viewport
    const widthScale = image.width > maxWidth ? maxWidth / image.width : 1;
    const heightScale = image.height > maxHeight ? maxHeight / image.height : 1;
    const scale = Math.min(widthScale, heightScale);

    canvas.width = image.width * scale;
    canvas.height = image.height * scale;

    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
}

// Function to apply the duotone effect
function applyDuotone() {
    if (!imageLoaded) {
        alert("Please load an image first.");
        return;
    }

    // Draw the image first to ensure it displays correctly
    drawImage();

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const color1 = hexToRgb(color1Input.value);
    const color2 = hexToRgb(color2Input.value);

    for (let i = 0; i < data.length; i += 4) {
        const grayscale = 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];
        data[i] = color1.r + (color2.r - color1.r) * (grayscale / 255);
        data[i + 1] = color1.g + (color2.g - color1.g) * (grayscale / 255);
        data[i + 2] = color1.b + (color2.b - color1.b) * (grayscale / 255);
    }
    ctx.putImageData(imageData, 0, 0);
    console.log("Duotone effect applied.");
}

// Handle file upload and load the image onto the canvas
imageInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            image.src = e.target.result;
            imageLoaded = false; // Reset the loaded flag
        };
        reader.readAsDataURL(file);
    }
});

// Handle Unsplash search to load a random image based on the search term
async function fetchUnsplashImage() {
    const query = searchInput.value.trim();
    if (query) {
        try {
            const response = await fetch(`/.netlify/functions/fetchUnsplash?query=${query}`);
            const data = await response.json();
            if (data && data.urls && data.urls.regular) {
                image.src = data.urls.regular;
                imageLoaded = false;
            } else {
                alert("No image found for the specified query.");
            }
        } catch (error) {
            alert("Failed to fetch image.");
        }
    }
}


// Trigger Unsplash search when Enter key is pressed in the search input
searchInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        fetchUnsplashImage();
    }
});

searchButton.addEventListener('click', fetchUnsplashImage);

// Set imageLoaded to true only after the image is fully loaded
image.onload = () => {
    imageLoaded = true;
    drawImage(); // Display the image immediately on the canvas
    console.log("Image loaded and displayed on canvas.");
};

// Event listener for Apply Effect button
applyButton.addEventListener('click', applyDuotone);

// Helper function to convert hex color to RGB
function hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255,
    };
}

// Download the canvas image as PNG
downloadButton.addEventListener('click', () => {
    if (!imageLoaded) {
        alert("Please apply the duotone effect before downloading.");
        return;
    }
    const link = document.createElement('a');
    link.download = 'duotone-image.png';
    link.href = canvas.toDataURL();
    link.click();
});
