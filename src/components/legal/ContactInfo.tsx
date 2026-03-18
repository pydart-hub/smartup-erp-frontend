"use client";

import { Mail, MapPin, Phone } from "lucide-react";
import { COMPANY_INFO } from "./policies";

export function ContactInfo() {
  return (
    <div className="text-center space-y-1.5">
      <p className="text-xs font-semibold text-text-primary">
        {COMPANY_INFO.legalName}
      </p>

      <p className="text-[11px] text-text-tertiary leading-relaxed flex items-start justify-center gap-1.5">
        <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
        <span className="text-left">{COMPANY_INFO.address}</span>
      </p>

      <div className="flex items-center justify-center gap-3 text-[11px] text-text-secondary flex-wrap">
        <a
          href={`mailto:${COMPANY_INFO.email}`}
          className="inline-flex items-center gap-1 hover:text-primary transition-colors"
        >
          <Mail className="w-3 h-3" />
          {COMPANY_INFO.email}
        </a>
        <span className="text-text-tertiary/30">|</span>
        <a
          href={`tel:${COMPANY_INFO.phone}`}
          className="inline-flex items-center gap-1 hover:text-primary transition-colors"
        >
          <Phone className="w-3 h-3" />
          {COMPANY_INFO.phone}
        </a>
      </div>

      <p className="text-[11px] text-text-tertiary">
        GST: <span className="font-mono">{COMPANY_INFO.gst}</span>
      </p>
    </div>
  );
}
