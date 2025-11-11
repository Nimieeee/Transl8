import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

// S3 Client Configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials:
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
      : undefined,
  // For local development with LocalStack or MinIO
  ...(process.env.S3_ENDPOINT && {
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: true,
  }),
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'dubbing-platform-storage';
const SIGNED_URL_EXPIRY = 3600; // 1 hour in seconds
// Note: File retention is configured via S3 lifecycle policies (30 days)

export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  userId: string;
  projectId: string;
}

export interface SignedUrlOptions {
  expiresIn?: number; // seconds
}

/**
 * Generate a unique storage key for a file
 */
export function generateStorageKey(
  userId: string,
  projectId: string,
  filename: string,
  prefix: 'videos' | 'audio' | 'thumbnails' | 'voice-samples'
): string {
  const timestamp = Date.now();
  const randomSuffix = crypto.randomBytes(8).toString('hex');
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${prefix}/${userId}/${projectId}/${timestamp}-${randomSuffix}-${sanitizedFilename}`;
}

/**
 * Upload a file to S3
 */
export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array | string,
  options: UploadOptions
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: options.contentType,
    Metadata: {
      ...options.metadata,
      userId: options.userId,
      projectId: options.projectId,
      uploadedAt: new Date().toISOString(),
    },
    ServerSideEncryption: 'AES256', // Encryption at rest
    // Set lifecycle tag for automatic deletion after 30 days
    Tagging: `retention=30days&userId=${options.userId}&projectId=${options.projectId}`,
  });

  await s3Client.send(command);

  return key;
}

/**
 * Generate a signed URL for secure file access
 */
export async function generateSignedUrl(
  key: string,
  options: SignedUrlOptions = {}
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const signedUrl = await getSignedUrl(s3Client, command, {
    expiresIn: options.expiresIn || SIGNED_URL_EXPIRY,
  });

  return signedUrl;
}

/**
 * Generate a signed URL for uploading (PUT)
 */
export async function generateUploadSignedUrl(
  key: string,
  contentType: string,
  options: SignedUrlOptions = {}
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
    ServerSideEncryption: 'AES256',
  });

  const signedUrl = await getSignedUrl(s3Client, command, {
    expiresIn: options.expiresIn || SIGNED_URL_EXPIRY,
  });

  return signedUrl;
}

/**
 * Delete a file from S3
 */
export async function deleteFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}

/**
 * Check if a file exists in S3
 */
export async function fileExists(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    await s3Client.send(command);
    return true;
  } catch (error: any) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
}

/**
 * Get file metadata
 */
export async function getFileMetadata(key: string): Promise<{
  contentType?: string;
  contentLength?: number;
  lastModified?: Date;
  metadata?: Record<string, string>;
}> {
  const command = new HeadObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const response = await s3Client.send(command);

  return {
    contentType: response.ContentType,
    contentLength: response.ContentLength,
    lastModified: response.LastModified,
    metadata: response.Metadata,
  };
}

/**
 * Delete all files for a project
 */
export async function deleteProjectFiles(userId: string, projectId: string): Promise<void> {
  // In a production environment, you would list all objects with the prefix
  // and delete them in batches. For now, this is a placeholder.
  // The actual implementation would use ListObjectsV2Command and DeleteObjectsCommand
  console.log(`Deleting all files for project ${projectId} of user ${userId}`);
}

/**
 * Check S3 connection health
 */
export async function checkStorageConnection(): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: 'health-check',
    });
    await s3Client.send(command);
    return true;
  } catch (error: any) {
    // 404 is acceptable - bucket exists but file doesn't
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return true;
    }
    console.error('Storage health check failed:', error);
    return false;
  }
}

export { s3Client, BUCKET_NAME };
