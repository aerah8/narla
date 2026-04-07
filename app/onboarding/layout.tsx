import Image from "next/image";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-50 dark:bg-none dark:bg-[#09090f]">
      {/* Header */}
      <header className="p-6">
        <Image
          src="/narla-logo.png"
          alt="narla"
          width={110}
          height={55}
          className="w-auto"
        />
      </header>

      {children}
    </div>
  );
}
