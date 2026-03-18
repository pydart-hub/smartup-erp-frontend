"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { type Policy } from "./policies";

interface PolicyModalProps {
  policy: Policy;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PolicyModal({ policy, open, onOpenChange }: PolicyModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[95vw] max-w-2xl max-h-[85vh] bg-surface rounded-[16px] shadow-modal border border-border-light flex flex-col data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-light shrink-0">
            <Dialog.Title className="text-lg font-bold text-text-primary">
              {policy.title}
            </Dialog.Title>
            <Dialog.Close className="rounded-[8px] p-1.5 text-text-tertiary hover:text-text-primary hover:bg-app-bg transition-colors">
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>

          {/* Scrollable Body */}
          <div className="overflow-y-auto px-6 py-5 flex-1">
            <p className="text-xs text-text-tertiary mb-5">
              Last updated: {policy.lastUpdated}
            </p>

            <div className="space-y-5">
              {policy.sections.map((section) => (
                <div key={section.heading}>
                  <h3 className="text-sm font-semibold text-text-primary mb-1.5">
                    {section.heading}
                  </h3>
                  <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                    {section.content}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-border-light shrink-0">
            <p className="text-xs text-text-tertiary text-center">
              Smart Up Learning Ventures &bull; smartuplearningventures@gmail.com
            </p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
