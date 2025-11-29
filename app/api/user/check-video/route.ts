import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { canUseVideoToSubtitle } from '@/lib/subscription';

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
export const dynamic = 'force-dynamic';

/**
 * POST /api/user/check-video
 * Check if user can process video (has credits or free trial)
 */
export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
      const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
      console.error('Supabase admin client not initialized:', {
        hasServiceKey,
        hasSupabaseUrl,
        serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'not set'
      });
      return NextResponse.json({ 
        error: '服务器配置错误：请检查 SUPABASE_SERVICE_ROLE_KEY 环境变量是否已设置' 
      }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!token || token === 'undefined' || token === 'null' || token.trim() === '') {
      console.error('Invalid token format:', token ? `${token.substring(0, 20)}...` : 'empty');
      return NextResponse.json({ error: '无效的认证令牌' }, { status: 401 });
    }
    
    console.log('Verifying token, length:', token.length);
    const { data, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError) {
      console.error('Auth error:', authError.message, authError.status);
      return NextResponse.json({ error: '无效的认证令牌' }, { status: 401 });
    }
    
    if (!data?.user) {
      console.error('User not found for token');
      return NextResponse.json({ error: '无效的认证令牌' }, { status: 401 });
    }

    const user = data.user;
    console.log('User authenticated:', user.id);

    const body = await request.json().catch(() => ({}));
    const videoDurationSeconds = parseFloat(body.durationSeconds || '0');

    if (!videoDurationSeconds || videoDurationSeconds <= 0) {
      return NextResponse.json({ error: '无效的视频时长' }, { status: 400 });
    }

    const checkResult = await canUseVideoToSubtitle(user.id, videoDurationSeconds);

    return NextResponse.json(checkResult);
  } catch (error: any) {
    console.error('Error checking video:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

