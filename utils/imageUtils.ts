
/**
 * Converts a data URL string (e.g., from a generated image) into a File object.
 * @param dataUrl The data URL (e.g., "data:image/png;base64,...").
 * @param filename The desired filename for the new File object.
 * @param mimeType The explicit MIME type for the file.
 * @returns A Promise that resolves with the new File object.
 */
export const dataUrlToFile = async (dataUrl: string, filename: string, mimeType: string): Promise<File> => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], filename, { type: mimeType });
};

/**
 * Converts a File object into a base64 data URL string.
 * @param file The File object to convert.
 * @returns A Promise that resolves with the data URL string.
 */
export const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });
};
