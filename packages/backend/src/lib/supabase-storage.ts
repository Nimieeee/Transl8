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
    console.log('Upload attempt:', { 
      bucket: BUCKET_NAME, 
      key, 
      supabaseUrl: supabaseUrl ? 'SET' : 'MISSING',
      supabaseKey: supabaseKey ? 'SET' : 'MISSING'
    });

    // Read file
    const fileContent = await readFile(filePath);
    const fileName = basename(filePath);
    const fullPath = `${key}/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fullPath, fileContent, {
        contentType: 'video/mp4',
        upsert: true
      });

    if (error) {
      console.error('Supabase storage error:', JSON.stringify(error, null, 2));
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
    // Extract path from URL
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

/**
 * Initialize storage bucket (run once on setup)
 */
export async function initializeStorage(): Promise<void> {
  try {
    // Check if bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);

    if (!bucketExists) {
      // Create bucket
      const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 524288000 // 500MB
      });

      if (error) {
        console.error('Bucket creation error:', error);
      } else {
        console.log('✅ Storage bucket created');
      }
    }
  } catch (error) {
    console.error('Storage initialization error:', error);
  }
}
