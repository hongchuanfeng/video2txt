import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdmin() {
  if (supabaseAdmin) return supabaseAdmin;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error(
      '[keepalive] 缺少环境变量 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY'
    );
    return null;
  }

  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseAdmin;
}

export async function GET() {
  const client = getSupabaseAdmin();
  if (!client) {
    return NextResponse.json(
      { ok: false, error: 'supabase admin client not initialized' },
      { status: 500 }
    );
  }

  const now = new Date().toISOString();
  const logText = `keepalive ping at ${now}`;

  const { error } = await client.from('keepalive_logs').insert({
    log_time: now,
    log: logText,
  });

  if (error) {
    console.error('[keepalive] 插入日志失败:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        details: error.details,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    log: logText,
  });
}


