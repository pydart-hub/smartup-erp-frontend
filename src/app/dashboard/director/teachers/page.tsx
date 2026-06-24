"use client";

import { useRef, useMemo, Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Stars } from "@react-three/drei";
import { useQuery } from "@tanstack/react-query";
import * as THREE from "three";
import { Search, Building2, Users, ChevronRight, AlertCircle } from "lucide-react";
import { getAllBranches, getInstructorCountForBranch } from "@/lib/api/director";

// ── Per-branch accent palette (cycles) ─────────────────────────────────────
const ACCENTS = [
  { icon: "text-teal-500",   lightBg: "bg-teal-50",   lightBorder: "border-teal-100",   darkGlow: "rgba(20,184,166,0.35)",  bar: "from-teal-400 to-emerald-400"   },
  { icon: "text-blue-500",   lightBg: "bg-blue-50",   lightBorder: "border-blue-100",   darkGlow: "rgba(59,130,246,0.35)",  bar: "from-blue-400 to-cyan-400"      },
  { icon: "text-violet-500", lightBg: "bg-violet-50", lightBorder: "border-violet-100", darkGlow: "rgba(139,92,246,0.35)",  bar: "from-violet-400 to-purple-400"  },
  { icon: "text-emerald-500",lightBg: "bg-emerald-50",lightBorder: "border-emerald-100",darkGlow: "rgba(16,185,129,0.35)",  bar: "from-emerald-400 to-teal-400"   },
  { icon: "text-amber-500",  lightBg: "bg-amber-50",  lightBorder: "border-amber-100",  darkGlow: "rgba(245,158,11,0.35)",  bar: "from-amber-400 to-orange-400"   },
  { icon: "text-rose-500",   lightBg: "bg-rose-50",   lightBorder: "border-rose-100",   darkGlow: "rgba(244,63,94,0.35)",   bar: "from-rose-400 to-pink-400"      },
  { icon: "text-cyan-500",   lightBg: "bg-cyan-50",   lightBorder: "border-cyan-100",   darkGlow: "rgba(6,182,212,0.35)",   bar: "from-cyan-400 to-blue-400"      },
  { icon: "text-orange-500", lightBg: "bg-orange-50", lightBorder: "border-orange-100", darkGlow: "rgba(249,115,22,0.35)",  bar: "from-orange-400 to-amber-400"   },
  { icon: "text-indigo-500", lightBg: "bg-indigo-50", lightBorder: "border-indigo-100", darkGlow: "rgba(99,102,241,0.35)",  bar: "from-indigo-400 to-violet-400"  },
  { icon: "text-green-500",  lightBg: "bg-green-50",  lightBorder: "border-green-100",  darkGlow: "rgba(34,197,94,0.35)",   bar: "from-green-400 to-emerald-400"  },
];

// ── 3D Scene ─────────────────────────────────────────────────────────────────
type ShapeKind = "icosa" | "octa" | "tetra" | "torus";

function FloatingShape({ position, shape, color, speed, opacity = 0.45 }: {
  position: [number, number, number]; shape: ShapeKind; color: string; speed: number; opacity?: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const geo = useMemo<THREE.BufferGeometry>(() => {
    if (shape === "icosa") return new THREE.IcosahedronGeometry(0.65, 0);
    if (shape === "octa")  return new THREE.OctahedronGeometry(0.7,  0);
    if (shape === "tetra") return new THREE.TetrahedronGeometry(0.75, 0);
    return new THREE.TorusGeometry(0.55, 0.12, 5, 14);
  }, [shape]);
  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.x += dt * speed * 0.5;
    ref.current.rotation.y += dt * speed;
  });
  return (
    <Float speed={2} rotationIntensity={0.4} floatIntensity={1.8}>
      <mesh ref={ref} position={position} geometry={geo}>
        <meshStandardMaterial color={color} wireframe transparent opacity={opacity} />
      </mesh>
    </Float>
  );
}

function Particles({ isDark }: { isDark: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const COUNT = 140;
  const [pos, col] = useMemo(() => {
    const p = new Float32Array(COUNT * 3);
    const c = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      p[i*3]=(Math.random()-0.5)*24; p[i*3+1]=(Math.random()-0.5)*14; p[i*3+2]=(Math.random()-0.5)*14;
      c[i*3]=0.3+Math.random()*0.2; c[i*3+1]=0.15+Math.random()*0.2; c[i*3+2]=0.65+Math.random()*0.2;
    }
    return [p, c];
  }, []);
  useFrame((s) => {
    if (!ref.current) return;
    ref.current.rotation.y = s.clock.elapsedTime * 0.016;
    ref.current.rotation.x = Math.sin(s.clock.elapsedTime * 0.01) * 0.06;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[pos, 3]} />
        <bufferAttribute attach="attributes-color"    args={[col, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.07} vertexColors transparent opacity={isDark ? 0.7 : 0.3} sizeAttenuation />
    </points>
  );
}

function OrbitalRing({ radius, speed, color, tilt, opacity = 0.2 }: {
  radius: number; speed: number; color: string; tilt: [number,number,number]; opacity?: number;
}) {
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
  const lo = isDark ? 1 : 0;
  return (
    <>
      <ambientLight intensity={isDark ? 0.2 : 0.8} />
      <pointLight position={[8,  6, 4]}  intensity={isDark ? 2.2 : 1.0} color="#673AB7" />
      <pointLight position={[-8,-4,-6]}  intensity={isDark ? 1.2 : 0.6} color="#7E57C2" />
      {isDark && <pointLight position={[0,-6,2]} intensity={0.8} color="#6D28D9" />}
      {isDark && <Stars radius={60} depth={40} count={1400} factor={3} saturation={0.2} fade speed={0.4} />}
      <Particles isDark={isDark} />
      <OrbitalRing radius={4.0} speed={0.12}  color="#673AB7" tilt={[0.5, 0, 0]}    opacity={isDark ? 0.22 : 0.10} />
      <OrbitalRing radius={5.8} speed={-0.08} color="#7E57C2" tilt={[-0.3,0.4,0]}   opacity={isDark ? 0.20 : 0.08} />
      <OrbitalRing radius={7.5} speed={0.06}  color="#512DA8" tilt={[0.7,-0.3,0.2]} opacity={isDark ? 0.18 : 0.07} />
      <FloatingShape position={[-8,2.5,-4]}  shape="icosa" color={"#673AB7"} speed={0.25} opacity={isDark?0.45:0.16} />
      <FloatingShape position={[8,-2.0,-5]}  shape="octa"  color={"#7E57C2"} speed={0.35} opacity={isDark?0.45:0.14} />
      <FloatingShape position={[-6,-3.5,-3]} shape="tetra" color={"#512DA8"} speed={0.30} opacity={isDark?0.45:0.13} />
      <FloatingShape position={[7,3.0,-3]}   shape="torus" color={"#673AB7"} speed={0.28} opacity={isDark?0.45:0.14} />
      <FloatingShape position={[1,5.0,-6]}   shape="icosa" color={"#7E57C2"} speed={0.18} opacity={isDark?0.45:0.11} />
      <FloatingShape position={[-2,-5.0,-4]} shape="octa"  color={"#512DA8"} speed={0.22} opacity={isDark?0.45:0.12} />
    </>
  );
}

// ── Branch card ───────────────────────────────────────────────────────────────

function BranchCard({ branch, index, isDark }: {
  branch: { name: string; abbr: string }; index: number; isDark: boolean;
}) {
  const { data: count, isLoading } = useQuery({
    queryKey: ["director-branch-instructors", branch.name],
    queryFn:  () => getInstructorCountForBranch(branch.name),
    staleTime: 120_000,
  });

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-0.5,0.5], [8,-8]), { stiffness: 280, damping: 22 });
  const rotateY = useSpring(useTransform(mx, [-0.5,0.5], [-8,8]), { stiffness: 280, damping: 22 });
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX-r.left)/r.width-0.5);
    my.set((e.clientY-r.top)/r.height-0.5);
  };
  const onLeave = () => { mx.set(0); my.set(0); };

  const accent = ACCENTS[index % ACCENTS.length];
  const shortName = branch.name.replace("Smart Up ", "").replace("Smart Up", "HQ");
  const href = `/dashboard/director/branches/${encodeURIComponent(branch.name)}/teachers`;

  const defaultShadow = isDark ? "0 4px 20px rgba(0,0,0,0.3)" : "0 2px 12px rgba(0,0,0,0.06)";
  const hoverShadow   = isDark
    ? `0 0 36px ${accent.darkGlow}, 0 4px 20px rgba(0,0,0,0.4)`
    : `0 8px 32px ${accent.darkGlow}, 0 2px 8px rgba(0,0,0,0.07)`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 36, scale: 0.92 }}
      animate={{ opacity: 1, y: 0,  scale: 1     }}
      transition={{ delay: 0.06 + index * 0.05, duration: 0.55, ease: [0.23,1,0.32,1] }}
      style={{ perspective: "900px" }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <Link href={href}>
        <motion.div
          style={{ rotateX, rotateY, transformStyle: "preserve-3d", boxShadow: defaultShadow }}
          whileHover={{ boxShadow: hoverShadow }}
          className={`relative rounded-2xl overflow-hidden cursor-pointer group transition-colors duration-200 ${
            isDark
              ? "border border-white/[0.07] bg-white/[0.04] backdrop-blur-2xl hover:border-white/[0.16] hover:bg-white/[0.07]"
              : "border border-gray-100 bg-white hover:border-teal-200"
          }`}
        >
          {/* Gradient accent top stripe */}
          <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${accent.bar} opacity-60 group-hover:opacity-100 transition-opacity duration-300`} />

          {/* Top shine (dark only) */}
          {isDark && <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />}

          <div className="p-5 flex items-center gap-4">
            {/* Icon */}
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 ${
                isDark
                  ? "border border-white/10 bg-white/[0.06] group-hover:border-white/20"
                  : `border ${accent.lightBorder} ${accent.lightBg}`
              }`}
              style={{ transform: "translateZ(14px)" }}
            >
              <Building2 className={`w-5 h-5 ${accent.icon}`} />
            </div>

            {/* Name + abbr */}
            <div className="flex-1 min-w-0" style={{ transform: "translateZ(8px)" }}>
              <p className={`text-sm font-semibold truncate ${isDark ? "text-white/90 group-hover:text-white" : "text-gray-800 group-hover:text-teal-700"} transition-colors`}>
                {shortName}
              </p>
              <div className={`inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${
                isDark ? "bg-white/[0.07] text-white/40" : "bg-gray-100 text-gray-400"
              }`}>
                {branch.abbr}
              </div>
            </div>

            {/* Count */}
            <div className="text-right shrink-0" style={{ transform: "translateZ(12px)" }}>
              {isLoading ? (
                <div className={`w-10 h-7 rounded-md animate-pulse ${isDark ? "bg-white/10" : "bg-gray-100"}`} />
              ) : (
                <p className={`text-2xl font-extrabold tabular-nums ${isDark ? "text-white" : "text-gray-900"}`}>
                  {count ?? 0}
                </p>
              )}
              <div className={`flex items-center gap-0.5 justify-end mt-0.5 ${isDark ? "text-white/35" : "text-gray-400"}`}>
                <Users className="w-2.5 h-2.5" />
                <span className="text-[10px]">staff</span>
              </div>
            </div>

            {/* Arrow */}
            <ChevronRight className={`w-4 h-4 shrink-0 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200 ${isDark ? "text-white/50" : "text-gray-400"}`} />
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DirectorTeachersPage() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const isDark = mounted ? resolvedTheme === "dark" : false;

  const [search, setSearch] = useState("");

  const { data: branches, isLoading, isError } = useQuery({
    queryKey: ["director-branches"],
    queryFn:  getAllBranches,
    staleTime: 300_000,
  });

  const activeBranches = (branches ?? []).filter((b) => b.name !== "Smart Up");
  const filtered = search
    ? activeBranches.filter((b) => b.name.toLowerCase().includes(search.toLowerCase()))
    : activeBranches;

  return (
    <div className="relative -m-4 lg:-m-6 min-h-[calc(100vh-64px)] overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 transition-colors duration-500"
        style={{
          background: isDark
            ? "linear-gradient(135deg,#130826 0%,#1A0C38 50%,#0E051C 100%)"
            : "#FFFFFF",
        }}
      />

      {/* Three.js */}
      <div className="absolute inset-0">
        <Canvas camera={{ position:[0,0,10], fov:58 }} gl={{ antialias:true, alpha:true }} dpr={[1,1.5]}>
          <Suspense fallback={null}>
            {mounted && <ThreeScene isDark={isDark} />}
          </Suspense>
        </Canvas>
      </div>

      {/* Radial glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: isDark
          ? "radial-gradient(ellipse 70% 50% at 50% 25%,rgba(103,58,183,0.12) 0%,transparent 70%)"
          : "none",
      }} />

      {/* Content */}
      <div className="relative z-10 px-6 sm:px-8 py-8 max-w-5xl mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity:0, y:-24 }}
          animate={{ opacity:1, y:0   }}
          transition={{ duration:0.7, ease:[0.23,1,0.32,1] }}
          className="mb-8"
        >
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-sm mb-5 ${
            isDark ? "border-teal-400/30 bg-teal-400/10" : "border-teal-500/30 bg-teal-500/8"
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
            <span className={`text-xs font-medium tracking-widest uppercase ${isDark ? "text-teal-300" : "text-teal-700"}`}>
              Faculty Directory
            </span>
          </div>

          <h1 className={`text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight ${isDark ? "text-white" : "text-gray-900"}`}>
            Teachers
          </h1>
          <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight tracking-tight bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500 bg-clip-text text-transparent">
            Branch Overview
          </h2>
          <p className={`mt-2 text-sm max-w-md leading-relaxed ${isDark ? "text-white/45" : "text-gray-500"}`}>
            Select a branch to view its instructors and staff details.
          </p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity:0, y:16 }}
          animate={{ opacity:1, y:0  }}
          transition={{ delay:0.15, duration:0.5, ease:[0.23,1,0.32,1] }}
          className="relative max-w-sm mb-8"
        >
          <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? "text-white/30" : "text-gray-400"}`} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search branches..."
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all duration-200 ${
              isDark
                ? "bg-white/[0.06] border border-white/[0.1] text-white placeholder:text-white/30 focus:border-teal-400/40 focus:bg-white/[0.08] backdrop-blur-xl"
                : "bg-white border border-gray-200 text-gray-800 placeholder:text-gray-400 focus:border-teal-400 shadow-sm"
            }`}
          />
        </motion.div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className={`h-[76px] rounded-2xl animate-pulse ${isDark ? "bg-white/[0.05]" : "bg-white/80"}`}
                style={{ animationDelay: `${i * 60}ms` }}
              />
            ))}
          </div>
        ) : isError ? (
          <div className={`flex flex-col items-center justify-center h-48 gap-3 rounded-2xl border ${
            isDark ? "border-red-500/20 bg-red-500/5" : "border-red-100 bg-red-50"
          }`}>
            <AlertCircle className="w-8 h-8 text-red-400" />
            <p className={`text-sm ${isDark ? "text-red-400" : "text-red-500"}`}>Failed to load branches</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className={`flex flex-col items-center justify-center h-48 gap-2 rounded-2xl border ${
            isDark ? "border-white/[0.07] bg-white/[0.03]" : "border-gray-100 bg-white/60"
          }`}>
            <Building2 className={`w-8 h-8 ${isDark ? "text-white/20" : "text-gray-300"}`} />
            <p className={`text-sm ${isDark ? "text-white/30" : "text-gray-400"}`}>No branches found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map((branch, i) => (
              <BranchCard key={branch.name} branch={branch} index={i} isDark={isDark} />
            ))}
          </div>
        )}

        <motion.p
          initial={{ opacity:0 }} animate={{ opacity:1 }}
          transition={{ delay:1.2, duration:0.6 }}
          className={`mt-10 text-center text-xs tracking-wide ${isDark ? "text-white/20" : "text-gray-300"}`}
        >
          Hover to preview · Click to navigate
        </motion.p>
      </div>
    </div>
  );
}
