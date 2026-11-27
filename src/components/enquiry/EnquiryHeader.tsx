"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";

interface EnquiryHeaderProps {
  onBookDemo?: () => void;
  homeHref?: string;
}

export default function EnquiryHeader({
  onBookDemo,
  homeHref,
}: EnquiryHeaderProps) {
  const anchorPrefix = homeHref ? (homeHref === "/" ? "" : homeHref) : "";
  const logoHref = homeHref || "#";

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-lg border-b border-slate-200/70">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link href={logoHref} className="flex items-center gap-3 group focus:outline-none">
          <Image
            src="/smartup-logo-v2.png"
            alt="Smart Up"
            width={32}
            height={32}
            priority
            className="object-contain"
          />
          <div className="flex flex-col">
            <span className="text-sm font-black tracking-[0.06em] uppercase text-slate-900 leading-none">
              Smart Up
            </span>
            <span className="text-[11px] font-semibold text-[#5C34A4] mt-0.5 leading-none">
              CBSE Crash Course
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3 sm:gap-6">
          <nav className="flex items-center gap-3.5 sm:gap-6 text-xs font-semibold text-slate-600">
            <Link
              href={`${anchorPrefix}#plans`}
              className="hover:text-[#5C34A4] transition-colors"
            >
              Plans
            </Link>
            <Link
              href={`${anchorPrefix}#faq`}
              className="hover:text-[#5C34A4] transition-colors"
            >
              FAQ
            </Link>
          </nav>

          {onBookDemo ? (
            <button
              type="button"
              onClick={onBookDemo}
              className="px-3.5 sm:px-4 py-2 rounded-full bg-[#5C34A4] hover:bg-[#4B288A] text-white text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-[0.98] whitespace-nowrap"
            >
              Book Demo
            </button>
          ) : (
            <Link
              href={`${anchorPrefix}#register`}
              className="px-3.5 sm:px-4 py-2 rounded-full bg-[#5C34A4] hover:bg-[#4B288A] text-white text-xs font-bold shadow-xs transition-all active:scale-[0.98] whitespace-nowrap"
            >
              Book Demo
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
