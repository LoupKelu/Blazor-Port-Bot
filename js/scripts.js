
function downloadFileFromBytes(fileName, byteArray) {
    const blob = new Blob([new Uint8Array(byteArray)], { type: "application/zip" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
}

// Validate PNG dimensions
window.validateImageDimensions = async (imageBytes) => {
    return new Promise((resolve) => {
        const blob = new Blob([new Uint8Array(imageBytes)], { type: "image/png" });
        const url = URL.createObjectURL(blob);

        const img = new Image();
        img.onload = () => {
            resolve(img.width === 64 && img.height === 32);
            URL.revokeObjectURL(url);
        };
        img.onerror = () => {
            resolve(false);
            URL.revokeObjectURL(url);
        };
        img.src = url;
    });
};


async function overlayCape(base64Cape) {
    const capeImg = await loadImageFromBase64(base64Cape);

    // Updated path to your overlay in wwwroot/overlays/
    const overlayImg = await loadImage(`${document.baseURI}templates/overlays/Custom_Cape.png`);

    const canvas = document.createElement('canvas');
    canvas.width = capeImg.width;
    canvas.height = capeImg.height;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(capeImg, 0, 0);
    ctx.drawImage(overlayImg, 0, 0, capeImg.width, capeImg.height);

    return canvas.toDataURL().split(',')[1]; // return Base64 without prefix
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = reject;
    });
}

function loadImageFromBase64(base64) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = 'data:image/png;base64,' + base64;
        img.onload = () => resolve(img);
        img.onerror = reject;
    });
}

const fileInput = document.getElementById('fileInput');
const fileName = document.getElementById('fileName');

fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
        fileName.textContent = fileInput.files[0].name;
    } else {
        fileName.textContent = "No file selected";
    }
});


document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const fileName = document.getElementById('fileName');

    if (fileInput && fileName) {
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                fileName.textContent = fileInput.files[0].name;
                fileName.classList.add('selected');  // add visual effect
            } else {
                fileName.textContent = 'No file selected';
                fileName.classList.remove('selected');
            }
        });
    }
});
