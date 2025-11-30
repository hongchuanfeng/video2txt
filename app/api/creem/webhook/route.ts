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
 * - Header: creem-signature (signature for verification)
 * - POST body: JSON payload with event data
 * 
 * Supported events:
 * 1. "subscription.paid" - subscription payment completed
 * 2. "checkout.completed" with object.order.status === "paid" - checkout payment completed
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    
    if (!rawBody) {
      console.error('❌ Empty request body');
      return NextResponse.json({ error: 'Empty body' }, { status: 400 });
    }

    // Get signature from header (creem-signature)
    const signature = request.headers.get('creem-signature') || '';
    
    console.log('=== CREEM Webhook Callback ===');
    console.log('Signature from header:', signature ? signature.substring(0, 20) + '...' : 'not found');
    console.log('Body length:', rawBody.length);

    // Verify signature
    if (!signature) {
      console.error('❌ No creem-signature header found');
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    const computedSignature = generateSignature(rawBody, creemWebhookSecret);
    console.log('Computed signature:', computedSignature.substring(0, 20) + '...');
    console.log('Signatures match:', signature === computedSignature);

    if (signature !== computedSignature) {
      console.error('❌ Invalid webhook signature - Verification failed!');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    console.log('✅ Signature verification passed!');

    // Parse webhook payload
    let payload;
    try {
      payload = JSON.parse(rawBody);
      console.log('\n=== Parsed Payload ===');
      console.log('Event Type:', payload.eventType);
      console.log('Event ID:', payload.id);
    } catch (e) {
      console.error('❌ Failed to parse payload as JSON:', e);
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Check if this is a payment completion event
    const eventType = payload.eventType;
    let isPaymentCompleted = false;
    let subscriptionData = null;
    let orderData = null;
    let productId = null;
    let customerEmail = null;
    let internalCustomerId = null;
    let subscriptionId = null;
    let orderId = null;
    let startAt: Date | null = null;
    let endAt: Date | null = null;

    // Handle subscription.paid event
    if (eventType === 'subscription.paid') {
      console.log('Processing subscription.paid event');
      subscriptionData = payload.object;
      
      if (!subscriptionData || !subscriptionData.product || !subscriptionData.customer) {
        console.error('❌ Invalid subscription.paid payload - missing required fields');
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
      }

      productId = subscriptionData.product.id;
      customerEmail = subscriptionData.customer.email;
      subscriptionId = subscriptionData.id;
      internalCustomerId = subscriptionData.metadata?.internal_customer_id;
      
      startAt = subscriptionData.current_period_start_date
        ? new Date(subscriptionData.current_period_start_date)
        : new Date();
      endAt = subscriptionData.current_period_end_date
        ? new Date(subscriptionData.current_period_end_date)
        : null;

      isPaymentCompleted = true;
    }
    // Handle checkout.completed event
    else if (eventType === 'checkout.completed') {
      console.log('Processing checkout.completed event');
      const checkoutData = payload.object;
      
      if (!checkoutData || !checkoutData.order || !checkoutData.product || !checkoutData.customer) {
        console.error('❌ Invalid checkout.completed payload - missing required fields');
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
      }

      // Check if order is paid
      if (checkoutData.order.status !== 'paid') {
        console.log('⚠️  Order status is not paid:', checkoutData.order.status);
        return NextResponse.json({ message: 'Order not paid' }, { status: 200 });
      }

      orderData = checkoutData.order;
      productId = checkoutData.product.id;
      customerEmail = checkoutData.customer.email;
      orderId = checkoutData.order.id;
      
      // Get subscription data if available
      if (checkoutData.subscription) {
        subscriptionData = checkoutData.subscription;
        subscriptionId = subscriptionData.id;
        internalCustomerId = subscriptionData.metadata?.internal_customer_id;
        
        startAt = subscriptionData.current_period_start_date
          ? new Date(subscriptionData.current_period_start_date)
          : new Date();
        endAt = subscriptionData.current_period_end_date
          ? new Date(subscriptionData.current_period_end_date)
          : null;
      } else {
        // If no subscription, use order dates
        startAt = checkoutData.order.created_at ? new Date(checkoutData.order.created_at) : new Date();
        endAt = null;
      }

      isPaymentCompleted = true;
    }
    // Unhandled event type
    else {
      console.log('⚠️  Event type not handled:', eventType);
      return NextResponse.json({ message: 'Event type not handled' }, { status: 200 });
    }

    if (!isPaymentCompleted) {
      return NextResponse.json({ message: 'Not a payment completion event' }, { status: 200 });
    }

    console.log('\n=== Extracted Data ===');
    console.log('  productId:', productId);
    console.log('  customerEmail:', customerEmail);
    console.log('  internalCustomerId:', internalCustomerId);
    console.log('  subscriptionId:', subscriptionId);
    console.log('  orderId:', orderId);

    if (!productId) {
      console.error('❌ No product_id found in webhook');
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
    }

    // Find the plan by product_id
    const plan = SUBSCRIPTION_PLANS.find((p) => p.productId === productId);
    if (!plan) {
      console.error('❌ Plan not found for product_id:', productId);
      return NextResponse.json({ error: 'Plan not found' }, { status: 400 });
    }

    // Find user by internal_customer_id (from metadata) or email
    let user = null;
    
    if (internalCustomerId) {
      console.log('Looking up user by internal_customer_id:', internalCustomerId);
      const { data: userData, error: userError } = await supabaseAdmin
        ?.auth.admin.getUserById(internalCustomerId)
        || { data: { user: null }, error: null };

      if (!userError && userData?.user) {
        user = userData.user;
        console.log('✅ User found by internal_customer_id');
      }
    }

    // If not found by internal_customer_id, try email
    if (!user && customerEmail) {
      console.log('Looking up user by email:', customerEmail);
      const { data: users, error: userError } = await supabaseAdmin
        ?.auth.admin.listUsers()
        || { data: { users: [] }, error: null };

      if (userError) {
        console.error('Error fetching users:', userError);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
      }

      user = users?.users?.find((u) => u.email === customerEmail);
      if (user) {
        console.log('✅ User found by email');
      }
    }

    if (!user) {
      console.error('❌ User not found for internal_customer_id:', internalCustomerId, 'or email:', customerEmail);
      return NextResponse.json({ error: 'User not found' }, { status: 400 });
    }

    console.log('\n=== Processing Webhook ===');
    console.log('  User ID:', user.id);
    console.log('  Plan:', plan.name, `(${plan.id})`);
    console.log('  Credits to add:', plan.credits);
    console.log('  Start date:', startAt ? startAt.toISOString() : 'null');
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
    // Build payment_reference with multiple IDs for reference
    const paymentReference = orderId || subscriptionId || payload.id;
    const subscriptionOrderData = {
      user_id: user.id,
      plan_id: plan.id,
      plan_name: plan.name,
      price_usd: plan.price,
      credits: plan.credits,
      start_at: startAt ? startAt.toISOString() : new Date().toISOString(),
      end_at: endAt ? endAt.toISOString() : null,
      status: 'completed',
      payment_provider: 'creem',
      payment_reference: paymentReference,
    };
    
    console.log('\nCreating subscription order...');
    console.log('Order data:', JSON.stringify(subscriptionOrderData, null, 2));
    
    const { error: orderError } = await supabaseAdmin
      ?.from('subscription_orders')
      .insert(subscriptionOrderData)
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
    console.error('❌ Error processing webhook:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

