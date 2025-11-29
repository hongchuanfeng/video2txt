import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SUBSCRIPTION_PLANS, addCredits } from '@/lib/subscription';
import * as crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qtgvnucqvwdwgbuqssqx.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const creemWebhookSecret = process.env.CREEM_WEBHOOK_SECRET || 'whsec_tsf4I58EXUxebny8SvoBv';

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
 * Generate signature for webhook verification
 */
function generateSignature(payload: string, secret: string): string {
  const computedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return computedSignature;
}

/**
 * POST /api/creem/webhook
 * Handle CREEM payment webhook callbacks
 * 
 * CREEM sends webhook with:
 * - Query params: checkout_id, order_id, customer_id, subscription_id, product_id, signature
 * - POST body: JSON payload with event data
 */
export async function POST(request: NextRequest) {
  try {
    // Get query parameters (CREEM includes these in the callback URL)
    const checkoutId = request.nextUrl.searchParams.get('checkout_id') || '';
    const orderId = request.nextUrl.searchParams.get('order_id') || '';
    const customerId = request.nextUrl.searchParams.get('customer_id') || '';
    const subscriptionIdFromUrl = request.nextUrl.searchParams.get('subscription_id') || '';
    const productIdFromUrl = request.nextUrl.searchParams.get('product_id') || '';
    const signature = request.nextUrl.searchParams.get('signature') || '';

    // Print all query parameters
    console.log('=== CREEM Webhook Callback Parameters ===');
    console.log('URL Query Parameters:');
    console.log('  checkout_id:', checkoutId);
    console.log('  order_id:', orderId);
    console.log('  customer_id:', customerId);
    console.log('  subscription_id:', subscriptionIdFromUrl);
    console.log('  product_id:', productIdFromUrl);
    console.log('  signature:', signature);
    console.log('Full URL:', request.nextUrl.toString());

    // Get all headers
    console.log('\nRequest Headers:');
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });
    console.log(JSON.stringify(headers, null, 2));

    // Get raw body for signature verification and parsing
    const rawBody = await request.text();
    console.log('\nRaw Request Body:');
    console.log('  Length:', rawBody.length);
    console.log('  Content:', rawBody);
    console.log('  Content (first 500 chars):', rawBody.substring(0, 500));

    // Print webhook secret info (without exposing the full secret)
    console.log('\nWebhook Secret Info:');
    console.log('  Secret length:', creemWebhookSecret.length);
    console.log('  Secret prefix:', creemWebhookSecret.substring(0, 10) + '...');

    // Verify signature if provided (CREEM includes it in URL params)
    if (signature && rawBody) {
      console.log('\n=== Signature Verification ===');
      console.log('Received signature:', signature);
      
      const computedSignature = generateSignature(rawBody, creemWebhookSecret);
      console.log('Computed signature:', computedSignature);
      console.log('Signatures match:', signature === computedSignature);
      
      if (signature !== computedSignature) {
        console.error('❌ Invalid webhook signature - Verification failed!');
        console.error('Expected:', computedSignature);
        console.error('Received:', signature);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      } else {
        console.log('✅ Signature verification passed!');
      }
    } else {
      console.log('\n⚠️  No signature provided or empty body');
      console.log('  Has signature:', !!signature);
      console.log('  Has rawBody:', !!rawBody);
    }

    // Parse webhook payload (CREEM sends JSON in POST body)
    let payload;
    try {
      payload = rawBody ? JSON.parse(rawBody) : {};
      console.log('\n=== Parsed Payload ===');
      console.log(JSON.stringify(payload, null, 2));
    } catch (e) {
      console.error('\n❌ Failed to parse payload as JSON:', e);
      console.error('Raw body that failed to parse:', rawBody);
      // If no body, use query params
      payload = {};
    }

    // Only process subscription.paid events
    console.log('\nEvent Type:', payload.eventType);
    if (payload.eventType !== 'subscription.paid') {
      console.log('⚠️  Event type not handled, returning success');
      return NextResponse.json({ message: 'Event type not handled' }, { status: 200 });
    }

    const subscription = payload.object;
    console.log('\n=== Subscription Object ===');
    console.log(JSON.stringify(subscription, null, 2));
    
    if (!subscription || !subscription.product || !subscription.customer) {
      console.error('❌ Invalid webhook payload - missing required fields');
      console.error('Payload:', JSON.stringify(payload, null, 2));
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Get product_id from payload or URL params
    const productId = subscription.product?.id || productIdFromUrl;
    const customerEmail = subscription.customer?.email;
    const subscriptionId = subscription.id || subscriptionIdFromUrl;
    
    console.log('\n=== Extracted Data ===');
    console.log('  productId:', productId);
    console.log('  customerEmail:', customerEmail);
    console.log('  subscriptionId:', subscriptionId);

    if (!productId) {
      console.error('No product_id found in webhook');
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
    }

    // Find the plan by product_id
    const plan = SUBSCRIPTION_PLANS.find((p) => p.productId === productId);
    if (!plan) {
      console.error('Plan not found for product_id:', productId);
      return NextResponse.json({ error: 'Plan not found' }, { status: 400 });
    }

    // Find user by email or customer_id
    let user = null;
    
    if (customerEmail) {
      const { data: users, error: userError } = await supabaseAdmin
        ?.auth.admin.listUsers()
        || { data: { users: [] }, error: null };

      if (userError) {
        console.error('Error fetching users:', userError);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
      }

      user = users?.users?.find((u) => u.email === customerEmail);
    }

    // If user not found by email, try to find by customer_id metadata (if stored)
    // For now, we'll require email match
    if (!user) {
      console.error('User not found for email:', customerEmail, 'customer_id:', customerId);
      return NextResponse.json({ error: 'User not found' }, { status: 400 });
    }

    // Calculate dates
    const startAt = subscription.current_period_start_date
      ? new Date(subscription.current_period_start_date)
      : new Date();
    const endAt = subscription.current_period_end_date
      ? new Date(subscription.current_period_end_date)
      : null;

    console.log('\n=== Processing Webhook ===');
    console.log('  User ID:', user.id);
    console.log('  Plan:', plan.name, `(${plan.id})`);
    console.log('  Credits to add:', plan.credits);
    console.log('  Start date:', startAt.toISOString());
    console.log('  End date:', endAt ? endAt.toISOString() : 'null');

    // Add credits to user
    console.log('\nAdding credits to user...');
    const creditsAdded = await addCredits(user.id, plan.credits, plan.id);
    if (!creditsAdded) {
      console.error('❌ Failed to add credits for user:', user.id);
      return NextResponse.json({ error: 'Failed to add credits' }, { status: 500 });
    }
    console.log('✅ Credits added successfully');

    // Create subscription order record
    const orderData = {
      user_id: user.id,
      plan_id: plan.id,
      plan_name: plan.name,
      price_usd: plan.price,
      credits: plan.credits,
      start_at: startAt.toISOString(),
      end_at: endAt ? endAt.toISOString() : null,
      status: 'completed',
      payment_provider: 'creem',
      payment_reference: orderId || subscriptionId || checkoutId,
    };
    
    console.log('\nCreating subscription order...');
    console.log('Order data:', JSON.stringify(orderData, null, 2));
    
    const { error: orderError } = await supabaseAdmin
      ?.from('subscription_orders')
      .insert(orderData)
      || { error: null };

    if (orderError) {
      console.error('❌ Error creating subscription order:', orderError);
      // Don't fail the webhook, credits were already added
    } else {
      console.log('✅ Subscription order created successfully');
    }

    console.log('\n=== Webhook Processing Complete ===');
    return NextResponse.json({ message: 'Webhook processed successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

