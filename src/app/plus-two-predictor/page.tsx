"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";

// Dynamically import 3D background with SSR disabled to avoid WebGL server-side rendering issues
const Background3D = dynamic(
  () => import("@/components/predictor/Background3D"),
  { ssr: false }
);

export default function PlusTwoPredictorLanding() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [stream, setStream] = useState("Science");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [district, setDistrict] = useState("");
  const [agree, setAgree] = useState(false);

  // Pre-fill fields if user came back from the mark entry page
  useEffect(() => {
    const pName = searchParams.get("name");
    const pPhone = searchParams.get("phone");
    const pDistrict = searchParams.get("district");
    const pStream = searchParams.get("stream");

    if (pName) setName(pName);
    if (pPhone) setPhone(pPhone);
    if (pDistrict) setDistrict(pDistrict);
    if (pStream) setStream(pStream);
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !district || !agree) {
      alert("Please fill in all details and agree to terms.");
      return;
    }
    
    const query = new URLSearchParams();
    query.set("name", name);
    query.set("phone", phone);
    query.set("district", district);
    query.set("stream", stream);

    router.push(`/plus-two-predictor/mark-entry?${query.toString()}`);
  };

  return (
    <div className="min-h-screen relative flex flex-col md:flex-row font-sans text-slate-800 overflow-x-hidden">
      {/* 3D Background Component */}
      <Background3D />

      {/* Left Column: Branding / Info with Motion animations */}
      <div className="w-full md:w-1/2 p-8 md:p-16 flex flex-col justify-between min-h-[350px] md:min-h-screen relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-3"
        >
          <Image
            src="/smartup-logo-v2.png"
            alt="SmartUp"
            width={38}
            height={38}
            className="object-contain block flex-shrink-0 drop-shadow-sm"
          />
          <span className="text-slate-800 text-xl tracking-[0.15em] uppercase leading-none font-black drop-shadow-sm">
            SMART UP
          </span>
        </motion.div>
        
        <div className="my-auto space-y-8 max-w-lg pt-12 md:pt-0">
          <motion.h1 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight text-slate-800"
          >
            Plus One Result വെച്ച് <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5f2ea8] to-indigo-600">
              Plus Two A+
            </span> അറിയാം
          </motion.h1>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="space-y-4 text-base md:text-lg text-slate-600"
          >
            <div className="flex items-center gap-3 bg-white/60 backdrop-blur-md p-3.5 rounded-xl border border-white/80 shadow-sm hover:shadow-md transition">
              <span className="bg-purple-100 text-[#5f2ea8] p-1.5 rounded-lg text-sm font-bold">✓</span>
              <span>ഏതൊക്കെ Subject Improve ചെയ്യണം?</span>
            </div>
            <div className="flex items-center gap-3 bg-white/60 backdrop-blur-md p-3.5 rounded-xl border border-white/80 shadow-sm hover:shadow-md transition">
              <span className="bg-purple-100 text-[#5f2ea8] p-1.5 rounded-lg text-sm font-bold">✓</span>
              <span>ഓരോ Subject ലും A+ ന് എത്ര Mark വേണം?</span>
            </div>
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-xs text-slate-400 pt-6 md:pt-0"
        >
          © {new Date().getFullYear()} SmartUp. All rights reserved.
        </motion.div>
      </div>

      {/* Right Column: Premium Glassmorphic Form Card */}
      <div className="w-full md:w-1/2 p-6 md:p-12 flex items-center justify-center relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-md bg-white/75 backdrop-blur-xl border border-white/80 p-8 rounded-3xl shadow-[0_8px_32px_0_rgba(124,58,237,0.06)] space-y-6"
        >
          <div className="space-y-1">
            <h2 className="text-2xl font-extrabold text-slate-800">
              Enter Details
            </h2>
            <p className="text-xs text-slate-500">Provide details to calculate your Plus Two predictions</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              {/* Stream */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Your Stream</label>
                <select
                  value={stream}
                  onChange={(e) => setStream(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5f2ea8] focus:border-transparent text-slate-800 cursor-pointer transition shadow-sm"
                >
                  <option value="Science">Science</option>
                </select>
              </div>

              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Your Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name"
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5f2ea8] focus:border-transparent text-slate-800 placeholder:text-slate-400 transition shadow-sm"
                  required
                />
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Phone Number</label>
                <div className="flex gap-2">
                  <span className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-semibold text-sm">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Number"
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5f2ea8] focus:border-transparent text-slate-800 placeholder:text-slate-400 transition shadow-sm"
                    required
                  />
                </div>
              </div>

              {/* District */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Your District</label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5f2ea8] focus:border-transparent text-slate-800 cursor-pointer transition shadow-sm"
                  required
                >
                  <option value="">Select your district</option>
                  <option value="Thiruvananthapuram">Thiruvananthapuram</option>
                  <option value="Kollam">Kollam</option>
                  <option value="Pathanamthitta">Pathanamthitta</option>
                  <option value="Alappuzha">Alappuzha</option>
                  <option value="Kottayam">Kottayam</option>
                  <option value="Idukki">Idukki</option>
                  <option value="Ernakulam">Ernakulam</option>
                  <option value="Thrissur">Thrissur</option>
                  <option value="Palakkad">Palakkad</option>
                  <option value="Malappuram">Malappuram</option>
                  <option value="Kozhikode">Kozhikode</option>
                  <option value="Wayanad">Wayanad</option>
                  <option value="Kannur">Kannur</option>
                  <option value="Kasaragod">Kasaragod</option>
                </select>
              </div>
            </div>

            <div className="flex items-start gap-2 pt-2">
              <input
                type="checkbox"
                id="consent"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="mt-1 h-4 w-4 bg-white border-slate-300 text-[#5f2ea8] rounded focus:ring-[#5f2ea8] focus:ring-offset-0 transition cursor-pointer"
              />
              <label htmlFor="consent" className="text-xs text-slate-500 leading-tight select-none cursor-pointer">
                I agree to the privacy policy and consent to being contacted about my results.
              </label>
            </div>

            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="w-full p-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold rounded-xl transition shadow-lg shadow-purple-500/10 cursor-pointer uppercase tracking-wider text-sm mt-3"
            >
              Show My Prediction
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
