"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * PO create is now handled via PurchaseOrderDialog on the main PO page.
 * Redirect legacy links to purchase-orders.
 */
export default function CreatePOPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/purchase-orders");
  }, [router]);
  return (
    <div className="flex items-center justify-center min-h-[200px] text-secondary-500">
      Redirecting to Purchase Orders...
    </div>
  );
}
