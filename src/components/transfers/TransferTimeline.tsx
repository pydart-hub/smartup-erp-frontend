"use client";

interface TransferTimelineProps {
  log: string;
}

export function TransferTimeline({ log }: TransferTimelineProps) {
  if (!log) return <p className="text-sm text-text-tertiary">No execution log available.</p>;

  const lines = log.split("\n").filter(Boolean);

  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        const isStep = line.includes("Step ");
        const isWarning = line.includes("WARNING");
        const isError = line.includes("ERROR") || line.includes("FATAL");

        return (
          <div
            key={i}
            className={`text-xs font-mono py-1 px-2 rounded ${
              isError
                ? "bg-error-light text-error"
                : isWarning
                  ? "bg-warning-light text-warning"
                  : isStep
                    ? "text-text-primary font-medium"
                    : "text-text-secondary pl-4"
            }`}
          >
            {line}
          </div>
        );
      })}
    </div>
  );
}
