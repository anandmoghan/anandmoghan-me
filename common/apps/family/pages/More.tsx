'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// The old "Settings and more" page; the Family tab in Settings holds its contents now.
export default function More() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/settings?app=family");
  }, [router]);
  return null;
}
