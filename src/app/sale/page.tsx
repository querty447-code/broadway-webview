import SaleScreen from '@/features/sale';
import { getSaleProducts } from '@/features/sale/data';

export default function SalePage() {
  const products = getSaleProducts();
  return <SaleScreen products={products} />;
}
