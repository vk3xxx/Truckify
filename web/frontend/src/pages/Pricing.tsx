import { useState, useEffect } from 'react';
import { pricingApi, type SubscriptionTier, type UserSubscription } from '../api';
import { Check, Zap } from 'lucide-react';

export default function Pricing() {
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [currentSub, setCurrentSub] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [annual, setAnnual] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tiersRes, subRes] = await Promise.all([
        pricingApi.getSubscriptionTiers(),
        pricingApi.getMySubscription(),
      ]);
      setTiers(tiersRes.data.data || []);
      if ('tier_name' in subRes.data.data) {
        setCurrentSub(subRes.data.data as UserSubscription);
      }
    } catch (err) {
      console.error('Failed to load pricing:', err);
    }
    setLoading(false);
  };

  const handleSubscribe = async (tierId: string) => {
    try {
      const res = await pricingApi.createSubscriptionCheckout(
        tierId,
        annual,
        `${window.location.origin}/pricing?subscription=success`,
        `${window.location.origin}/pricing?subscription=cancelled`
      );
      window.location.href = res.data.data.checkout_url;
    } catch (err) {
      alert('Failed to start checkout');
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription?')) return;
    try {
      await pricingApi.cancelSubscription();
      setCurrentSub(null);
      loadData();
    } catch (err) {
      alert('Failed to cancel');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" /></div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Choose Your Plan</h1>
        <p className="text-gray-400 mb-6">Lower commission rates with higher tiers</p>
        
        <div className="inline-flex items-center bg-dark-800 rounded-lg p-1">
          <button
            onClick={() => setAnnual(false)}
            className={`px-4 py-2 rounded-lg transition-colors ${!annual ? 'bg-primary-500 text-white' : 'text-gray-400'}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`px-4 py-2 rounded-lg transition-colors ${annual ? 'bg-primary-500 text-white' : 'text-gray-400'}`}
          >
            Annual <span className="text-xs text-green-400 ml-1">Save 17%</span>
          </button>
        </div>
      </div>

      {currentSub && (
        <div className="card mb-8 border border-primary-500/50">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-400">Current Plan</p>
              <p className="text-xl font-bold capitalize">{currentSub.tier_name}</p>
              {currentSub.expires_at && (
                <p className="text-sm text-gray-400">Expires: {new Date(currentSub.expires_at).toLocaleDateString()}</p>
              )}
            </div>
            <button onClick={handleCancel} className="text-red-400 hover:text-red-300 text-sm">
              Cancel Subscription
            </button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {tiers.map((tier) => {
          const isCurrentTier = currentSub?.tier_name === tier.name;
          const price = annual ? tier.annual_price : tier.monthly_price;
          const period = annual ? '/year' : '/month';
          
          return (
            <div
              key={tier.id}
              className={`card relative ${tier.name === 'pro' ? 'border-2 border-primary-500' : ''} ${isCurrentTier ? 'ring-2 ring-green-500' : ''}`}
            >
              {tier.name === 'pro' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-500 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1">
                  <Zap className="h-3 w-3" /> Popular
                </div>
              )}
              
              <h3 className="text-xl font-bold capitalize mb-1">{tier.name}</h3>
              <p className="text-gray-400 text-sm mb-4">{tier.description}</p>
              
              <div className="mb-4">
                <span className="text-3xl font-bold">${price}</span>
                <span className="text-gray-400">{period}</span>
              </div>
              
              <div className="bg-dark-800 rounded-lg p-3 mb-4">
                <p className="text-sm text-gray-400">Commission Rate</p>
                <p className="text-2xl font-bold text-primary-400">{tier.base_commission_rate}%</p>
              </div>
              
              <ul className="space-y-2 mb-6">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-400" />
                    {feature}
                  </li>
                ))}
              </ul>
              
              {tier.name === 'free' ? (
                <button disabled className="w-full py-2 bg-dark-700 text-gray-400 rounded-lg">
                  {isCurrentTier ? 'Current Plan' : 'Default'}
                </button>
              ) : isCurrentTier ? (
                <button disabled className="w-full py-2 bg-green-500/20 text-green-400 rounded-lg">
                  Current Plan
                </button>
              ) : (
                <button
                  onClick={() => handleSubscribe(tier.id)}
                  className="w-full btn-primary"
                >
                  {currentSub ? 'Switch Plan' : 'Subscribe'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="card mt-8">
        <h3 className="text-lg font-semibold mb-4">Commission Discounts by Job Value</h3>
        <p className="text-gray-400 mb-4">Get additional discounts on larger jobs:</p>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-dark-800 rounded-lg p-4 text-center">
            <p className="text-gray-400 text-sm">Jobs under $500</p>
            <p className="text-xl font-bold">Base Rate</p>
          </div>
          <div className="bg-dark-800 rounded-lg p-4 text-center">
            <p className="text-gray-400 text-sm">Jobs $500 - $2,000</p>
            <p className="text-xl font-bold text-green-400">-1% discount</p>
          </div>
          <div className="bg-dark-800 rounded-lg p-4 text-center">
            <p className="text-gray-400 text-sm">Jobs over $2,000</p>
            <p className="text-xl font-bold text-green-400">-2% discount</p>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-4">
          Example: Pro subscriber ($299/mo) with a $3,000 job pays 7% - 2% = 5% commission ($150)
        </p>
      </div>
    </div>
  );
}
