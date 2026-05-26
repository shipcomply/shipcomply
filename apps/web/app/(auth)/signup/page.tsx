import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-bg-0 flex items-center justify-center">
      <div className="w-full max-w-md px-6">
        <div className="text-center mb-8">
          <span className="text-mint-9 font-bold text-2xl">ShipComply</span>
          <p className="text-bg-8 text-sm mt-2">Create your free account</p>
        </div>
        <SignUp
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "bg-bg-2 border border-bg-5 shadow-none rounded-xl",
              headerTitle: "text-bg-11",
              headerSubtitle: "text-bg-8",
              formButtonPrimary: "bg-mint-9 text-bg-0 hover:bg-mint-11",
              formFieldInput: "bg-bg-3 border-bg-5 text-bg-11",
              formFieldLabel: "text-bg-9",
              footerActionLink: "text-mint-9 hover:text-mint-11",
            },
          }}
        />
      </div>
    </div>
  );
}
