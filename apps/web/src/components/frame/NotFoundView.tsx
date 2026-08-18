"use client";

import Link from "next/link";
import { PageHeader } from "@/components/frame/PageHeader";
import { Text } from "@/components/ui/Text";
import { useTitle } from "@/hooks/use-title";

export function NotFoundView() {
  useTitle("Not found");

  return (
    <>
      <PageHeader title="Not found" />
      <div className="flex min-h-0 flex-1 items-center justify-center px-6">
        <Text variant="muted">
          That note doesn’t exist.{" "}
          <Link href="/" className="underline hover:opacity-70">
            Back to your vault
          </Link>
        </Text>
      </div>
    </>
  );
}
