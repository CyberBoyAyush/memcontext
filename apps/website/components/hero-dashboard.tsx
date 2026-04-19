"use client";

import Image from "next/image";

/**
 * Hero dashboard showcase — flat rectangle, no tilt, no motion.
 *
 * Composition:
 *  - soft terracotta bloom sitting behind the frame
 *  - static multi-layer border: hairline outer + conic gradient ring + inner bevel
 *  - top specular sweep + subtle glass sheen
 *  - ground shadow anchors it to the page
 *  - tiny corner accent glows
 */
export function HeroDashboard() {
  return (
    <div className="relative w-full max-w-6xl mx-auto px-4 sm:px-6">
      {/* atmospheric bloom behind the frame — subtle accent wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center"
      >
        <div
          className="absolute w-[70%] h-[60%] rounded-full blur-[120px] opacity-40"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(232,97,60,0.18) 0%, rgba(232,97,60,0.05) 40%, transparent 70%)",
          }}
        />
      </div>

      <div className="relative mx-auto">
        {/* ground shadow — cast below */}
        <div
          aria-hidden
          className="absolute left-[6%] right-[6%] -bottom-8 h-16 rounded-[50%] blur-2xl opacity-70"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.35) 40%, transparent 75%)",
          }}
        />

        {/* STATIC AURORA RING — refined silver bevel with a whisper of accent */}
        <div
          aria-hidden
          className="absolute -inset-[1.5px] rounded-[20px] overflow-hidden"
          style={{
            WebkitMask:
              "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
            padding: "1.5px",
            opacity: 0.7,
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                "conic-gradient(from 210deg at 50% 50%, rgba(255,255,255,0.0) 0deg, rgba(255,255,255,0.35) 60deg, rgba(255,255,255,0.55) 90deg, rgba(232,97,60,0.35) 120deg, rgba(255,255,255,0.0) 180deg, rgba(255,255,255,0.0) 240deg, rgba(255,255,255,0.3) 280deg, rgba(255,255,255,0.0) 360deg)",
            }}
          />
        </div>

        {/* MAIN FRAME */}
        <div
          className="relative rounded-[18px] overflow-hidden border border-white/10 bg-[#0a0a0a]"
          style={{
            boxShadow: [
              "0 40px 120px -20px rgba(0,0,0,0.9)",
              "0 20px 60px -10px rgba(232,97,60,0.12)",
              "inset 0 1px 0 rgba(255,255,255,0.08)",
              "inset 0 0 0 1px rgba(255,255,255,0.03)",
            ].join(", "),
          }}
        >
          {/* top specular sweep — thin highlight along the top edge */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px z-10"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 20%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0.5) 80%, transparent 100%)",
            }}
          />
          {/* top glass sheen */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-24 z-10"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 100%)",
            }}
          />

          {/* inner hairline bevel */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[18px] z-10"
            style={{
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
            }}
          />

          {/* the image itself — unoptimized: Next's optimizer 400s on this
               large PNG, and the raw file is already reasonable at ~400KB */}
          <Image
            src="/dashboard.png"
            alt="MemContext dashboard"
            width={2826}
            height={1682}
            priority
            unoptimized
            className="block w-full h-auto select-none"
            draggable={false}
          />
        </div>

        {/* corner accent glows */}
        {/* <div
          aria-hidden
          className="pointer-events-none absolute -top-2 -left-2 w-4 h-4 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(232,97,60,0.9) 0%, rgba(232,97,60,0.2) 50%, transparent 80%)",
            filter: "blur(2px)",
          }}
        /> */}
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-2 -right-2 w-5 h-5 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(255,255,255,0.5) 0%, rgba(232,97,60,0.1) 50%, transparent 80%)",
            filter: "blur(3px)",
          }}
        />
      </div>
    </div>
  );
}
