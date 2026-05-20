"use client";

import { useRef, Suspense, useMemo, type ComponentType } from "react";
import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { GraduationCap, Briefcase, ChevronRight, Sparkles } from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Stars } from "@react-three/drei";
import * as THREE from "three";

// ─── Logo palette ─────────────────────────────────────────────────────────────
const TEAL   = "#1A9E8F";
const GREEN  = "#82C35B";
const AQUA   = "#2DD4BF";
const DARK   = "#050e1d";
const DARK2  = "#071422";

// ─── Glowing distorted blob ───────────────────────────────────────────────────
function Blob({
  position,
  color,
  scale = 1,
  speed = 1,
  distort = 0.38,
}: {
  position: [number, number, number];
  color: string;
  scale?: number;
  speed?: number;
  distort?: number;
}) {
  return (
    <Float speed={speed * 2.2} rotationIntensity={0.4} floatIntensity={1.8}>
      <mesh position={position} scale={scale}>
        <sphereGeometry args={[1, 64, 64]} />
        <MeshDistortMaterial
          color={color}
          distort={distort}
          speed={3}
          roughness={0}
          metalness={0.4}
          transparent
          opacity={0.55}
        />
      </mesh>
    </Float>
  );
}

// ─── Spinning torus ring ──────────────────────────────────────────────────────
function Ring({
  position,
  color = TEAL,
  rx = 0.08,
  rz = 0.06,
}: {
  position: [number, number, number];
  color?: string;
  rx?: number;
  rz?: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (!ref.current) return;
    ref.current.rotation.x = Math.PI / 3.5 + s.clock.elapsedTime * rx;
    ref.current.rotation.z = s.clock.elapsedTime * rz;
  });
  return (
    <mesh ref={ref} position={position}>
      <torusGeometry args={[1.3, 0.055, 16, 100]} />
      <meshStandardMaterial color={color} transparent opacity={0.28} />
    </mesh>
  );
}

// ─── Rotating icosahedron wireframe ──────────────────────────────────────────
function Ico({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (!ref.current) return;
    ref.current.rotation.y = s.clock.elapsedTime * 0.22;
    ref.current.rotation.x = s.clock.elapsedTime * 0.14;
  });
  return (
    <Float speed={1.4} floatIntensity={1}>
      <mesh ref={ref} position={position}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color={GREEN} wireframe transparent opacity={0.22} />
      </mesh>
    </Float>
  );
}

// ─── Particle cloud ───────────────────────────────────────────────────────────
function Particles({ count = 320 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3]     = (Math.random() - 0.5) * 28;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 18;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 14;
    }
    return arr;
  }, [count]);

  useFrame((s) => {
    if (ref.current) {
      ref.current.rotation.y = s.clock.elapsedTime * 0.018;
      ref.current.rotation.x = s.clock.elapsedTime * 0.008;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.07} color={AQUA} transparent opacity={0.55} sizeAttenuation />
    </points>
  );
}

// ─── Full 3-D scene ───────────────────────────────────────────────────────────
function Scene() {
  return (
    <>
      <ambientLight intensity={0.25} />
      <pointLight position={[8, 8, 8]}   intensity={2.2} color={TEAL}  />
      <pointLight position={[-8, -4, 4]} intensity={1.6} color={GREEN} />
      <pointLight position={[0, -8, -4]} intensity={0.8} color={AQUA}  />

      <Blob position={[-5.5, 0.5, -3]}   color={TEAL}  scale={2.8} speed={0.55} distort={0.32} />
      <Blob position={[5.5, 1.5, -5]}    color={GREEN} scale={2.2} speed={0.9}  distort={0.28} />
      <Blob position={[0.5, -3.5, -4.5]} color={AQUA}  scale={1.4} speed={1.3}  distort={0.48} />

      <Ring position={[4.5, -1.5, -5]} color={TEAL}  rx={0.07} rz={0.05} />
      <Ring position={[-3.5, 2.5, -7]} color={GREEN} rx={0.05} rz={0.04} />
      <Ring position={[0,  3,   -8]}   color={AQUA}  rx={0.06} rz={0.07} />

      <Ico position={[3, 3, -5]} />
      <Ico position={[-4, -2, -6]} />

      <Particles count={320} />
      <Stars radius={60} depth={40} count={800} factor={1.8} saturation={0} fade speed={0.6} />
    </>
  );
}

// ─── 3-D tilt card ────────────────────────────────────────────────────────────
function TiltCard({
  href,
  label,
  description,
  icon: Icon,
  gradientFrom,
  gradientTo,
  delay,
  badge,
}: {
  href: string;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  gradientFrom: string;
  gradientTo: string;
  delay: number;
  badge: string;
}) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 260, damping: 28 });
  const sy = useSpring(my, { stiffness: 260, damping: 28 });
  const rotX = useTransform(sy, [-0.5, 0.5], ["14deg", "-14deg"]);
  const rotY = useTransform(sx, [-0.5, 0.5], ["-14deg", "14deg"]);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - (r.left + r.width  / 2)) / r.width);
    my.set((e.clientY - (r.top  + r.height / 2)) / r.height);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      style={{ perspective: "900px" }}
    >
      <motion.div
        style={{ rotateX: rotX, rotateY: rotY, transformStyle: "preserve-3d" }}
        onMouseMove={onMove}
        onMouseLeave={() => { mx.set(0); my.set(0); }}
      >
        <Link href={href} className="block group">
          {/* Gradient border shell */}
          <div
            className="relative rounded-2xl p-[2px] transition-all duration-500"
            style={{
              background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
              boxShadow: `0 8px 40px 0 ${gradientFrom}33`,
            }}
          >
            {/* Inner card */}
            <div className="relative overflow-hidden rounded-[14px] bg-white/95 dark:bg-[#0c1829]/95 backdrop-blur-xl p-6 h-full">

              {/* Soft background glow */}
              <div
                className="pointer-events-none absolute -top-16 -right-16 h-44 w-44 rounded-full blur-3xl opacity-15 transition-opacity duration-500 group-hover:opacity-30"
                style={{ background: `radial-gradient(circle, ${gradientFrom}, ${gradientTo})` }}
              />

              {/* Badge */}
              <div
                className="mb-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white"
                style={{ background: `linear-gradient(90deg, ${gradientFrom}, ${gradientTo})` }}
              >
                <Sparkles className="h-2.5 w-2.5" />
                {badge}
              </div>

              {/* Icon */}
              <div style={{ transform: "translateZ(24px)" }} className="relative z-10 mb-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl"
                  style={{ background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` }}
                >
                  <Icon className="h-8 w-8 text-white drop-shadow" />
                </div>
              </div>

              {/* Text */}
              <div style={{ transform: "translateZ(16px)" }} className="relative z-10">
                <h3 className="text-xl font-bold text-text-primary">{label}</h3>
                <p className="mt-1.5 text-sm text-text-secondary leading-relaxed">{description}</p>
              </div>

              {/* CTA */}
              <div
                style={{ transform: "translateZ(10px)" }}
                className="relative z-10 mt-5 flex items-center gap-1.5"
              >
                <span
                  className="text-sm font-semibold bg-clip-text text-transparent"
                  style={{ backgroundImage: `linear-gradient(90deg, ${gradientFrom}, ${gradientTo})` }}
                >
                  View Report
                </span>
                <motion.div
                  className="group-hover:translate-x-1 transition-transform duration-300"
                >
                  <ChevronRight className="h-4 w-4" style={{ color: gradientFrom }} />
                </motion.div>
              </div>

              {/* Bottom shimmer line */}
              <div
                className="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `linear-gradient(90deg, transparent, ${gradientFrom}, ${gradientTo}, transparent)` }}
              />
            </div>
          </div>
        </Link>
      </motion.div>
    </motion.div>
  );
}

// ─── Options ──────────────────────────────────────────────────────────────────
const OPTIONS = [
  {
    label: "Students",
    description: "View and analyze student attendance across all branches and class batches",
    href: "/dashboard/director/attendance/students",
    icon: GraduationCap,
    gradientFrom: TEAL,
    gradientTo: AQUA,
    badge: "All Branches",
    delay: 0.35,
  },
  {
    label: "Staff",
    description: "Monitor and track staff attendance records across all branches",
    href: "/dashboard/director/attendance/staff",
    icon: Briefcase,
    gradientFrom: GREEN,
    gradientTo: TEAL,
    badge: "All Staff",
    delay: 0.5,
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DirectorAttendancePage() {
  return (
    <div className="space-y-6 -mt-2">
      <BreadcrumbNav />

      {/* ── 3D Hero Banner ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-2xl"
        style={{ height: 300 }}
      >
        {/* Three.js canvas */}
        <div className="absolute inset-0">
          <Canvas
            camera={{ position: [0, 0, 9], fov: 58 }}
            gl={{ antialias: true, alpha: false }}
            dpr={[1, 1.5]}
          >
            <color attach="background" args={[DARK]} />
            <Suspense fallback={null}>
              <Scene />
            </Suspense>
          </Canvas>
        </div>

        {/* Gradient overlays for depth */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#050e1d]/85 via-[#050e1d]/30 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#050e1d]/70 via-transparent to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#050e1d]/30 via-transparent to-transparent" />

        {/* Heading */}
        <div className="absolute inset-0 flex flex-col justify-center px-8 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, x: -28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25, duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Eyebrow */}
            <div className="mb-3 flex items-center gap-2">
              <span
                className="h-px w-10 rounded-full"
                style={{ background: `linear-gradient(90deg, ${TEAL}, ${GREEN})` }}
              />
              <span
                className="text-[11px] font-bold uppercase tracking-[0.18em]"
                style={{ color: AQUA }}
              >
                Director · Analytics
              </span>
            </div>

            {/* Title */}
            <h1 className="text-[2.6rem] font-black leading-tight text-white drop-shadow-lg">
              Attendance{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: `linear-gradient(90deg, ${TEAL}, ${GREEN})` }}
              >
                Center
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-2.5 max-w-sm text-sm leading-relaxed text-gray-300/90">
              Real-time attendance tracking for students &amp; staff across every branch.
            </p>
          </motion.div>
        </div>

        {/* Corner glow accent */}
        <div
          className="pointer-events-none absolute -bottom-12 -right-12 h-56 w-56 rounded-full blur-3xl opacity-20"
          style={{ background: `radial-gradient(circle, ${GREEN}, ${TEAL})` }}
        />
      </motion.div>

      {/* ── Tilt Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {OPTIONS.map((opt) => (
          <TiltCard key={opt.href} {...opt} />
        ))}
      </div>
    </div>
  );
}

