"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Phone,
  MapPin,
  ChevronUp,
  Shield,
  Scale,
} from "lucide-react";
import { COMPANY_INFO, POLICIES } from "@/components/legal/policies";
import { PolicyModal } from "@/components/legal/PolicyModal";

const POLICY_KEYS = ["terms", "privacy", "refund", "cancellation", "shipping"] as const;

export function LoginFooter() {
  const [expanded, setExpanded] = useState(false);
  const [activePolicy, setActivePolicy] = useState<string | null>(null);

  return (
    <>
      <div className="relative z-10 pb-5 px-6">
        {/* Expandable business details */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-4 mb-3 space-y-3">
                {/* Business name + badge */}
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-[#5f2ea8]/20 flex items-center justify-center">
                    <Shield className="w-3 h-3 text-[#5f2ea8]" />
                  </div>
                  <p className="text-[12px] font-semibold text-slate-800">
                    {COMPANY_INFO.legalName}
                  </p>
                </div>

                {/* Address */}
                <div className="flex items-start gap-2">
                  <MapPin className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    {COMPANY_INFO.address}
                  </p>
                </div>

                {/* Contact row */}
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href={`mailto:${COMPANY_INFO.email}`}
                    className="inline-flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-[#5f2ea8] transition-colors"
                  >
                    <Mail className="w-3 h-3" />
                    {COMPANY_INFO.email}
                  </a>
                  <a
                    href={`tel:${COMPANY_INFO.phone}`}
                    className="inline-flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-[#5f2ea8] transition-colors"
                  >
                    <Phone className="w-3 h-3" />
                    {COMPANY_INFO.phone}
                  </a>
                </div>

                {/* Jurisdiction */}
                <div className="flex items-center gap-1.5">
                  <Scale className="w-3 h-3 text-slate-400 shrink-0" />
                  <p className="text-[10px] text-slate-500">
                    Jurisdiction: {COMPANY_INFO.jurisdiction}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Policy links row */}
        <div className="flex flex-wrap justify-center gap-x-1 gap-y-0.5 mb-2">
          {POLICY_KEYS.map((key, i) => (
            <span key={key} className="flex items-center">
              <button
                type="button"
                onClick={() => setActivePolicy(key)}
                className="text-[10px] text-slate-500 hover:text-[#5f2ea8] hover:underline transition-colors cursor-pointer"
              >
                {POLICIES[key].title}
              </button>
              {i < POLICY_KEYS.length - 1 && (
                <span className="text-slate-300 ml-1">&middot;</span>
              )}
            </span>
          ))}
        </div>

        {/* Bottom line with expand toggle */}
        <div className="flex items-center justify-center gap-2">
          <p className="text-slate-400 text-[10px]">
            &copy; {new Date().getFullYear()} {COMPANY_INFO.legalName}
          </p>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-0.5 text-[10px] text-slate-500 hover:text-[#5f2ea8] transition-colors"
          >
            <ChevronUp
              className={`w-3 h-3 transition-transform duration-300 ${expanded ? "" : "rotate-180"}`}
            />
            {expanded ? "Less" : "Info"}
          </button>
        </div>
      </div>

      {/* Policy modal */}
      {activePolicy && (
        <PolicyModal
          policy={POLICIES[activePolicy]}
          open={!!activePolicy}
          onOpenChange={(open) => {
            if (!open) setActivePolicy(null);
          }}
        />
      )}
    </>
  );
}
