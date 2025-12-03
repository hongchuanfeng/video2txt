import { NextRequest, NextResponse } from 'next/server';
import { getTencentSmartSubtitleConfig, buildPublicUrl } from '@/lib/tencentSmartSubtitle';
import { getCosClientForSigning, buildCosObjectKey } from '@/lib/tencentCos';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/tencent-cos/upload-url
 * 生成前端直传腾讯 COS 的预签名 URL
 *
 * 请求体(JSON):
 * {
 *   fileName: string;
 *   fileType?: string;
 *   fileSize?: number;
 * }
 *
 * 响应(JSON):
 * {
 *   uploadUrl: string;   // 可在前端直接 PUT 文件的 URL
 *   objectKey: string;   // COS 对象 Key
 *   videoUrl: string;    // 公网可访问的视频 URL（传给 /api/tencent-smart-subtitle 使用）
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const config = getTencentSmartSubtitleConfig();
    const cosClient = getCosClientForSigning(config);

    const body = await request.json().catch(() => ({}));
    const rawFileName: string | undefined = body.fileName;
    const fileName = typeof rawFileName === 'string' && rawFileName.trim() ? rawFileName.trim() : 'video.mp4';

    const objectKey = buildCosObjectKey(config, fileName);

    const url = await new Promise<string>((resolve, reject) => {
      cosClient.getObjectUrl(
        {
          Bucket: config.cosBucket,
          Region: config.cosRegion,
          Key: objectKey,
          Sign: true,
          Method: 'PUT',
          Expires: 600 // 10 分钟有效期
        },
        (err, data) => {
          if (err) {
            reject(err);
          } else if (!data || !data.Url) {
            reject(new Error('未能生成 COS 预签名 URL'));
          } else {
            resolve(data.Url);
          }
        }
      );
    });

    const videoUrl = buildPublicUrl(config, objectKey);

    return NextResponse.json({
      uploadUrl: url,
      objectKey,
      videoUrl
    });
  } catch (error: any) {
    console.error('Error generating COS upload URL:', error);
    return NextResponse.json(
      {
        error:
          error?.message ||
          '生成 COS 上传地址失败，请稍后重试。'
      },
      { status: 500 }
    );
  }
}


