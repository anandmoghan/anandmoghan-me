import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { standaloneMetadata, standaloneViewport } from "@/common/apps/standalone/metadata";
import { FamilyApp } from "@/common/apps/family/FamilyApp";
import { PageSkeleton } from "@/common/apps/shell/Skeleton";
import "./family.css";

// The family app (ported from personal-manager/web). Routing: one static page per screen, ids in
// the query string; see common/apps/family/router.tsx.

export const metadata: Metadata = standaloneMetadata("family");

export const viewport: Viewport = standaloneViewport("family");

// FamilyApp reads the query string, which a static export only has in the browser.
export default function FamilyLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <FamilyApp>{children}</FamilyApp>
    </Suspense>
  );
}
