'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useRNBridge } from '@/lib/bridge';
import { formatPrice } from './format';
import type { SaleProduct } from './types';

type ProductDetailScreenProps = {
  product: SaleProduct;
};

export default function ProductDetailScreen({ product }: ProductDetailScreenProps) {
  const { addToCart } = useRNBridge();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const backHref = query ? `/sale?${query}` : '/sale';

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center gap-3 px-4 pb-3 pt-5">
        <Link href={backHref} className="text-sm font-medium text-[var(--primary)]">
          Back
        </Link>
      </header>

      <div className="px-4 pb-8">
        <div className="overflow-hidden rounded-2xl bg-[var(--bg-card)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.imageUrl}
            alt=""
            className="aspect-[4/5] w-full object-cover"
          />
        </div>

        <p className="mt-4 text-xs uppercase tracking-wide text-[var(--text-muted)]">{product.category}</p>
        <h1 className="mt-1 text-2xl font-bold text-[var(--text-main)]">{product.title}</h1>
        <p className="mt-2 text-sm text-[var(--primary)]">{product.discountPercent}% off</p>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-xl font-semibold text-[var(--text-main)]">{formatPrice(product.price)}</span>
          <span className="text-sm text-[var(--text-muted)] line-through">
            {formatPrice(product.originalPrice)}
          </span>
        </div>

        <button
          type="button"
          className="mt-6 w-full rounded-xl bg-[var(--primary)] px-4 py-3 text-base font-semibold text-white active:opacity-80"
          onClick={() =>
            addToCart({
              id: product.id,
              title: product.title,
              price: product.price,
              quantity: 1,
            })
          }
        >
          Add to cart
        </button>
      </div>
    </div>
  );
}
