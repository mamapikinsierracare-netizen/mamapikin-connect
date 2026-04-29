// src/app/referral-inbox/page.tsx
import ReferralInbox from '@/components/ReferralInbox';
import Navigation from '@/components/Navigation';

export default function ReferralInboxPage() {
  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <ReferralInbox />
      </div>
    </>
  );
}