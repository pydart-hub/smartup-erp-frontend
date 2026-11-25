import React from "react";
import Image from "next/image";
import { CONTACT_INFO } from "@/data/enquiry-content";

export default function EnquiryFooter() {
  return (
    <footer className="bg-[#FAFAFC] text-slate-600 border-t border-slate-200/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-7 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2.5 text-center sm:text-left">
          <Image
            src="/smartup-logo-v2.png"
            alt="Smart Up"
            width={22}
            height={22}
            className="object-contain"
          />
          <span>
            <strong className="text-slate-900">
              {CONTACT_INFO.organization}
            </strong>{" "}
            · {CONTACT_INFO.location} ·{" "}
            <a
              href={CONTACT_INFO.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[#5C34A4] transition-colors"
            >
              {CONTACT_INFO.websiteLabel}
            </a>
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 text-slate-500">
          <span>WhatsApp: {CONTACT_INFO.whatsappDisplay}</span>
          <span>·</span>
          <a
            href={`mailto:${CONTACT_INFO.email}`}
            className="hover:text-[#5C34A4] transition-colors"
          >
            {CONTACT_INFO.email}
          </a>
        </div>
      </div>
    </footer>
  );
}
