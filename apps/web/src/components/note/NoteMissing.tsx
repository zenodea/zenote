import { Scroller } from "@/components/ui/Scroller";
import { PageHeader } from "@/components/frame/PageHeader";

export function NoteMissing({ slug }: { slug: string }) {
  return (
    <>
      <PageHeader title="Not found" />
      <Scroller className="min-h-0 flex-1">
        <div className="mx-auto w-full max-w-3xl px-6 py-12">
          <p className="opacity-60">There is no note at “{slug}”.</p>
        </div>
      </Scroller>
    </>
  );
}
