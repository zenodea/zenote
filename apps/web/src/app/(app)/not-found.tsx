import Link from "next/link";
import { PageHeader } from "@/components/frame/PageHeader";
import { Text } from "@/components/ui/Text";

// Inside the group so a missing note or tag still renders within the sidebar
// and seams, the way it did when the chrome lived in the root layout.
export const metadata = { title: "Not found" };

export default function NotFound() {
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
