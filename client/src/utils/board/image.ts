// Image upload utilities

import api from '../api';

/**
 * Upload an image file and return the URL
 */
export async function uploadImage(file: File): Promise<string | null> {
    try {
        const formData = new FormData();
        formData.append('image', file);
        const res = await api.post('/api/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return res.data.url;
    } catch (err) {
        console.error('Image upload failed:', err);
        return null;
    }
}

/**
 * Validate image file type and size
 */
export function validateImageFile(file: File): { valid: boolean, error?: string } {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!validTypes.includes(file.type)) {
        return {
            valid: false,
            error: 'Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.'
        };
    }

    if (file.size > maxSize) {
        return {
            valid: false,
            error: 'File size exceeds 5MB limit.'
        };
    }

    return { valid: true };
}
