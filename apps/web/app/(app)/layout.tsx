import { AppShell } from "@/components/layout/app-shell";
import { ApiWarmup } from "@/components/app/api-warmup";
import { Toaster } from "sonner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppShell warmupBanner={<ApiWarmup />}>{children}</AppShell>
      <Toaster position="bottom-right" theme="dark" richColors />
    </>
  );
}
