// Clerk <SignIn>/<SignUp> validate the publishable key when rendered. Force these
// auth pages to render per-request so `next build` never prerenders them against a
// placeholder/preview key (which throws "invalid publishableKey" and fails the build).
export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
