"use client";

import { useEffect, useRef, useState } from "react";
import { Play, VolumeX } from "lucide-react";
import { useInView } from "@/lib/use-in-view";

const VIDEO_SRC =
  "https://res.cloudinary.com/dyetf2h9n/video/upload/f_auto,q_auto:best,vc_auto,w_1280,c_limit/v1773218523/memcontext-video_wfwewo.mp4";
const POSTER_SRC =
  "https://res.cloudinary.com/dyetf2h9n/video/upload/so_1,f_auto,q_auto,w_1280,c_limit/v1773218523/memcontext-video_wfwewo.jpg";

export function LaunchVideo() {
  const { ref: sectionRef, isInView } = useInView<HTMLElement>({
    threshold: 0.35,
    rootMargin: "100px 0px",
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isMuted, setIsMuted] = useState(true);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isInView) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isInView]);

  return (
    <section
      ref={sectionRef}
      id="launch-video"
      className="py-20 sm:py-28 px-4 sm:px-6"
      aria-label="Product demo video"
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center mb-10 sm:mb-14">
          {/* Glowing badge pill — matches features/how-it-works */}
          {/* <div className="flex justify-center mb-6">
            <div className="group relative">
              <div
                className="absolute -top-px -left-px w-16 h-9 rounded-full blur-[1px]"
                style={{
                  background:
                    "radial-gradient(ellipse at top left, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.2) 30%, transparent 70%)",
                }}
              />
              <div
                className="absolute -bottom-px -right-px w-16 h-9 rounded-full blur-[1px]"
                style={{
                  background:
                    "radial-gradient(ellipse at bottom right, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.15) 30%, transparent 70%)",
                }}
              />
              <div className="absolute -inset-0.5 rounded-full border border-white/10" />
              <div className="relative inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface/95 backdrop-blur-sm">
                <div className="absolute top-0 left-0 w-16 h-10 bg-white/5 rounded-full blur-xl -translate-x-1/3 -translate-y-1/2" />
                <div className="absolute bottom-0 right-0 w-16 h-10 bg-white/5 rounded-full blur-xl translate-x-1/3 translate-y-1/2" />
                <Play className="relative z-10 w-3.5 h-3.5 text-accent" />
                <span className="relative z-10 text-xs sm:text-sm text-foreground font-medium">
                  See It In Action
                </span>
              </div>
            </div>
          </div> */}

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-4 tracking-tight leading-[1.1]">
            Watch how it works
          </h2>
          <p className="text-base sm:text-lg text-foreground-muted max-w-2xl mx-auto">
            From setup to first memory — see MemContext in action with your
            favourite AI coding agent.
          </p>
        </div>

        {/* Video Container */}
        <div className="relative">
          {/* Top-center unmute button (hidden after unmute) */}
          {isMuted && (
            <button
              type="button"
              onClick={toggleMute}
              aria-label="Unmute video"
              className="absolute left-1/2 -translate-x-1/2 -top-4 z-30 group cursor-pointer"
            >
              <div className="absolute -inset-0.5 rounded-xl border border-white/8" />
              <div className="relative flex items-center gap-2 px-4 py-2 rounded-xl bg-surface/70 backdrop-blur-sm border border-white/[0.1] transition-all group-hover:border-white/20 group-hover:bg-surface/85">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/[0.04] via-transparent to-transparent" />
                <VolumeX className="w-4 h-4 text-foreground-muted relative z-10" />
                <span className="text-sm text-foreground font-display font-semibold relative z-10">
                  Unmute
                </span>
              </div>
            </button>
          )}

          {/* Border glow — top-left */}
          <div
            className="absolute -top-px -left-px w-28 h-20 rounded-2xl pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at top left, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.15) 30%, transparent 70%)",
            }}
          />
          {/* Border glow — bottom-right */}
          <div
            className="absolute -bottom-px -right-px w-28 h-20 rounded-2xl pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at bottom right, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 30%, transparent 70%)",
            }}
          />

          {/* Outer subtle border */}
          <div className="absolute -inset-px rounded-2xl border border-white/[0.08] pointer-events-none" />

          {/* Glass card */}
          <div className="relative rounded-2xl bg-surface/60 backdrop-blur-md border border-white/[0.08] shadow-xl shadow-black/30 overflow-hidden">
            {/* Inner glow overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-transparent rounded-2xl pointer-events-none z-10" />

            {/* Aspect-ratio wrapper */}
            <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
              {isInView ? (
                <video
                  ref={videoRef}
                  className="absolute inset-0 w-full h-full object-cover"
                  poster={POSTER_SRC}
                  preload="metadata"
                  autoPlay
                  loop
                  playsInline
                  controls
                  controlsList="nodownload noplaybackrate noremoteplayback"
                  muted
                  disablePictureInPicture
                  disableRemotePlayback
                  onContextMenu={(e) => e.preventDefault()}
                  onVolumeChange={(e) => {
                    setIsMuted(e.currentTarget.muted);
                  }}
                  // title="MemContext product demo"
                  // aria-label="MemContext product demo video showing setup and usage"
                >
                  <source src={VIDEO_SRC} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              ) : (
                /* Poster placeholder while out of viewport */
                <div className="absolute inset-0 bg-surface-elevated flex items-center justify-center">
                  <Play className="w-12 h-12 text-foreground-subtle/40" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
