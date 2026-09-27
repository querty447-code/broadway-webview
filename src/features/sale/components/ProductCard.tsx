"use client";

import { useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { isReactNativeWebView, useRNBridge } from "@/lib/bridge";
import { formatPrice } from "../format";
import type { SaleProduct } from "../types";

type ProductCardProps = {
  product: SaleProduct;
};

function isNativeHost() {
  if (typeof window === "undefined") return false;
  if (isReactNativeWebView()) return true;
  return new URLSearchParams(window.location.search).get("rn") === "true";
}

export function ProductCard({ product }: ProductCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToCart } = useRNBridge();
  const query = searchParams.toString();
  const href = query ? `/sale/${product.id}?${query}` : `/sale/${product.id}`;
  const lastAddAt = useRef(0);

  function handleAddToCart() {
    const now = Date.now();
    if (now - lastAddAt.current < 400) return;
    lastAddAt.current = now;

    const item = {
      id: product.id,
      title: product.title,
      price: product.price,
      quantity: 1,
    };

    window.dispatchEvent(
      new CustomEvent("sale-debug-click", {
        detail: { action: "ADD_TO_CART", inWebView: isNativeHost(), item, at: now },
      }),
    );

    if (isNativeHost()) {
      addToCart(item);
      return;
    }

    router.push(href);
  }

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl bg-[var(--bg-card)]">
      <Link
        href={href}
        className="relative aspect-[4/5] w-full cursor-pointer overflow-hidden text-left"
        aria-label={`View ${product.title}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
        <span className="absolute left-2 top-2 rounded-full bg-[var(--primary)] px-2 py-0.5 text-[11px] font-semibold text-white">
          {product.discountPercent}% off
        </span>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
          {product.category}
        </p>
        <h2 className="line-clamp-2 text-sm font-medium text-[var(--text-main)]">{product.title}</h2>
        <div className="mt-auto flex items-baseline gap-2">
          <span className="text-sm font-semibold text-[var(--text-main)]">{formatPrice(product.price)}</span>
          <span className="text-xs text-[var(--text-muted)] line-through">
            {formatPrice(product.originalPrice)}
          </span>
        </div>
        <button
          type="button"
          className="mt-1 cursor-pointer rounded-xl bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-white active:opacity-80"
          onClick={handleAddToCart}
          onPointerUp={handleAddToCart}
        >
          Add to cart
        </button>
      </div>
    </article>
  );
}
