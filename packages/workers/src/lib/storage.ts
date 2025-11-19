import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';
import { basename } from 'path';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET_NAME = 'videos';

/**
 * Upload file to Supabase Storage
 * @param filePath - Local file path
 * @param key - Storage path/key
 * @returns Public URL of uploaded file
 */
export async function uploadToStorage(filePath: string, key: string): Promise<string> {
    try {
        // Read file
        const fileContent = await readFile(filePath);
        const fileName = basename(filePath);
        const fullPath = `${key}/${fileName}`;

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(fullPath, fileContent, {
                contentType: 'audio/mpeg', // Defaulting to audio/mpeg for TTS
                upsert: true
            });

        if (error) {
            throw new Error(`Supabase upload failed: ${error.message}`);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(fullPath);

        return urlData.publicUrl;
    } catch (error: any) {
        console.error('Upload error:', error);
        throw error;
    }
}
