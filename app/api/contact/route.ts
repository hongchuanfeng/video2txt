import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
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
 * POST /api/contact
 * 处理用户通过"联系我们"页面提交的留言
 */
export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      console.error('Supabase admin client not initialized');
      return NextResponse.json({ error: '服务器配置错误' }, { status: 500 });
    }

    // 解析请求体
    const body = await request.json();
    const { name, email, subject, message } = body;

    // 验证必填字段
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: '请填写所有必填字段' },
        { status: 400 }
      );
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '请输入有效的邮箱地址' },
        { status: 400 }
      );
    }

    // 验证字段长度
    if (name.trim().length > 100) {
      return NextResponse.json(
        { error: '姓名长度不能超过100个字符' },
        { status: 400 }
      );
    }

    if (subject.trim().length > 200) {
      return NextResponse.json(
        { error: '主题长度不能超过200个字符' },
        { status: 400 }
      );
    }

    if (message.trim().length > 5000) {
      return NextResponse.json(
        { error: '留言内容长度不能超过5000个字符' },
        { status: 400 }
      );
    }

    // 尝试获取当前登录用户（可选）
    let userId: string | null = null;
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      if (token && token !== 'undefined' && token !== 'null' && token.trim() !== '') {
        try {
          const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
          if (!authError && user) {
            userId = user.id;
          }
        } catch (e) {
          // 如果获取用户失败，继续处理留言（允许未登录用户提交留言）
          console.log('Failed to get user from token, continuing as anonymous:', e);
        }
      }
    }

    // 插入留言记录到数据库
    const { data, error } = await supabaseAdmin
      .from('contact_messages')
      .insert({
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
        user_id: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to insert contact message:', error);
      return NextResponse.json(
        { error: '提交留言失败，请稍后重试' },
        { status: 500 }
      );
    }

    console.log('Contact message submitted successfully:', {
      id: data.id,
      email: data.email,
      userId: userId || 'anonymous',
    });

    return NextResponse.json(
      {
        success: true,
        message: '留言提交成功',
        id: data.id,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error processing contact message:', error);
    return NextResponse.json(
      {
        error: error?.message || '处理留言时发生错误，请稍后重试',
      },
      { status: 500 }
    );
  }
}

