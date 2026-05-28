import { SignIn } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-bg-0 flex items-center justify-center">
      <div className="w-full max-w-md px-6">
        <div className="text-center mb-8">
          <span className="text-mint-9 font-bold text-2xl">ShipComply</span>
          <p className="text-bg-8 text-sm mt-2">Sign in to your account</p>
        </div>
        <SignIn
          forceRedirectUrl="/dashboard"
          signUpForceRedirectUrl="/dashboard"
          appearance={{
            baseTheme: dark,
            variables: {
              colorPrimary: "#63ffb5",
              colorBackground: "#1a1a26",
              colorInputBackground: "#2a2a38",
              colorText: "#f0f0fa",
              colorTextSecondary: "#84849c",
              colorDanger: "#ef4444",
              colorSuccess: "#22c55e",
              colorWarning: "#f59e0b",
              colorNeutral: "#62627a",
              fontFamily: "var(--font-inter), system-ui, sans-serif",
              fontSize: "14px",
              borderRadius: "0.75rem",
            },
            elements: {
              rootBox: "w-full",
              card: "bg-bg-1 border border-bg-4 shadow-glow-sm rounded-xl",
              headerTitle: "text-bg-11 font-semibold",
              headerSubtitle: "text-bg-8",
              socialButtonsBlockButton: "bg-bg-2 border border-bg-5 hover:bg-bg-3 text-bg-11",
              socialButtonsBlockButtonText: "text-bg-11 font-medium",
              dividerLine: "bg-bg-4",
              dividerText: "text-bg-7",
              formFieldLabel: "text-bg-9",
              formFieldInput: "bg-bg-3 border-bg-5 text-bg-11 placeholder:text-bg-7",
              formButtonPrimary: "bg-mint-9 hover:bg-mint-11 text-bg-0 font-medium normal-case shadow-glow-sm",
              footerActionLink: "text-mint-9 hover:text-mint-11",
              footerActionText: "text-bg-8",
              identityPreviewText: "text-bg-11",
              identityPreviewEditButton: "text-mint-9",
              formFieldSuccessText: "text-success",
              formFieldErrorText: "text-danger",
              alertText: "text-bg-9",
              formResendCodeLink: "text-mint-9 hover:text-mint-11",
            },
          }}
        />
      </div>
    </div>
  );
}
