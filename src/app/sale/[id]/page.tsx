import { notFound } from 'next/navigation';
import ProductDetailScreen from '@/features/sale/ProductDetailScreen';
import { getSaleProductById, getSaleProducts } from '@/features/sale/data';

type PageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return getSaleProducts().map((product) => ({ id: product.id }));
}

export default async function SaleProductPage({ params }: PageProps) {
  const { id } = await params;
  const product = getSaleProductById(id);

  if (!product) {
    notFound();
  }

  return <ProductDetailScreen product={product} />;
}
