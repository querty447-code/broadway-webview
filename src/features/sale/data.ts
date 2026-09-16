import type { SaleProduct } from './types';

export function getSaleProducts(): SaleProduct[] {
  return [
    {
      id: 'sale-tee-01',
      title: 'Oversized Graphic Tee',
      category: 'Apparel',
      price: 799,
      originalPrice: 1499,
      discountPercent: 47,
      imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=750&fit=crop',
    },
    {
      id: 'sale-sneaker-02',
      title: 'Retro Court Sneakers',
      category: 'Footwear',
      price: 2499,
      originalPrice: 4299,
      discountPercent: 42,
      imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=750&fit=crop',
    },
    {
      id: 'sale-denim-03',
      title: 'Relaxed Fit Denim',
      category: 'Apparel',
      price: 1899,
      originalPrice: 3299,
      discountPercent: 42,
      imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&h=750&fit=crop',
    },
    {
      id: 'sale-bag-04',
      title: 'Mini Crossbody Bag',
      category: 'Accessories',
      price: 1299,
      originalPrice: 2199,
      discountPercent: 41,
      imageUrl: 'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=600&h=750&fit=crop',
    },
    {
      id: 'sale-watch-05',
      title: 'Minimal Steel Watch',
      category: 'Accessories',
      price: 3499,
      originalPrice: 5999,
      discountPercent: 42,
      imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=750&fit=crop',
    },
    {
      id: 'sale-hoodie-06',
      title: 'Fleece Zip Hoodie',
      category: 'Apparel',
      price: 1599,
      originalPrice: 2799,
      discountPercent: 43,
      imageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&h=750&fit=crop',
    },
    {
      id: 'sale-cap-07',
      title: 'Washed Cotton Cap',
      category: 'Accessories',
      price: 499,
      originalPrice: 899,
      discountPercent: 44,
      imageUrl: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600&h=750&fit=crop',
    },
    {
      id: 'sale-boot-08',
      title: 'Chunky Chelsea Boots',
      category: 'Footwear',
      price: 2999,
      originalPrice: 4999,
      discountPercent: 40,
      imageUrl: 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=600&h=750&fit=crop',
    },
  ];
}

export function getSaleProductById(id: string): SaleProduct | undefined {
  return getSaleProducts().find((product) => product.id === id);
}

