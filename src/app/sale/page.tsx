import { Suspense } from 'react';
import SaleScreen from '@/features/sale';
import { getSaleProducts } from '@/features/sale/data';

export default function SalePage() {
  const products = getSaleProducts();
  return (
    <Suspense fallback={null}>
      <SaleScreen products={products} />
    </Suspense>
  );
}
