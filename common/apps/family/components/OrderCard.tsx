'use client';

import { useAuth } from "@/common/firebase/AuthProvider";
import { useToast } from "@/common/apps/family/hooks/useToast";
import { setOrderStatus } from "@/common/apps/family/lib/writes";
import SyncBadge from "@/common/apps/family/components/SyncBadge";
import { outlineBtn } from "@/common/apps/family/components/ui";
import type { Order, OrderStatus } from "@/common/apps/family/types";

const LABEL: Record<OrderStatus, string> = {
  ordered: "Ordered",
  delivered: "Delivered",
  return_requested: "Return requested",
  returned: "Returned",
  kept: "Kept",
};
const NEXT: Record<OrderStatus, { to: OrderStatus; label: string }[]> = {
  ordered: [{ to: "delivered", label: "Delivered" }],
  delivered: [{ to: "kept", label: "Keep" }, { to: "return_requested", label: "Return requested" }],
  return_requested: [{ to: "returned", label: "Returned" }],
  returned: [],
  kept: [],
};

export default function OrderStatusActions({ order }: { order: Order }) {
  const { user } = useAuth();
  const toast = useToast();
  const email = user?.email ?? "";
  return (
    <div className="card !p-4">
      <p>
        Order status: <span className="font-semibold" data-testid="order-status">{LABEL[order.status]}</span>
      </p>
      {NEXT[order.status].length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {NEXT[order.status].map((n) => (
            <button
              key={n.to}
              type="button"
              onClick={() => setOrderStatus(email, order, n.to).catch(() => toast.show({ message: "Could not save", error: true }))}
              className={outlineBtn}
            >
              {n.label}
            </button>
          ))}
        </div>
      )}
      <div className="mt-1"><SyncBadge doc={order} /></div>
    </div>
  );
}
