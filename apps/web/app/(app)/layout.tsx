import { AppShell } from "@/components/layout/app-shell";
import { Toaster } from "sonner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppShell>{children}</AppShell>
      <Toaster position="bottom-right" theme="dark" richColors />
    </>
  );
}
