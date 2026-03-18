"use client";

import { useState } from "react";
import { POLICIES } from "./policies";
import { PolicyModal } from "./PolicyModal";

const POLICY_KEYS = ["terms", "privacy", "refund", "cancellation", "shipping"] as const;

export function PolicyLinks() {
  const [activePolicy, setActivePolicy] = useState<string | null>(null);

  return (
    <>
      <div className="flex flex-wrap justify-center gap-x-1.5 gap-y-0.5">
        {POLICY_KEYS.map((key, i) => (
          <span key={key} className="flex items-center">
            <button
              type="button"
              onClick={() => setActivePolicy(key)}
              className="text-[11px] text-text-tertiary hover:text-primary hover:underline transition-colors cursor-pointer"
            >
              {POLICIES[key].title}
            </button>
            {i < POLICY_KEYS.length - 1 && (
              <span className="text-text-tertiary/30 ml-1.5">&middot;</span>
            )}
          </span>
        ))}
      </div>

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
