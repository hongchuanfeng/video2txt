import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUserSubscription } from '@/lib/subscription';

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
 * GET /api/user/subscription
 * Get current user's subscription info
 */
export async function GET(request: NextRequest) {
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
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!token || token === 'undefined' || token === 'null' || token.trim() === '') {
      console.error('Invalid token format:', token ? `${token.substring(0, 20)}...` : 'empty');
      return NextResponse.json({ error: '无效的认证令牌' }, { status: 401 });
    }
    
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

    const subscription = await getUserSubscription(user.id);
    if (!subscription) {
      return NextResponse.json({ error: '无法获取订阅信息' }, { status: 500 });
    }

    return NextResponse.json(subscription);
  } catch (error: any) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

