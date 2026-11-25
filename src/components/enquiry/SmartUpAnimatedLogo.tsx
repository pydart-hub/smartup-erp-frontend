"use client";

import React, { useState, useSyncExternalStore } from "react";
import Image from "next/image";

interface SmartUpAnimatedLogoProps {
  size?: number;
  className?: string;
  alt?: string;
}

const emptySubscribe = () => () => {};

function getClientStaticPreference(): boolean {
  if (typeof window === "undefined") return false;
  const reducedMotion =
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  const ua = navigator.userAgent;
  const isSafariOnly =
    /Safari/i.test(ua) && !/Chrome|Chromium|Edg|Android/i.test(ua);
  return reducedMotion || isSafariOnly;
}

/**
 * Renders the animated SmartUp WebM logo with automatic fallback to
 * smartup-logo-v2.png for browsers without alpha-WebM support or reduced motion.
 */
export default function SmartUpAnimatedLogo({
  size = 64,
  className = "",
  alt = "Smart Up",
}: SmartUpAnimatedLogoProps) {
  const [videoFailed, setVideoFailed] = useState(false);
  const preferStatic = useSyncExternalStore(
    emptySubscribe,
    getClientStaticPreference,
    () => false
  );

  if (videoFailed || preferStatic) {
    return (
      <Image
        src="/smartup-logo-v2.png"
        alt={alt}
        width={size}
        height={size}
        className={`object-contain ${className}`}
      />
    );
  }

  return (
    <video
      src="/Logo Icon LOOK ALPHA.webm"
      poster="/smartup-logo-v2.png"
      autoPlay
      loop
      muted
      playsInline
      width={size}
      height={size}
      aria-label={alt}
      onError={() => setVideoFailed(true)}
      className={`object-contain pointer-events-none select-none ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
