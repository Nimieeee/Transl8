import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { readFile } from 'fs/promises';
import { basename } from 'path';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

const BUCKET = process.env.S3_BUCKET || 'dubbing-platform';

export async function uploadToStorage(filePath: string, key: string): Promise<string> {
  const fileContent = await readFile(filePath);
  const fileName = basename(filePath);
  
  await s3Client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: `${key}/${fileName}`,
    Body: fileContent
  }));

  return `https://${BUCKET}.s3.amazonaws.com/${key}/${fileName}`;
}
