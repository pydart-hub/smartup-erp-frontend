"use client";

import React, { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { useAuthStore } from "@/lib/stores/authStore";
import { ShieldAlert, LogOut, RefreshCw, Lock, User, HelpCircle } from "lucide-react";
import { useTheme } from "next-themes";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { getCurrentUser } from "@/lib/api/auth";

export default function UnauthorizedPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const { user, isAuthenticated, setUser } = useAuthStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const isDarkTheme = !mounted || resolvedTheme !== "light";

  const isDarkRef = useRef(isDarkTheme);
  useEffect(() => {
    isDarkRef.current = isDarkTheme;
  }, [isDarkTheme]);

  // 3D Card tilt states
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // 3D Canvas Background
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Handle mouse move for 3D card tilt
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    
    // Normalize tilt angle (max 12 degrees)
    const tiltX = (y / (rect.height / 2)) * -12;
    const tiltY = (x / (rect.width / 2)) * 12;
    
    setTilt({ x: tiltX, y: tiltY });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setIsHovered(false);
  };

  // 3D Interactive Canvas Particles Effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Particle structure in 3D space
    interface Particle3D {
      x: number; // 3D coords
      y: number;
      z: number;
      baseX: number;
      baseY: number;
      baseZ: number;
      colorIndex: number;
      size: number;
    }

    const particles: Particle3D[] = [];
    const numParticles = 120;

    // Initialize particles in a 3D sphere/cloud shape
    for (let i = 0; i < numParticles; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const radius = 180 + Math.random() * 160;

      const px = radius * Math.sin(phi) * Math.cos(theta);
      const py = radius * Math.sin(phi) * Math.sin(theta);
      const pz = radius * Math.cos(phi);

      particles.push({
        x: px,
        y: py,
        z: pz,
        baseX: px,
        baseY: py,
        baseZ: pz,
        size: Math.random() * 1.2 + 0.6,
        colorIndex: Math.floor(Math.random() * 5),
      });
    }

    let angleY = 0.0015;
    let angleX = 0.0008;
    let mouseX = 0;
    let mouseY = 0;

    const handleWindowMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX - window.innerWidth / 2) * 0.04;
      mouseY = (e.clientY - window.innerHeight / 2) * 0.04;
    };
    window.addEventListener("mousemove", handleWindowMouseMove);

    const fov = 350; // Camera distance / perspective index

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      const currentIsDark = isDarkRef.current;
      const currentColors = currentIsDark
        ? ["#818cf8", "#6366f1", "#4f46e5", "#38bdf8", "#06b6d4"]
        : ["#4f46e5", "#3b82f6", "#2563eb", "#0284c7", "#0891b2"];

      // Dynamic rotation adjustment by mouse position
      const currentAngleY = angleY + mouseX * 0.00008;
      const currentAngleX = angleX + mouseY * 0.00008;

      const sinY = Math.sin(currentAngleY);
      const cosY = Math.cos(currentAngleY);
      const sinX = Math.sin(currentAngleX);
      const cosX = Math.cos(currentAngleX);

      // Rotate and update all coordinates first
      particles.forEach((p) => {
        // Rotate Y
        let x1 = p.x * cosY - p.z * sinY;
        let z1 = p.z * cosY + p.x * sinY;
        // Rotate X
        let y2 = p.y * cosX - z1 * sinX;
        let z2 = z1 * cosX + p.y * sinX;

        p.x = x1;
        p.y = y2;
        p.z = z2;
      });

      // Draw subtle connection lines between close particles in 3D space
      ctx.shadowBlur = 0;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dz = particles[i].z - particles[j].z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < 95) {
            const persA = fov / (fov + particles[i].z);
            const persB = fov / (fov + particles[j].z);

            if (persA > 0 && persB > 0) {
              const xA = width / 2 + particles[i].x * persA;
              const yA = height / 2 + particles[i].y * persA;
              const xB = width / 2 + particles[j].x * persB;
              const yB = height / 2 + particles[j].y * persB;

              // Opacity based on distance and depth
              const alpha = (1 - dist / 95) * 0.12 * Math.min(persA, persB);
              ctx.beginPath();
              ctx.moveTo(xA, yA);
              ctx.lineTo(xB, yB);
              ctx.strokeStyle = currentIsDark
                ? `rgba(99, 102, 241, ${alpha})`
                : `rgba(79, 70, 229, ${alpha})`;
              ctx.lineWidth = 0.45 * Math.min(persA, persB);
              ctx.stroke();
            }
          }
        }
      }

      // Sort by depth (Z) for rendering stars
      const sortedParticles = [...particles].sort((a, b) => b.z - a.z);

      sortedParticles.forEach((p) => {
        const perspective = fov / (fov + p.z);
        const projX = width / 2 + p.x * perspective;
        const projY = height / 2 + p.y * perspective;

        if (perspective > 0 && projX >= 0 && projX <= width && projY >= 0 && projY <= height) {
          const radius = Math.max(0.2, p.size * perspective * 1.3);
          const alpha = Math.max(0.1, Math.min(1, perspective * 0.9));
          const pColor = currentColors[p.colorIndex];
          
          ctx.beginPath();
          ctx.arc(projX, projY, radius, 0, Math.PI * 2);
          ctx.fillStyle = pColor;
          ctx.globalAlpha = alpha;
          ctx.fill();

          // Add a subtle bloom glow to particles
          ctx.shadowBlur = 6;
          ctx.shadowColor = pColor;
          ctx.globalAlpha = alpha * 0.25;
          ctx.arc(projX, projY, radius * 1.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0; // reset
        }
      });

      // Draw subtle orbital rings in 3D
      ctx.globalAlpha = currentIsDark ? 0.05 : 0.08;
      ctx.strokeStyle = currentIsDark ? "#818cf8" : "#4f46e5";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, 220, 0, Math.PI * 2);
      ctx.stroke();

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleWindowMouseMove);
    };
  }, []);

  // Try checking/refreshing the session in case the admin updated roles
  const handleRefresh = async () => {
    setIsRefreshing(true);
    setErrorMsg("");
    try {
      const refreshedUser = await getCurrentUser();
      if (refreshedUser) {
        setUser(refreshedUser);
        // Check if role is now valid
        const APP_ROLES = [
          "Director", "Management", "Curriculum Dept", "General Manager", 
          "Branch Manager", "Mentor", "HR Manager", "Administrator", 
          "Instructor", "Batch Coordinator", "Teacher", "Sales User", 
          "Content Admin", "Accounts User", "Parent"
        ];
        const hasValidRole = APP_ROLES.some(r => refreshedUser.roles?.includes(r)) || !!refreshedUser.role_profile_name;
        
        if (hasValidRole) {
          router.push("/");
          return;
        }
      }
      setErrorMsg("No valid dashboard role is assigned to your account yet.");
    } catch (err: any) {
      setErrorMsg("Failed to refresh session. Please try again.");
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className={`relative min-h-screen w-full flex items-center justify-center overflow-hidden font-sans transition-colors duration-300 ${isDarkTheme ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>
      {/* Theme Switcher */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      {/* 3D Canvas Background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-0"
      />

      {/* Glow Orbs */}
      <div className={`absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl -z-10 animate-pulse transition-colors duration-300 ${isDarkTheme ? "bg-indigo-500/10" : "bg-indigo-500/5"}`} />
      <div className={`absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl -z-10 animate-pulse transition-colors duration-300 ${isDarkTheme ? "bg-emerald-500/10" : "bg-emerald-500/5"}`} />

      {/* Main 3D Card Container */}
      <div
        className="relative z-10 w-full max-w-lg mx-4"
        style={{ perspective: "1000px" }}
      >
        <div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onMouseEnter={() => setIsHovered(true)}
          style={{
            transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(${isHovered ? "20px" : "0px"})`,
            transition: isHovered ? "none" : "transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)",
            transformStyle: "preserve-3d",
          }}
          className={`backdrop-blur-xl border rounded-3xl p-8 lg:p-10 shadow-2xl transition-all duration-300 relative ${
            isDarkTheme 
              ? "bg-slate-900/60 border-slate-800/80 shadow-indigo-950/20" 
              : "bg-white/75 border-slate-200 shadow-slate-200/80"
          }`}
        >
          {/* Neon Top Border Edge */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-80" />

          {/* 3D Animated Shield Icon Group */}
          <div 
            className="flex justify-center mb-8"
            style={{ transform: "translateZ(40px)" }}
          >
            <div className={`relative flex items-center justify-center w-24 h-24 rounded-full border shadow-inner transition-colors duration-300 ${isDarkTheme ? "bg-slate-950/80 border-slate-800" : "bg-white border-slate-200"}`}>
              {/* Outer rotating/pulsing aura */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-500/20 via-pink-500/20 to-indigo-500/20 animate-spin opacity-70 blur-md" />
              <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-rose-500/30 to-amber-500/30 opacity-40 blur-lg animate-pulse" />
              
              {/* Central Lock / Shield Icons */}
              <div className="relative z-10 flex items-center justify-center">
                <ShieldAlert className="w-12 h-12 text-rose-500 animate-bounce" style={{ animationDuration: "3s" }} />
                <Lock className={`w-5 h-5 text-amber-400 absolute bottom-1 right-1 rounded-full p-0.5 border ${isDarkTheme ? "bg-slate-950 border-slate-800" : "bg-white border-slate-200"}`} />
              </div>
            </div>
          </div>

          {/* Warning Content */}
          <div className="text-center" style={{ transform: "translateZ(30px)" }}>
            <h1 className={`text-3xl font-extrabold tracking-tight bg-gradient-to-r bg-clip-text text-transparent transition-colors duration-300 ${
              isDarkTheme
                ? "from-slate-100 via-rose-200 to-slate-100"
                : "from-slate-800 via-rose-600 to-slate-800"
            }`}>
              Access Restricted
            </h1>
            <p className={`mt-3 text-sm leading-relaxed transition-colors duration-300 ${isDarkTheme ? "text-slate-400" : "text-slate-600"}`}>
              Your account is successfully logged in, but you do not currently have an authorized portal role assigned.
            </p>
          </div>

          {/* User Details Box */}
          {isAuthenticated && user && (
            <div 
              className={`mt-6 border rounded-2xl p-4 space-y-3 transition-colors duration-300 ${
                isDarkTheme ? "bg-slate-950/60 border-slate-800/80" : "bg-slate-50 border-slate-200"
              }`}
              style={{ transform: "translateZ(25px)" }}
            >
              <div className={`flex items-center space-x-3 text-xs border-b pb-2 transition-colors duration-300 ${isDarkTheme ? "text-slate-400 border-slate-800/60" : "text-slate-500 border-slate-200"}`}>
                <User className="w-4 h-4 text-indigo-400" />
                <span className={`font-semibold ${isDarkTheme ? "text-slate-300" : "text-slate-700"}`}>Account Information</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <span className={isDarkTheme ? "text-slate-500" : "text-slate-400"}>Name:</span>
                <span className={`col-span-2 font-medium truncate ${isDarkTheme ? "text-slate-300" : "text-slate-800"}`}>{user.full_name || "N/A"}</span>
                
                <span className={isDarkTheme ? "text-slate-500" : "text-slate-400"}>Email:</span>
                <span className={`col-span-2 font-medium truncate ${isDarkTheme ? "text-slate-300" : "text-slate-800"}`}>{user.email || "N/A"}</span>

                <span className={isDarkTheme ? "text-slate-500" : "text-slate-400"}>Roles:</span>
                <span className={`col-span-2 font-medium truncate ${isDarkTheme ? "text-slate-300" : "text-slate-800"}`}>
                  {user.roles && user.roles.length > 0 ? user.roles.join(", ") : "None Assigned"}
                </span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div 
              className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center text-xs text-rose-400"
              style={{ transform: "translateZ(20px)" }}
            >
              {errorMsg}
            </div>
          )}

          {/* Interactive Button Group */}
          <div 
            className="mt-8 grid grid-cols-2 gap-4"
            style={{ transform: "translateZ(35px)" }}
          >
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-xs font-semibold border transition-all duration-200 disabled:opacity-50 cursor-pointer ${
                isDarkTheme
                  ? "bg-slate-800 hover:bg-slate-700 active:bg-slate-800 text-slate-200 border-slate-700/60"
                  : "bg-slate-100 hover:bg-slate-200 active:bg-slate-150 text-slate-800 border-slate-200"
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>{isRefreshing ? "Checking..." : "Refresh Roles"}</span>
            </button>

            <button
              onClick={logout}
              className="flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white shadow-lg shadow-rose-950/20 border border-rose-500/30 transition-all duration-200 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>

          {/* Help Info Link */}
          <div 
            className={`mt-6 text-center text-[11px] flex items-center justify-center space-x-1.5 transition-colors duration-300 ${isDarkTheme ? "text-slate-500" : "text-slate-400"}`}
            style={{ transform: "translateZ(15px)" }}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Please contact your administrator to grant dashboard access permissions.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
