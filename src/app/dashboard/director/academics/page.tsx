"use client";

import { useRef, useMemo, Suspense, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Stars } from "@react-three/drei";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import * as THREE from "three";
import {
  BarChart3, ClipboardCheck, Trophy, CalendarDays,
  UserCheck, BookOpen, GraduationCap, Users,
} from "lucide-react";

// ── Data ─────────────────────────────────────────────────────────────────────

const cards = [
  { title: "Overview",        desc: "All branches full academic drill-down",        icon: BarChart3,    href: "/dashboard/director/academics/overview" },
  { title: "Attendance",      desc: "Cross-branch attendance analytics",             icon: ClipboardCheck, href: "/dashboard/director/academics/attendance" },
  { title: "Exams",           desc: "Exam performance across branches",              icon: Trophy,       href: "/dashboard/director/academics/exams" },
  { title: "Course Schedule", desc: "Class schedules and completion",                icon: CalendarDays, href: "/dashboard/director/academics/course-schedule" },
  { title: "Instructors",     desc: "Instructor performance metrics",                icon: UserCheck,    href: "/dashboard/director/academics/instructors" },
  { title: "Topic Coverage",  desc: "Curriculum progress tracking",                  icon: BookOpen,     href: "/dashboard/director/academics/topic-coverage" },
  { title: "Alumni",          desc: "Alumni registry and formal data dashboard",     icon: Users,        href: "/dashboard/director/alumni" },
  { title: "A+ Cabinet",      desc: "Board exam results, A+ counts & grade records", icon: GraduationCap, href: "/dashboard/director/academics/students" },
];

// dark-mode icon colours (on dark glass)
const darkIconColors  = ["text-teal-400","text-emerald-400","text-amber-400","text-blue-400","text-purple-400","text-orange-400","text-cyan-400","text-yellow-400"];
// light-mode icon colours (on white)
const lightIconColors = ["text-teal-600","text-emerald-600","text-amber-600","text-blue-600","text-purple-600","text-orange-600","text-cyan-600","text-yellow-600"];
// light-mode icon bg tints
const lightIconBg     = ["bg-teal-50","bg-emerald-50","bg-amber-50","bg-blue-50","bg-purple-50","bg-orange-50","bg-cyan-50","bg-yellow-50"];
const lightIconBorder = ["border-teal-100","border-emerald-100","border-amber-100","border-blue-100","border-purple-100","border-orange-100","border-cyan-100","border-yellow-100"];

const darkGlowShadows = [
  "0 0 40px rgba(45,212,191,0.35)",
  "0 0 40px rgba(52,211,153,0.35)",
  "0 0 40px rgba(251,191,36,0.35)",
  "0 0 40px rgba(96,165,250,0.35)",
  "0 0 40px rgba(167,139,250,0.35)",
  "0 0 40px rgba(251,146,60,0.35)",
  "0 0 40px rgba(34,211,238,0.35)",
  "0 0 40px rgba(250,204,21,0.35)",
];
const lightGlowShadows = [
  "0 8px 32px rgba(20,184,166,0.18), 0 2px 8px rgba(0,0,0,0.08)",
  "0 8px 32px rgba(16,185,129,0.18), 0 2px 8px rgba(0,0,0,0.08)",
  "0 8px 32px rgba(245,158,11,0.18), 0 2px 8px rgba(0,0,0,0.08)",
  "0 8px 32px rgba(59,130,246,0.18), 0 2px 8px rgba(0,0,0,0.08)",
  "0 8px 32px rgba(139,92,246,0.18), 0 2px 8px rgba(0,0,0,0.08)",
  "0 8px 32px rgba(249,115,22,0.18), 0 2px 8px rgba(0,0,0,0.08)",
  "0 8px 32px rgba(6,182,212,0.18),  0 2px 8px rgba(0,0,0,0.08)",
  "0 8px 32px rgba(234,179,8,0.18),  0 2px 8px rgba(0,0,0,0.08)",
];

// ── 3D Scene ─────────────────────────────────────────────────────────────────

type ShapeKind = "icosa" | "octa" | "tetra" | "torus";

function FloatingShape({
  position, shape, color, speed, opacity = 0.45,
}: { position: [number, number, number]; shape: ShapeKind; color: string; speed: number; opacity?: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  const geo = useMemo<THREE.BufferGeometry>(() => {
    if (shape === "icosa") return new THREE.IcosahedronGeometry(0.65, 0);
    if (shape === "octa")  return new THREE.OctahedronGeometry(0.7, 0);
    if (shape === "tetra") return new THREE.TetrahedronGeometry(0.75, 0);
    return new THREE.TorusGeometry(0.55, 0.12, 5, 14);
  }, [shape]);

  useFrame((_, dt) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.x += dt * speed * 0.5;
    meshRef.current.rotation.y += dt * speed;
  });

  return (
    <Float speed={2} rotationIntensity={0.4} floatIntensity={1.8}>
      <mesh ref={meshRef} position={position} geometry={geo}>
        <meshStandardMaterial color={color} wireframe transparent opacity={opacity} />
      </mesh>
    </Float>
  );
}

function Particles({ isDark }: { isDark: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const COUNT = 160;

  const [pos, col] = useMemo(() => {
    const p = new Float32Array(COUNT * 3);
    const c = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      p[i * 3]     = (Math.random() - 0.5) * 24;
      p[i * 3 + 1] = (Math.random() - 0.5) * 14;
      p[i * 3 + 2] = (Math.random() - 0.5) * 14;
      c[i * 3]     = 0.08 + Math.random() * 0.18;
      c[i * 3 + 1] = 0.58 + Math.random() * 0.38;
      c[i * 3 + 2] = 0.52 + Math.random() * 0.38;
    }
    return [p, c];
  }, []);

  useFrame((s) => {
    if (!ref.current) return;
    ref.current.rotation.y = s.clock.elapsedTime * 0.018;
    ref.current.rotation.x = Math.sin(s.clock.elapsedTime * 0.01) * 0.07;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[pos, 3]} />
        <bufferAttribute attach="attributes-color"    args={[col, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.07} vertexColors transparent opacity={isDark ? 0.75 : 0.35} sizeAttenuation />
    </points>
  );
}

function OrbitalRing({
  radius, speed, color, tilt, opacity = 0.22,
}: { radius: number; speed: number; color: string; tilt: [number, number, number]; opacity?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => { if (ref.current) ref.current.rotation.z = s.clock.elapsedTime * speed; });
  return (
    <mesh ref={ref} rotation={tilt}>
      <torusGeometry args={[radius, 0.015, 3, 90]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} />
    </mesh>
  );
}

function ThreeScene({ isDark }: { isDark: boolean }) {
  return (
    <>
      <ambientLight intensity={isDark ? 0.2 : 0.8} />
      <pointLight position={[8, 6, 4]}   intensity={isDark ? 2.2 : 1.0} color="#1A9E8F" />
      <pointLight position={[-8, -4, -6]} intensity={isDark ? 1.2 : 0.6} color="#82C35B" />
      {isDark && <pointLight position={[0, -6, 2]} intensity={0.8} color="#6D28D9" />}

      {isDark && <Stars radius={60} depth={40} count={1500} factor={3} saturation={0.2} fade speed={0.4} />}
      <Particles isDark={isDark} />

      <OrbitalRing radius={4.0} speed={0.12}  color={isDark ? "#1A9E8F" : "#1A9E8F"} tilt={[0.5,  0,    0  ]} opacity={isDark ? 0.22 : 0.12} />
      <OrbitalRing radius={5.5} speed={-0.08} color={isDark ? "#82C35B" : "#82C35B"} tilt={[-0.3, 0.4,  0  ]} opacity={isDark ? 0.22 : 0.10} />
      <OrbitalRing radius={7.2} speed={0.06}  color={isDark ? "#2DD4BF" : "#2DD4BF"} tilt={[0.7, -0.3, 0.2]} opacity={isDark ? 0.22 : 0.08} />

      <FloatingShape position={[-8,  2.5, -4]} shape="icosa" color={isDark ? "#1A9E8F" : "#0D9488"} speed={0.25} opacity={isDark ? 0.45 : 0.18} />
      <FloatingShape position={[ 8, -2.0, -5]} shape="octa"  color={isDark ? "#82C35B" : "#10B981"} speed={0.35} opacity={isDark ? 0.45 : 0.15} />
      <FloatingShape position={[-6, -3.5, -3]} shape="tetra" color={isDark ? "#2DD4BF" : "#0EA5E9"} speed={0.30} opacity={isDark ? 0.45 : 0.14} />
      <FloatingShape position={[ 7,  3.0, -3]} shape="torus" color={isDark ? "#1A9E8F" : "#1A9E8F"} speed={0.28} opacity={isDark ? 0.45 : 0.15} />
      <FloatingShape position={[ 1,  5.0, -6]} shape="icosa" color={isDark ? "#82C35B" : "#82C35B"} speed={0.18} opacity={isDark ? 0.45 : 0.12} />
      <FloatingShape position={[-2, -5.0, -4]} shape="octa"  color={isDark ? "#6D28D9" : "#8B5CF6"} speed={0.22} opacity={isDark ? 0.45 : 0.13} />
    </>
  );
}

// ── 3D Tilt Card ─────────────────────────────────────────────────────────────

function TiltCard({
  card, index, isDark, onClick,
}: { card: (typeof cards)[0]; index: number; isDark: boolean; onClick: () => void }) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [10, -10]), { stiffness: 280, damping: 22 });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-10, 10]), { stiffness: 280, damping: 22 });

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width  - 0.5);
    my.set((e.clientY - r.top)  / r.height - 0.5);
  };
  const onLeave = () => { mx.set(0); my.set(0); };

  const Icon = card.icon;
  const iconColor  = isDark ? darkIconColors[index]  : lightIconColors[index];
  const glowShadow = isDark ? darkGlowShadows[index] : lightGlowShadows[index];

  return (
    <motion.div
      initial={{ opacity: 0, y: 48, scale: 0.88 }}
      animate={{ opacity: 1, y: 0,  scale: 1    }}
      transition={{ delay: 0.1 + index * 0.07, duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
      style={{ perspective: "900px" }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {isDark ? (
        /* ── Dark card ── */
        <motion.div
          onClick={onClick}
          style={{
            rotateX, rotateY, transformStyle: "preserve-3d",
            boxShadow: "0 4px 24px rgba(0,0,0,0.35)",
          }}
          whileHover={{ boxShadow: `${glowShadow}, 0 4px 28px rgba(0,0,0,0.5)` }}
          className="relative cursor-pointer rounded-2xl overflow-hidden border border-white/[0.07] bg-white/[0.04] backdrop-blur-2xl p-5 group transition-colors duration-200 hover:border-white/[0.18] hover:bg-white/[0.07]"
        >
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent" />
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-white/[0.04] via-transparent to-transparent rounded-2xl pointer-events-none" />
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 border border-white/10 bg-white/[0.06] group-hover:border-white/20 group-hover:scale-110 transition-all duration-300"
            style={{ transform: "translateZ(18px)" }}
          >
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          <div style={{ transform: "translateZ(10px)" }}>
            <p className="text-sm font-semibold text-white/90 group-hover:text-white transition-colors">{card.title}</p>
            <p className="text-xs text-white/40 mt-1 leading-relaxed">{card.desc}</p>
          </div>
          <div className="mt-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-300">
            <span className={`text-xs font-medium ${iconColor}`}>Explore</span>
            <span className={`text-xs ${iconColor}`}>→</span>
          </div>
          <div className="absolute bottom-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-teal-400/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </motion.div>
      ) : (
        /* ── Light card ── */
        <motion.div
          onClick={onClick}
          style={{
            rotateX, rotateY, transformStyle: "preserve-3d",
            boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
          }}
          whileHover={{ boxShadow: glowShadow }}
          className="relative cursor-pointer rounded-2xl overflow-hidden border border-gray-100 bg-white p-5 group transition-colors duration-200 hover:border-teal-200"
        >
          {/* Subtle top accent line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-teal-400/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 border ${lightIconBorder[index]} ${lightIconBg[index]} group-hover:scale-110 transition-all duration-300`}
            style={{ transform: "translateZ(18px)" }}
          >
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          <div style={{ transform: "translateZ(10px)" }}>
            <p className="text-sm font-semibold text-gray-800 group-hover:text-teal-700 transition-colors">{card.title}</p>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">{card.desc}</p>
          </div>
          <div className="mt-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-300">
            <span className={`text-xs font-medium ${iconColor}`}>Explore</span>
            <span className={`text-xs ${iconColor}`}>→</span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DirectorAcademicsLandingPage() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();

  // Avoid hydration mismatch — render neutral until theme is resolved
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const isDark = mounted ? resolvedTheme === "dark" : false;

  return (
    <div className="relative -m-4 lg:-m-6 min-h-[calc(100vh-64px)] overflow-hidden">
      {/* Background — dark space or light wash */}
      <div
        className="absolute inset-0 transition-colors duration-500"
        style={{
          background: isDark
            ? "linear-gradient(135deg, #060C18 0%, #0A1628 50%, #080E1A 100%)"
            : "linear-gradient(135deg, #EAF7F5 0%, #F4F7F6 50%, #F0F9F7 100%)",
        }}
      />

      {/* Three.js canvas */}
      <div className="absolute inset-0">
        <Canvas camera={{ position: [0, 0, 10], fov: 58 }} gl={{ antialias: true, alpha: true }} dpr={[1, 1.5]}>
          <Suspense fallback={null}>
            {mounted && <ThreeScene isDark={isDark} />}
          </Suspense>
        </Canvas>
      </div>

      {/* Radial centre glow */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-500"
        style={{
          background: isDark
            ? "radial-gradient(ellipse 70% 50% at 50% 30%, rgba(26,158,143,0.12) 0%, transparent 70%)"
            : "radial-gradient(ellipse 70% 50% at 50% 30%, rgba(26,158,143,0.07) 0%, transparent 70%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 px-6 sm:px-8 py-8 max-w-5xl mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
          className="mb-10"
        >
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-sm mb-5 ${
            isDark
              ? "border-teal-400/30 bg-teal-400/10"
              : "border-teal-500/30 bg-teal-500/8"
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
            <span className={`text-xs font-medium tracking-widest uppercase ${isDark ? "text-teal-300" : "text-teal-700"}`}>
              Academic Intelligence
            </span>
          </div>

          <h1 className={`text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight ${isDark ? "text-white" : "text-gray-900"}`}>
            Academics
          </h1>
          <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight tracking-tight bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500 bg-clip-text text-transparent">
            Command Center
          </h2>
          <p className={`mt-3 text-sm max-w-md leading-relaxed ${isDark ? "text-white/45" : "text-gray-500"}`}>
            Cross-branch oversight across all 9 branches — attendance, exams,
            curriculum, instructors and beyond.
          </p>
        </motion.div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {cards.map((card, i) => (
            <TiltCard
              key={card.title}
              card={card}
              index={i}
              isDark={isDark}
              onClick={() => router.push(card.href)}
            />
          ))}
        </div>

        {/* Footer hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className={`mt-10 text-center text-xs tracking-wide ${isDark ? "text-white/20" : "text-gray-300"}`}
        >
          Hover to preview · Click to navigate
        </motion.p>
      </div>
    </div>
  );
}