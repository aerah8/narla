import { SignIn } from "@clerk/nextjs";
import Image from "next/image";
import { AnimatedBackground } from "@/components/AnimatedBackground";

const clerkAppearance = {
  elements: {
    rootBox: "w-full max-w-md",
    card: "!bg-white/10 !backdrop-blur-xl !border !border-white/15 !shadow-2xl !rounded-2xl !overflow-hidden",
    footer: "!bg-black/30 !backdrop-blur-xl !border-t !border-white/10",
    footerPages: "!bg-transparent",
    headerTitle: "!text-white !text-2xl !font-semibold",
    headerSubtitle: "!text-white/60",
    formFieldLabel: "!text-white/80",
    formFieldInput:
      "!bg-white/10 !border-white/20 !text-white !rounded-xl placeholder:!text-white/30",
    formButtonPrimary:
      "!bg-white/20 hover:!bg-white/30 !text-white !border !border-white/30 !shadow-none !rounded-xl",
    footerActionLink: "!text-pink-300 hover:!text-pink-200",
    footerActionText: "!text-white/50",
    dividerLine: "!bg-white/20",
    dividerText: "!text-white/40",
    socialButtonsBlockButton:
      "!bg-white/10 !border-white/20 !text-white hover:!bg-white/15 !rounded-xl",
    socialButtonsBlockButtonText: "!text-white",
    identityPreviewText: "!text-white",
    formFieldInputShowPasswordButton: "!text-white/50",
    otpCodeFieldInput: "!bg-white/10 !border-white/20 !text-white",
    alertText: "!text-red-300",
  },
  variables: {
    colorBackground: "rgba(255,255,255,0.05)",
    colorText: "white",
    colorTextSecondary: "rgba(255,255,255,0.6)",
    colorInputBackground: "rgba(255,255,255,0.08)",
    colorInputText: "white",
    colorPrimary: "#e879a0",
    borderRadius: "12px",
  },
};

export default function SignInPage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4">
      <AnimatedBackground />
      <div className="mb-8 relative z-10">
        <Image
          src="/narla-logo.png"
          alt="narla"
          width={180}
          height={90}
          className="w-auto"
          priority
        />
      </div>
      <div className="relative z-10">
        <SignIn appearance={clerkAppearance} />
      </div>
    </div>
  );
}
