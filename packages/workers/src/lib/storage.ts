import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';
import { basename } from 'path';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET_NAME = 'videos';

/**
 * Upload file to Supabase Storage from workers
 * @param filePath - Local file path
 * @param storagePath - Storage path (e.g., 'projects/xxx/audio')
 * @returns Public URL of uploaded file
 */
export async function uploadToStorage(filePath: string, storagePath: string): Promise<string> {
  try {
    console.log(`Uploading ${filePath} to ${storagePath}...`);
    
    // Read file
    const fileContent = await readFile(filePath);
    const fileName = basename(filePath);
    const fullPath = `${storagePath}/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fullPath, fileContent, {
        contentType: filePath.endsWith('.mp3') ? 'audio/mpeg' : 'video/mp4',
        upsert: true
      });

    if (error) {
      console.error('Supabase storage error:', error);
      throw new Error(`Supabase upload failed: ${error.message}`);
    }

    console.log('Upload successful:', data);

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

/**
 * Delete file from Supabase Storage
 * @param url - Public URL of file to delete
 */
export async function deleteFromStorage(url: string): Promise<void> {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname.split(`/storage/v1/object/public/${BUCKET_NAME}/`)[1];

    if (!path) {
      throw new Error('Invalid storage URL');
    }

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([path]);

    if (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }
  } catch (error: any) {
    console.error('Delete error:', error);
    throw error;
  }
}
