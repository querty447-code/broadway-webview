import type { SaleProduct } from '../types';
import { ProductCard } from './ProductCard';

type ProductListProps = {
  products: SaleProduct[];
};

export function ProductList({ products }: ProductListProps) {
  if (products.length === 0) {
    return <p className="px-4 py-10 text-center text-sm text-[var(--text-muted)]">No sale products right now.</p>;
  }

  return (
    <ul className="grid grid-cols-2 gap-3 px-4 pb-6">
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}
