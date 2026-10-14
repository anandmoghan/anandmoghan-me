'use client';

import { formatMoney } from "@/common/apps/family/lib/format";
import { discountPercent } from "@/common/apps/family/lib/shop";
import type { Money } from "@/common/apps/family/types";

export default function Price({ price, mrp, large = false }: { price?: Money; mrp?: number; large?: boolean }) {
  if (!price) return null;
  const off = discountPercent(mrp, price.amount);
  return (
    <p className={["flex flex-wrap items-baseline gap-x-1.5", large ? "text-xl" : "text-sm"].join(" ")}>
      <span className="font-bold">{formatMoney(price.amount, price.currency)}</span>
      {off !== null && mrp && (
        <>
          <span className={["text-muted line-through", large ? "text-base" : "text-[0.8rem]"].join(" ")}>{formatMoney(mrp, price.currency)}</span>
          <span className={["font-semibold text-gold", large ? "text-base" : "text-[0.8rem]"].join(" ")}>{off}% off</span>
        </>
      )}
    </p>
  );
}
