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
