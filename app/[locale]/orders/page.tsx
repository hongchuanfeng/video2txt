'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type UserSubscription = {
  userId: string;
  credits: number;
  freeTrialUsed: boolean;
  subscriptionPlanId: string | null;
  subscriptionExpiresAt: string | null;
};

type SubscriptionOrder = {
  id: string;
  user_id: string;
  plan_id: string;
  plan_name: string;
  price_usd: number;
  credits: number;
  start_at: string;
  end_at: string | null;
  status: string;
  payment_provider: string | null;
  payment_reference: string | null;
  created_at: string;
  updated_at: string;
};

export default function OrdersPage() {
  const t = useTranslations('orders');
  const locale = useLocale();
  const [user, setUser] = useState<any>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [orders, setOrders] = useState<SubscriptionOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        try {
          const token = (await supabase.auth.getSession()).data.session?.access_token;
          
          // Fetch subscription summary
          const subscriptionResponse = await fetch('/api/user/subscription', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (subscriptionResponse.ok) {
            const subscriptionData = await subscriptionResponse.json();
            console.log('Orders page - Raw subscription data received:', subscriptionData);
            console.log('Orders page - Credits value:', subscriptionData.credits);
            console.log('Orders page - Credits type:', typeof subscriptionData.credits);
            console.log('Orders page - Credits is null?', subscriptionData.credits === null);
            console.log('Orders page - Credits is undefined?', subscriptionData.credits === undefined);
            
            // Ensure credits is a number - handle all cases
            let creditsValue = 0;
            if (subscriptionData.credits != null) {
              const parsed = Number(subscriptionData.credits);
              creditsValue = isNaN(parsed) ? 0 : parsed;
            }
            
            console.log('Orders page - Processed credits value:', creditsValue);
            
            const processedSubscription = {
              userId: subscriptionData.userId || subscriptionData.user_id,
              credits: creditsValue,
              freeTrialUsed: subscriptionData.freeTrialUsed ?? subscriptionData.free_trial_used ?? false,
              subscriptionPlanId: subscriptionData.subscriptionPlanId ?? subscriptionData.subscription_plan_id ?? null,
              subscriptionExpiresAt: subscriptionData.subscriptionExpiresAt ?? subscriptionData.subscription_expires_at ?? null,
            };
            
            console.log('Orders page - Setting subscription:', processedSubscription);
            setSubscription(processedSubscription);
          } else {
            console.error('Orders page - Failed to fetch subscription:', subscriptionResponse.status, subscriptionResponse.statusText);
            const errorData = await subscriptionResponse.json().catch(() => ({}));
            console.error('Orders page - Error details:', errorData);
          }

          // Fetch subscription orders history
          const ordersResponse = await fetch('/api/user/subscription-orders', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (ordersResponse.ok) {
            const ordersData = await ordersResponse.json();
            setOrders(ordersData);
          }
        } catch (error) {
          console.error('Error fetching data:', error);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <p className="text-gray-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-xl mx-auto bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold mb-4">{t('title')}</h1>
          <p className="text-gray-600 mb-4">{t('loginRequired')}</p>
          <Link
            href={`/${locale}/login`}
            className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            {t('goLogin')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
          <p className="text-gray-600">{t('subtitle')}</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-2">{t('accountInfo')}</h2>
          <p className="text-gray-700">{t('emailLabel', { email: user.email || '' })}</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">{t('orderInfo')}</h2>

          {!subscription && (
            <p className="text-gray-600">{t('ordersEmpty')}</p>
          )}

          {subscription && (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">{t('currentPlan')}</p>
                <p className="text-lg font-semibold">
                  {subscription.subscriptionPlanId
                    ? t('planId', { plan: subscription.subscriptionPlanId })
                    : t('noPlan')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('credits')}</p>
                <p className="text-lg font-semibold">{subscription.credits}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('freeTrial')}</p>
                <p className="text-lg font-semibold">
                  {subscription.freeTrialUsed ? t('freeTrialUsed') : t('freeTrialAvailable')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('expiresAt')}</p>
                <p className="text-lg font-semibold">
                  {subscription.subscriptionExpiresAt
                    ? new Date(subscription.subscriptionExpiresAt).toLocaleDateString()
                    : t('noExpire')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Order History */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">{t('orderHistory')}</h2>

          {orders.length === 0 ? (
            <p className="text-gray-600">{t('noOrderHistory')}</p>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{order.plan_name}</h3>
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            order.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : order.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : order.status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {order.status === 'completed'
                            ? t('status.completed')
                            : order.status === 'pending'
                            ? t('status.pending')
                            : order.status === 'failed'
                            ? t('status.failed')
                            : order.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">{t('planId')}:</span> {order.plan_id}
                        </div>
                        <div>
                          <span className="font-medium">{t('price')}:</span> ${order.price_usd}
                        </div>
                        <div>
                          <span className="font-medium">{t('credits')}:</span> {order.credits}
                        </div>
                        <div>
                          <span className="font-medium">{t('orderDate')}:</span>{' '}
                          {new Date(order.created_at).toLocaleString(
                            locale === 'zh' ? 'zh-CN' : 'en-US'
                          )}
                        </div>
                        {order.start_at && (
                          <div>
                            <span className="font-medium">{t('startDate')}:</span>{' '}
                            {new Date(order.start_at).toLocaleDateString(
                              locale === 'zh' ? 'zh-CN' : 'en-US'
                            )}
                          </div>
                        )}
                        {order.end_at && (
                          <div>
                            <span className="font-medium">{t('endDate')}:</span>{' '}
                            {new Date(order.end_at).toLocaleDateString(
                              locale === 'zh' ? 'zh-CN' : 'en-US'
                            )}
                          </div>
                        )}
                        {order.payment_reference && (
                          <div>
                            <span className="font-medium">{t('paymentReference')}:</span>{' '}
                            <span className="font-mono text-xs">{order.payment_reference}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 text-sm text-gray-600">
          <span>{t('goSubscriptionPrefix')}{' '}</span>
          <Link href={`/${locale}/subscription`} className="text-primary-600 underline">
            {t('goSubscription')}
          </Link>
        </div>
      </div>
    </div>
  );
}


