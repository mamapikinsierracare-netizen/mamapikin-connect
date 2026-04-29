'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ReferralViewContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [patientData, setPatientData] = useState(null);

  // your existing data fetching logic here
  return (
    <div>
      {/* your existing JSX */}
    </div>
  );
}