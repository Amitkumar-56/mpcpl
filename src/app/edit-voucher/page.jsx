'use client';

import { Suspense } from 'react';
import EditVoucherContent from './content';

export default function EditVoucher() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EditVoucherContent />
    </Suspense>
  );
}

