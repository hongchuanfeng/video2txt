import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SUBSCRIPTION_PLANS } from '@/lib/subscription';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qtgvnucqvwdwgbuqssqx.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const creemApiKey = process.env.CREEM_API_KEY || '';
const creemApiUrl = process.env.CREEM_API_URL || 'https://api.creem.io';
const appBaseUrl = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

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
export const dynamic = 'force-dynamic';

/**
 * POST /api/creem/checkout
 * Create a CREEM checkout session for subscription
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin?.auth.getUser(token) || { data: { user: null }, error: null };

    if (authError || !user) {
      return NextResponse.json({ error: '无效的认证令牌' }, { status: 401 });
    }

    // Check CREEM API key
    if (!creemApiKey) {
      console.error('CREEM_API_KEY is not configured');
      return NextResponse.json({ error: '支付服务未配置' }, { status: 500 });
    }

    // Parse request body
    const body = await request.json();
    const { planId } = body;

    if (!planId) {
      return NextResponse.json({ error: '请选择套餐' }, { status: 400 });
    }

    // Find the plan
    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
    if (!plan) {
      return NextResponse.json({ error: '无效的套餐' }, { status: 400 });
    }

    // Call CREEM API to create checkout
    const checkoutUrl = `${creemApiUrl}/v1/checkouts`;
    console.log('Calling CREEM API:', {
      url: checkoutUrl,
      productId: plan.productId,
      apiKeyLength: creemApiKey.length
    });
    
    const response = await fetch(checkoutUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': creemApiKey,
      },
      body: JSON.stringify({
        product_id: plan.productId,
        metadata: {
          internal_customer_id: user.id,
          email: user.email ?? undefined
        }
      }),
    });

    console.log('CREEM API response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('CREEM API error response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      return NextResponse.json({ error: '创建支付链接失败' }, { status: 500 });
    }

    const responseText = await response.text();
    console.log('CREEM API response body:', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse CREEM response as JSON:', parseError);
      console.error('Response text:', responseText);
      return NextResponse.json({ error: '支付服务返回格式异常' }, { status: 500 });
    }

    console.log('Parsed CREEM response:', JSON.stringify(data, null, 2));
    
    // Try multiple possible field names for redirect URL
    const redirectUrl = data.redirect_url || data.url || data.checkout_url || data.redirectUrl || data.checkoutUrl;

    if (!redirectUrl) {
      console.error('No redirect URL found in CREEM response. Available fields:', Object.keys(data));
      console.error('Full response:', JSON.stringify(data, null, 2));
      return NextResponse.json({ 
        error: '支付服务返回异常：未找到重定向链接',
        details: 'Response fields: ' + Object.keys(data).join(', ')
      }, { status: 500 });
    }

    console.log('Redirect URL found:', redirectUrl);
    return NextResponse.json({ redirectUrl });
  } catch (error: any) {
    console.error('Error creating checkout:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

