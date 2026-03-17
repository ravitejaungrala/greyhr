export const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f3f4f6' /%3E%3Cpath d='M30 40 L70 40 L50 70 Z' fill='%23d1d5db' /%3E%3Ctext x='50%25' y='85%25' text-anchor='middle' font-family='sans-serif' font-size='10' fill='%239ca3af'%3ENo Image%3C/text%3E%3C/svg%3E";

/**
 * Converts a base64 string to a Blob URL
 * @param {string} base64 - The base64 string
 * @param {string} contentType - The content type (e.g., 'application/pdf' or 'text/html')
 * @returns {string} - The Blob URL
 */
export const base64ToBlobUrl = (base64, contentType) => {
    const byteCharacters = atob(base64);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }

    const blob = new Blob(byteArrays, { type: contentType });
    return URL.createObjectURL(blob);
};
