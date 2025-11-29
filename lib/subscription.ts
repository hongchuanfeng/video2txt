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

export type SubscriptionPlan = {
  id: string;
  name: string;
  price: number; // USD
  credits: number;
  duration: number; // days
  productId: string; // CREEM product_id
};

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  { id: 'plan_10', name: 'Basic', price: 10, credits: 30, duration: 30, productId: 'prod_1l9cjsowPhSJlsfrTTXlKb' },
  { id: 'plan_30', name: 'Standard', price: 30, credits: 100, duration: 30, productId: 'prod_3CQsZ5gNb1Nhkl9a3Yxhs2' },
  { id: 'plan_100', name: 'Premium', price: 100, credits: 350, duration: 30, productId: 'prod_5h3JThYd4iw4SIDm6L5sCO' },
];

export type UserSubscription = {
  userId: string;
  credits: number;
  freeTrialUsed: boolean;
  subscriptionPlanId: string | null;
  subscriptionExpiresAt: string | null;
};

/**
 * Get user subscription info (server-side only)
 */
export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  if (!supabaseAdmin) {
    console.error('Supabase admin client not initialized');
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No record found, create one
      return await createUserSubscription(userId);
    }
    console.error('Error fetching user subscription:', error);
    return null;
  }

  return {
    userId: data.user_id,
    credits: data.credits || 0,
    freeTrialUsed: data.free_trial_used || false,
    subscriptionPlanId: data.subscription_plan_id,
    subscriptionExpiresAt: data.subscription_expires_at,
  };
}

/**
 * Create initial user subscription record
 */
async function createUserSubscription(userId: string): Promise<UserSubscription> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not initialized');
  }

  const { data, error } = await supabaseAdmin
    .from('user_subscriptions')
    .insert({
      user_id: userId,
      credits: 0,
      free_trial_used: false,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating user subscription:', error);
    throw error;
  }

  return {
    userId: data.user_id,
    credits: data.credits || 0,
    freeTrialUsed: data.free_trial_used || false,
    subscriptionPlanId: data.subscription_plan_id,
    subscriptionExpiresAt: data.subscription_expires_at,
  };
}

/**
 * Check if user can use video to subtitle (has credits or free trial)
 */
export async function canUseVideoToSubtitle(userId: string, videoDurationSeconds: number): Promise<{
  allowed: boolean;
  reason?: string;
  useFreeTrial?: boolean;
}> {
  const subscription = await getUserSubscription(userId);
  if (!subscription) {
    console.error('Cannot get user subscription for userId:', userId);
    return { allowed: false, reason: '无法获取用户订阅信息' };
  }

  const videoDurationMinutes = Math.ceil(videoDurationSeconds / 60);
  const requiredCredits = videoDurationMinutes;

  console.log('Checking video:', {
    userId,
    videoDurationSeconds,
    videoDurationMinutes,
    requiredCredits,
    freeTrialUsed: subscription.freeTrialUsed,
    credits: subscription.credits
  });

  // First check free trial (only once, max 1 minute) - this has priority
  if (!subscription.freeTrialUsed && videoDurationSeconds <= 60) {
    console.log('Free trial available, allowing');
    return { allowed: true, useFreeTrial: true };
  }

  // Check if free trial was used but video is too long
  if (!subscription.freeTrialUsed && videoDurationSeconds > 60) {
    console.log('Free trial available but video too long');
    return { allowed: false, reason: '免费试用仅支持1分钟以内的视频，请订阅套餐或使用更短的视频' };
  }

  // Check if user has active subscription with credits
  if (subscription.credits >= requiredCredits) {
    console.log('Sufficient credits available');
    return { allowed: true };
  }

  // Free trial already used and credits insufficient
  if (subscription.freeTrialUsed && subscription.credits < requiredCredits) {
    console.log('Free trial used and insufficient credits');
    return {
      allowed: false,
      reason: `积分不足。需要 ${requiredCredits} 积分，当前有 ${subscription.credits} 积分。请订阅套餐获取更多积分。`,
    };
  }

  console.log('Default: not allowed');
  return { allowed: false, reason: '积分不足，请订阅套餐' };
}

/**
 * Deduct credits for video processing
 */
export async function deductCredits(
  userId: string,
  credits: number,
  useFreeTrial: boolean = false
): Promise<boolean> {
  if (!supabaseAdmin) {
    console.error('Supabase admin client not initialized');
    return false;
  }

  if (useFreeTrial) {
    const { error } = await supabaseAdmin
      .from('user_subscriptions')
      .update({ free_trial_used: true })
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating free trial:', error);
      return false;
    }
    return true;
  }

  const { data, error } = await supabaseAdmin.rpc('deduct_user_credits', {
    user_id_param: userId,
    credits_param: credits,
  });

  if (error) {
    console.error('Error deducting credits:', error);
    return false;
  }

  return data === true;
}

/**
 * Add credits to user (after subscription purchase)
 */
export async function addCredits(userId: string, credits: number, planId: string): Promise<boolean> {
  if (!supabaseAdmin) {
    console.error('Supabase admin client not initialized');
    return false;
  }

  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
  if (!plan) {
    return false;
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + plan.duration);

  // Get current credits first
  const current = await getUserSubscription(userId);
  const newCredits = (current?.credits || 0) + credits;

  const { error } = await supabaseAdmin
    .from('user_subscriptions')
    .update({
      credits: newCredits,
      subscription_plan_id: planId,
      subscription_expires_at: expiresAt.toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    console.error('Error adding credits:', error);
    return false;
  }

  return true;
}

