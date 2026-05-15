export function GifLoader({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const gifSize = size === "lg" ? "w-36 h-36" : size === "sm" ? "w-12 h-12" : "w-20 h-20";
  const containerH = size === "lg" ? "h-72" : size === "sm" ? "h-24" : "h-48";
  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className ?? containerH}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/loading.gif" alt="Loading" className={`${gifSize} object-contain`} />
      <p className="text-xs font-semibold text-text-tertiary animate-pulse tracking-wide">Loading…</p>
    </div>
  );
}
