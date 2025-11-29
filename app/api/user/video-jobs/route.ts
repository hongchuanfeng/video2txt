import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qtgvnucqvwdwgbuqssqx.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Create admin client for server-side operations
const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

export const runtime = 'nodejs';

/**
 * GET /api/user/video-jobs
 * Get current user's video subtitle job history
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin?.auth.getUser(token) || { data: { user: null }, error: null };

    if (authError || !user) {
      return NextResponse.json({ error: '无效的认证令牌' }, { status: 401 });
    }

    // Get video subtitle jobs for this user
    const { data, error } = await supabaseAdmin
      ?.from('video_subtitle_jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      || { data: null, error: null };

    if (error) {
      console.error('Error fetching video jobs:', error);
      return NextResponse.json({ error: '获取转换记录失败' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Error fetching video jobs:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

