import { Suspense } from 'react';
import ReferralViewContent from './ReferralViewContent';

export async function generateStaticParams() {
  return [];
}

export default function ReferralViewPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <ReferralViewContent />
    </Suspense>
  );
}