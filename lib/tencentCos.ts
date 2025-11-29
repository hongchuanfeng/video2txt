import COS from 'cos-nodejs-sdk-v5';
import crypto from 'crypto';
import type { TencentSmartSubtitleConfig } from './tencentSmartSubtitle';

type UploadOptions = {
  buffer: Buffer;
  filename?: string;
  contentType?: string;
  contentLength?: number;
};

let cachedCosClient: COS | null = null;

function getCosClient(config: TencentSmartSubtitleConfig) {
  if (!cachedCosClient) {
    cachedCosClient = new COS({
      SecretId: config.secretId,
      SecretKey: config.secretKey
    });
  }
  return cachedCosClient;
}

export async function uploadVideoToCos(
  config: TencentSmartSubtitleConfig,
  { buffer, filename, contentType, contentLength }: UploadOptions
): Promise<{ objectKey: string }> {
  if (!buffer || buffer.length === 0) {
    throw new Error('上传内容为空，无法写入 COS。');
  }

  const cosClient = getCosClient(config);
  const safeName = sanitizeFilename(filename);
  const uniqueKey = `${Date.now()}-${crypto.randomUUID()}-${safeName}`;
  const objectKey = `${config.uploadDir}${uniqueKey}`;
  const keyWithoutSlash = objectKey.replace(/^\//, '');

  await new Promise<void>((resolve, reject) => {
    cosClient.putObject(
      {
        Bucket: config.cosBucket,
        Region: config.cosRegion,
        Key: keyWithoutSlash,
        Body: buffer,
        ContentLength: contentLength ?? buffer.length,
        ContentType: contentType
      },
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });

  return { objectKey };
}

function sanitizeFilename(name?: string): string {
  if (!name) {
    return 'video.mp4';
  }
  const trimmed = name.trim();
  if (!trimmed) {
    return 'video.mp4';
  }
  return trimmed.replace(/[^a-zA-Z0-9.\-_]/g, '_');
}


