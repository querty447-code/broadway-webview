'use client';

import { ProductList } from './components/ProductList';
import type { SaleProduct } from './types';

type SaleScreenProps = {
  products: SaleProduct[];
};

export default function SaleScreen({ products }: SaleScreenProps) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="px-4 pb-4 pt-5">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--primary)]">Limited time</p>
        <h1 className="mt-1 text-2xl font-bold text-[var(--text-main)]">Sale</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {products.length} products · up to {Math.max(...products.map((item) => item.discountPercent), 0)}% off
        </p>
      </header>
      <ProductList products={products} />
    </div>
  );
}
