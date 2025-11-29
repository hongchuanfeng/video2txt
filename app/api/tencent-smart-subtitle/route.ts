import { NextRequest, NextResponse } from 'next/server';
import {
  buildPublicUrl,
  buildSegmentsFromResults,
  createMpsClient,
  getTencentSmartSubtitleConfig,
  segmentsToSrt,
  SmartSubtitleJobInput,
  submitSmartSubtitleJob,
  waitForSmartSubtitleResult
} from '@/lib/tencentSmartSubtitle';
import { uploadVideoToCos } from '@/lib/tencentCos';
import { createClient } from '@supabase/supabase-js';
import { canUseVideoToSubtitle, deductCredits } from '@/lib/subscription';
import { getVideoDuration } from '@/lib/videoUtils';

const MAX_VIDEO_SIZE = 1024 * 1024 * 1024; // 1GB

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qtgvnucqvwdwgbuqssqx.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  // Variables for error handling
  let currentUser: any = null;
  let videoDurationSeconds = 0;
  let videoName: string | null = null;
  let videoUrlForDb = '';

  try {
    // Check authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '请先登录才能使用视频转字幕功能' }, { status: 401 });
    }

    if (!supabaseAdmin) {
      console.error('Supabase admin client not initialized');
      return NextResponse.json({ error: '服务器配置错误' }, { status: 500 });
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!token || token === 'undefined' || token === 'null' || token.trim() === '') {
      console.error('Invalid token format');
      return NextResponse.json({ error: '无效的认证令牌，请重新登录' }, { status: 401 });
    }
    
    const { data, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError) {
      console.error('Auth error:', authError.message);
      return NextResponse.json({ error: '无效的认证令牌，请重新登录' }, { status: 401 });
    }
    
    if (!data?.user) {
      console.error('User not found for token');
      return NextResponse.json({ error: '无效的认证令牌，请重新登录' }, { status: 401 });
    }

    const user = data.user;

    currentUser = user; // Store user for error handling

    const config = getTencentSmartSubtitleConfig();
    const contentType = request.headers.get('content-type') || '';
    let jobInput: SmartSubtitleJobInput | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');
      const durationParam = formData.get('durationSeconds');

      if (!(file instanceof File)) {
        return NextResponse.json({ error: '请上传有效的视频文件。' }, { status: 400 });
      }

      videoName = file.name;

      if (file.size === 0) {
        return NextResponse.json({ error: '视频文件为空。' }, { status: 400 });
      }

      if (file.size > MAX_VIDEO_SIZE) {
        return NextResponse.json({ error: '视频文件过大，单个文件最大 1GB。' }, { status: 400 });
      }

      // Get video duration from form data or calculate from file
      const buffer = Buffer.from(await file.arrayBuffer());
      if (durationParam) {
        videoDurationSeconds = parseFloat(durationParam.toString());
      } else {
        // Try to get duration from file buffer (basic estimation)
        videoDurationSeconds = await getVideoDuration(buffer, file.name);
      }

      const { objectKey } = await uploadVideoToCos(config, {
        buffer,
        filename: file.name,
        contentType: file.type,
        contentLength: file.size
      });
      if (!objectKey) {
        return NextResponse.json({ error: '上传视频文件失败' }, { status: 500 });
      }
      jobInput = { mode: 'cos', objectKey };
      videoUrlForDb = buildPublicUrl(config, objectKey) || '';
    } else if (contentType.includes('application/json')) {
      const body = await request.json().catch(() => ({}));
      const videoUrl = (body?.videoUrl ?? '').trim();
      videoDurationSeconds = parseFloat(body.durationSeconds || '0');
      videoUrlForDb = videoUrl;

      if (!videoUrl) {
        return NextResponse.json({ error: '请提供视频 URL。' }, { status: 400 });
      }

      if (!/^https?:\/\//i.test(videoUrl)) {
        return NextResponse.json({ error: '视频 URL 必须以 http 或 https 开头。' }, { status: 400 });
      }

      if (videoDurationSeconds <= 0) {
        return NextResponse.json({ error: '请提供有效的视频时长。' }, { status: 400 });
      }

      jobInput = { mode: 'url', value: videoUrl };
    } else {
      return NextResponse.json({ error: '不支持的请求类型，请使用 multipart/form-data 或 JSON。' }, { status: 400 });
    }

    if (!jobInput) {
      return NextResponse.json({ error: '请求内容无效。' }, { status: 400 });
    }

    // Check if user can process this video and deduct credits before processing
    const checkResult = await canUseVideoToSubtitle(user.id, videoDurationSeconds);
    if (!checkResult.allowed) {
      return NextResponse.json({ error: checkResult.reason || '无法处理此视频' }, { status: 403 });
    }

    const videoDurationMinutes = Math.ceil(videoDurationSeconds / 60);
    const useFreeTrial = checkResult.useFreeTrial || false;
    
    const deducted = await deductCredits(user.id, videoDurationMinutes, useFreeTrial);
    if (!deducted) {
      return NextResponse.json({ error: '扣除积分失败，请重试' }, { status: 500 });
    }

    const client = createMpsClient(config);

    const taskId = await submitSmartSubtitleJob(client, config, jobInput);
    const rawResults = await waitForSmartSubtitleResult(client, taskId);
    const { segments, files } = buildSegmentsFromResults(rawResults);

    if (!segments.length) {
      throw new Error('已完成处理，但未获取到任何字幕片段。');
    }

    const srt = segmentsToSrt(segments);
    const subtitleFiles = files.map((file) => ({
      ...file,
      url: buildPublicUrl(config, file.path || file.subtitlePath)
    }));

    // Get subtitle URL for saving to database
    const subtitleUrl = subtitleFiles[0]?.url || null;

    // Save to video_subtitle_jobs table
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from('video_subtitle_jobs').insert({
          user_id: user.id,
          video_name: videoName,
          video_duration_seconds: Math.round(videoDurationSeconds),
          video_url: videoUrlForDb,
          subtitle_url: subtitleUrl,
          task_id: taskId,
          status: 'success',
          error_message: null
        });
      } catch (dbError) {
        console.error('Error saving video job to database:', dbError);
        // Don't fail the request if DB save fails
      }
    }

    return NextResponse.json({
      taskId,
      segmentCount: segments.length,
      segments,
      srt,
      subtitleFiles
    });
  } catch (error: any) {
    console.error('Tencent smart subtitle API error:', error);
    const message = error?.message || '智能字幕处理失败，请稍后再试。';

    // Try to save failed job to database if we have user context
    // Note: We can't re-read request here, so we'll save what we have from the outer scope
    // This is a best-effort save - if we don't have the data, we skip it
    try {
      if (supabaseAdmin && currentUser && videoDurationSeconds > 0) {
        await supabaseAdmin.from('video_subtitle_jobs').insert({
          user_id: currentUser.id,
          video_name: videoName || 'unknown',
          video_duration_seconds: Math.round(videoDurationSeconds),
          video_url: videoUrlForDb || '',
          subtitle_url: null,
          task_id: null,
          status: 'failed',
          error_message: message
        });
      }
    } catch (dbError) {
      console.error('Error saving failed job to database:', dbError);
      // Don't fail the request if DB save fails
    }

    const status =
      message.includes('未配置') || message.includes('缺失') ? 500 :
      message.includes('URL') || message.includes('请') ? 400 :
      502;

    return NextResponse.json({ error: message }, { status });
  }
}


