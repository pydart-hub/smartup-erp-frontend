"use client";

import React, {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Sparkles } from "@react-three/drei";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import * as THREE from "three";
import SmartUpAnimatedLogo from "@/components/enquiry/SmartUpAnimatedLogo";

const emptySubscribe = () => () => {};

function getReducedMotionPreference(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false
  );
}

class CanvasErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

type PolyKind = "icosa" | "octa" | "torus" | "dodeca";

interface FloatingGemProps {
  position: [number, number, number];
  kind: PolyKind;
  color: string;
  scale?: number;
  speed?: number;
  wireframe?: boolean;
  opacity?: number;
}

function FloatingGem({
  position,
  kind,
  color,
  scale = 1,
  speed = 0.35,
  wireframe = false,
  opacity = 0.85,
}: FloatingGemProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo<THREE.BufferGeometry>(() => {
    if (kind === "icosa") return new THREE.IcosahedronGeometry(0.65, 0);
    if (kind === "octa") return new THREE.OctahedronGeometry(0.68, 0);
    if (kind === "dodeca") return new THREE.DodecahedronGeometry(0.6, 0);
    return new THREE.TorusGeometry(0.62, 0.16, 18, 42);
  }, [kind]);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  useFrame((_, dt) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.x += dt * speed * 0.55;
    meshRef.current.rotation.y += dt * speed;
  });

  return (
    <Float speed={1.8} rotationIntensity={0.45} floatIntensity={1.4}>
      <mesh
        ref={meshRef}
        position={position}
        scale={scale}
        geometry={geometry}
      >
        <meshStandardMaterial
          color={color}
          roughness={wireframe ? 0.45 : 0.2}
          metalness={wireframe ? 0.25 : 0.55}
          wireframe={wireframe}
          transparent
          opacity={opacity}
        />
      </mesh>
    </Float>
  );
}

function CameraRig({
  pointer,
}: {
  pointer: React.MutableRefObject<{ x: number; y: number }>;
}) {
  useFrame((state) => {
    const targetX = pointer.current.x * 0.45;
    const targetY = pointer.current.y * 0.3;
    state.camera.position.x = THREE.MathUtils.lerp(
      state.camera.position.x,
      targetX,
      0.05
    );
    state.camera.position.y = THREE.MathUtils.lerp(
      state.camera.position.y,
      targetY,
      0.05
    );
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

/**
 * Full-bleed ambient 3D WebGL backdrop with floating faceted polyhedra and
 * celebration sparkles in Smart Up's brand palette.
 */
export function ThankYou3DStage() {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const reducedMotion = useSyncExternalStore(
    emptySubscribe,
    getReducedMotionPreference,
    () => true
  );
  const pointerRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointerRef.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      pointerRef.current.y = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 overflow-hidden z-0"
    >
      {/* Multi-layered luminous atmospheric gradients */}
      <div className="absolute -top-32 -left-24 w-[36rem] h-[36rem] rounded-full bg-gradient-to-br from-[#7C3AED]/18 via-[#5C34A4]/12 to-transparent blur-[110px]" />
      <div className="absolute top-1/3 -right-28 w-[34rem] h-[34rem] rounded-full bg-gradient-to-bl from-[#F5C542]/18 via-[#A855F7]/12 to-transparent blur-[120px]" />
      <div className="absolute -bottom-36 left-1/3 w-[32rem] h-[32rem] rounded-full bg-gradient-to-tr from-[#10B981]/14 via-[#6366F1]/12 to-transparent blur-[110px]" />

      {/* Subtle architectural perspective grid */}
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(92,52,164,0.12) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage:
            "radial-gradient(ellipse 75% 65% at 50% 45%, black 35%, transparent 100%)",
        }}
      />

      {isClient && !reducedMotion && (
        <CanvasErrorBoundary>
          <Canvas
            dpr={[1, 1.5]}
            camera={{ position: [0, 0, 8], fov: 45 }}
            gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
            className="w-full h-full"
          >
            <Suspense fallback={null}>
              <ambientLight intensity={1.1} />
              <directionalLight
                position={[6, 8, 6]}
                intensity={1.7}
                color="#ffffff"
              />
              <pointLight
                position={[-6, -4, 4]}
                intensity={1.4}
                color="#a855f7"
              />
              <pointLight
                position={[5, -3, 3]}
                intensity={1.1}
                color="#f5c542"
              />

              <CameraRig pointer={pointerRef} />

              {/* Left cluster */}
              <FloatingGem
                position={[-4.6, 2.1, -1.2]}
                kind="icosa"
                color="#7C3AED"
                scale={0.85}
                speed={0.4}
                opacity={0.78}
              />
              <FloatingGem
                position={[-4.2, -2.0, -0.5]}
                kind="torus"
                color="#10B981"
                scale={0.7}
                speed={0.32}
                opacity={0.72}
              />
              <FloatingGem
                position={[-5.6, 0.2, -2.2]}
                kind="octa"
                color="#5C34A4"
                scale={1.05}
                speed={0.25}
                wireframe
                opacity={0.42}
              />

              {/* Right cluster */}
              <FloatingGem
                position={[4.5, 2.2, -0.9]}
                kind="dodeca"
                color="#F5C542"
                scale={0.78}
                speed={0.36}
                opacity={0.82}
              />
              <FloatingGem
                position={[4.7, -1.8, -1.1]}
                kind="icosa"
                color="#5C34A4"
                scale={0.95}
                speed={0.28}
                wireframe
                opacity={0.45}
              />
              <FloatingGem
                position={[3.6, 0.1, -2.4]}
                kind="octa"
                color="#8B5CF6"
                scale={0.62}
                speed={0.45}
                opacity={0.75}
              />

              <Sparkles
                count={48}
                scale={[12, 8, 4]}
                size={2.6}
                speed={0.35}
                opacity={0.55}
                color="#7C3AED"
              />
              <Sparkles
                count={26}
                scale={[11, 7, 4]}
                size={2.2}
                speed={0.28}
                opacity={0.5}
                color="#F5C542"
              />
            </Suspense>
          </Canvas>
        </CanvasErrorBoundary>
      )}
    </div>
  );
}

interface ThankYou3DCardProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Interactive 3D perspective card shell with spring tilt, specular light tracking,
 * and layered elevation shadows.
 */
export function ThankYou3DCard({
  children,
  className = "",
}: ThankYou3DCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const normX = useMotionValue(0);
  const normY = useMotionValue(0);
  const px = useMotionValue(280);
  const py = useMotionValue(180);

  const rotateX = useSpring(useTransform(normY, [-0.5, 0.5], [5.5, -5.5]), {
    stiffness: 180,
    damping: 22,
  });
  const rotateY = useSpring(useTransform(normX, [-0.5, 0.5], [-5.5, 5.5]), {
    stiffness: 180,
    damping: 22,
  });

  const spotlight = useMotionTemplate`radial-gradient(380px circle at ${px}px ${py}px, rgba(124, 58, 237, 0.09), transparent 70%)`;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    if (window.matchMedia?.("(pointer: coarse)")?.matches) return;
    const rect = cardRef.current.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;
    px.set(relX);
    py.set(relY);
    normX.set(relX / rect.width - 0.5);
    normY.set(relY / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    normX.set(0);
    normY.set(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      style={{ perspective: 1200 }}
      className="relative w-full max-w-xl"
    >
      {/* 3D floating floor shadow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-6 -bottom-7 top-10 rounded-[36px] bg-gradient-to-b from-[#5C34A4]/18 via-[#7C3AED]/14 to-transparent blur-2xl"
      />

      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className={`relative rounded-[28px] sm:rounded-[32px] bg-white/90 backdrop-blur-2xl border border-white/90 shadow-[0_28px_70px_-18px_rgba(92,52,164,0.28),0_10px_28px_-10px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.95)] ring-1 ring-[#5C34A4]/10 overflow-hidden ${className}`}
      >
        {/* Top prismatic accent bar */}
        <div
          aria-hidden
          className="h-1.5 w-full bg-gradient-to-r from-[#5C34A4] via-[#8B5CF6] to-[#F5C542]"
        />

        {/* Cursor-tracking specular highlight */}
        <motion.div
          aria-hidden
          style={{ background: spotlight }}
          className="pointer-events-none absolute inset-0 z-0"
        />

        <div
          className="relative z-10 p-6 sm:p-10"
          style={{ transformStyle: "preserve-3d" }}
        >
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}

/**
 * Shared floating 3D SmartUp logo emblem (no outer circle) paired with the
 * elevated emerald confirmation status pill.
 */
export function ThankYouHeroEmblem({ badgeText }: { badgeText: string }) {
  return (
    <>
      <div
        className="relative flex justify-center pt-1"
        style={{ transform: "translateZ(48px)" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-24 rounded-full bg-gradient-to-r from-[#7C3AED]/25 via-[#A855F7]/20 to-[#F5C542]/20 blur-2xl"
        />
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{
            duration: 3.4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="relative -my-4 drop-shadow-[0_18px_28px_rgba(92,52,164,0.34)]"
        >
          <SmartUpAnimatedLogo size={160} />
        </motion.div>
      </div>

      <div style={{ transform: "translateZ(34px)" }}>
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold shadow-[0_10px_24px_-6px_rgba(16,185,129,0.55)] ring-2 ring-emerald-400/30">
          <CheckCircle2 className="w-4 h-4" />
          <span>{badgeText}</span>
        </div>
      </div>
    </>
  );
}
