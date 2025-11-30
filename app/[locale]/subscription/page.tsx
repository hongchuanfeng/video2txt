'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { SUBSCRIPTION_PLANS, type SubscriptionPlan } from '@/lib/subscription';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type UserSubscription = {
  userId: string;
  credits: number;
  freeTrialUsed: boolean;
  subscriptionPlanId: string | null;
  subscriptionExpiresAt: string | null;
};

export default function SubscriptionPage() {
  const t = useTranslations('subscription');
  const locale = useLocale();
  const [user, setUser] = useState<any>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        try {
          const token = (await supabase.auth.getSession()).data.session?.access_token;
            const response = await fetch('/api/user/subscription', {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });

          if (response.ok) {
            const data = await response.json();
            console.log('Subscription page - Subscription data received:', data);
            // Ensure credits is a number and handle data format
            setSubscription({
              userId: data.userId || data.user_id,
              credits: data.credits != null ? Number(data.credits) : 0,
              freeTrialUsed: data.freeTrialUsed ?? data.free_trial_used ?? false,
              subscriptionPlanId: data.subscriptionPlanId ?? data.subscription_plan_id ?? null,
              subscriptionExpiresAt: data.subscriptionExpiresAt ?? data.subscription_expires_at ?? null,
            });
          }
        } catch (error) {
          console.error('Error fetching subscription:', error);
        }
      }

      setLoading(false);
    };

    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        try {
          const token = session.access_token;
          const response = await fetch('/api/user/subscription', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            console.log('Subscription page - Subscription data received (auth change):', data);
            // Ensure credits is a number and handle data format
            setSubscription({
              userId: data.userId || data.user_id,
              credits: data.credits != null ? Number(data.credits) : 0,
              freeTrialUsed: data.freeTrialUsed ?? data.free_trial_used ?? false,
              subscriptionPlanId: data.subscriptionPlanId ?? data.subscription_plan_id ?? null,
              subscriptionExpiresAt: data.subscriptionExpiresAt ?? data.subscription_expires_at ?? null,
            });
          }
        } catch (error) {
          console.error('Error fetching subscription:', error);
        }
      } else {
        setSubscription(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (!user) {
      window.location.href = `/${locale}/login`;
      return;
    }

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        alert(t('loginRequired'));
        window.location.href = `/${locale}/login`;
        return;
      }

      // Call CREEM checkout API
      const response = await fetch('/api/creem/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planId: plan.id }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || t('paymentError'));
        return;
      }

      const data = await response.json();
      if (data.redirectUrl) {
        // Redirect to CREEM payment page
        window.location.href = data.redirectUrl;
      } else {
        alert(t('paymentError'));
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      alert(t('paymentError'));
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <p className="text-gray-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">{t('title')}</h1>
          <p className="text-xl text-gray-600">{t('subtitle')}</p>
        </div>

        {/* Login Prompt for Non-logged Users */}
        {!user && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm text-yellow-700">
                  {t('loginPrompt')}{' '}
                  <Link href={`/${locale}/login`} className="underline font-medium">
                    {t('loginHere')}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Current Subscription Info - Only show if logged in */}
        {user && subscription && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">{t('currentStatus')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">{t('credits')}</p>
                <p className="text-2xl font-bold text-primary-600">{subscription.credits}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">{t('freeTrial')}</p>
                <p className="text-lg font-semibold">
                  {subscription.freeTrialUsed ? t('used') : t('available')}
                </p>
              </div>
              {subscription.subscriptionExpiresAt && (
                <div>
                  <p className="text-sm text-gray-600">{t('expiresAt')}</p>
                  <p className="text-lg font-semibold">
                    {new Date(subscription.subscriptionExpiresAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pricing Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {SUBSCRIPTION_PLANS.map((plan) => (
            <div
              key={plan.id}
              className="bg-white rounded-lg shadow-lg border-2 border-gray-200 p-8 hover:border-primary-500 transition-colors"
            >
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-primary-600">${plan.price}</span>
                  <span className="text-gray-600">/{t('month')}</span>
                </div>
                <p className="text-lg font-semibold text-gray-700">
                  {plan.credits} {t('credits')}
                </p>
              </div>

              <ul className="space-y-3 mb-6">
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>{plan.credits} {t('creditsPerMonth')}</span>
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>{t('creditUsage')}</span>
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>{t('autoRenewal')}</span>
                </li>
              </ul>

              <button
                onClick={() => handleSubscribe(plan)}
                className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {user ? t('subscribe') : t('loginToSubscribe')}
              </button>
            </div>
          ))}
        </div>

        {/* Pricing Info */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">{t('pricingInfo')}</h2>
          <ul className="space-y-2 text-gray-700">
            <li>• {t('pricingRule1')}</li>
            <li>• {t('pricingRule2')}</li>
            <li>• {t('pricingRule3')}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

