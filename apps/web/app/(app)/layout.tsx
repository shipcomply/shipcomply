import { AppShell } from "@/components/layout/app-shell";
import { ApiWarmup } from "@/components/app/api-warmup";
import { Toaster } from "sonner";

// Authenticated pages depend on the Clerk session — they must render per-request,
// never be statically prerendered at build (which would validate the Clerk key
// against the build env and fail when only a placeholder/preview key is present).
export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppShell warmupBanner={<ApiWarmup />}>{children}</AppShell>
      <Toaster position="bottom-right" theme="dark" richColors />
    </>
  );
}
