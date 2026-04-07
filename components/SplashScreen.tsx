"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatedBackground } from "@/components/AnimatedBackground";

export function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const shown = sessionStorage.getItem("narla_splash_shown");
    if (!shown) setVisible(true);
  }, []);

  const dismiss = () => {
    setFading(true);
    setTimeout(() => {
      sessionStorage.setItem("narla_splash_shown", "1");
      setVisible(false);
    }, 500);
  };

  if (!visible) return null;

  return (
    <div
      onClick={dismiss}
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center cursor-pointer transition-opacity duration-500 ${fading ? "opacity-0" : "opacity-100"}`}
    >
      <AnimatedBackground />
      <Image
        src="/narla-logo.png"
        alt="narla — The Apartment Co-Pilot"
        width={600}
        height={300}
        className="w-auto max-w-[70vw] md:max-w-[50vw]"
        priority
      />
      <p className="absolute bottom-10 text-white/40 text-sm tracking-widest">
        Tap to skip
      </p>
    </div>
  );
}
