"use client";

import React from "react";

export default function Background3D() {
  return (
    <div className="absolute inset-0 -z-10 bg-gradient-to-tr from-slate-50 via-purple-50/30 to-indigo-50/40 overflow-hidden">
      {/* Background Gradient Orbs */}
      <div className="absolute -top-12 -left-12 w-[400px] h-[400px] bg-purple-300/20 rounded-full blur-[120px]" />
      <div className="absolute -bottom-12 -right-12 w-[500px] h-[500px] bg-indigo-300/15 rounded-full blur-[150px]" />
      
      {/* SmartUp Brand Alpha WebM Video - Positioned as a subtle watermark between text and card */}
      <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 md:left-[35%] md:translate-x-0 w-full max-w-[450px] md:max-w-[500px] aspect-square flex items-center justify-center opacity-25 md:opacity-35 pointer-events-none select-none p-4">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-contain"
        >
          <source src="/logo-look.webm" type="video/webm" />
        </video>
      </div>
    </div>
  );
}
