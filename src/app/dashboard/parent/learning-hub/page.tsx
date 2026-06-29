"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Video, BookOpen } from "lucide-react";
import { ThreeDCard } from "@/components/learning-hub/ThreeDCard";
import { motion } from "framer-motion";

export default function ParentLearningHub() {
  const router = useRouter();

  const handleCardClick = () => {
    router.push("/dashboard/under-development");
  };

  return (
    <div className="min-h-full flex flex-col gap-8 py-4">
      {/* Header section with entrance animation */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col gap-2"
      >
        <span className="text-sm font-semibold tracking-wider text-indigo-600 dark:text-indigo-400 uppercase">
          Portal Resources
        </span>
        <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-800 dark:text-white tracking-tight">
          Learning Hub
        </h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-2xl text-base">
          Access high-quality study materials and interactive video lessons curated specifically for student academic success.
        </p>
      </motion.div>

      {/* Cards container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="flex flex-wrap gap-8 justify-start items-center mt-4"
      >
        <ThreeDCard
          title="Video Classes"
          description="High-definition online video lectures and recorded classroom sessions to learn subjects at your own pace."
          icon={<Video className="h-6 w-6" />}
          gradientFrom="from-blue-600"
          gradientTo="to-indigo-600"
          badge="Interactive"
          onClick={() => router.push("/dashboard/parent/video-classes")}
        />

        <ThreeDCard
          title="Study Material"
          description="Comprehensive textbooks, syllabus guides, reference worksheets, and past exam questions to excel academically."
          icon={<BookOpen className="h-6 w-6" />}
          gradientFrom="from-violet-600"
          gradientTo="to-purple-600"
          badge="Curated"
          onClick={handleCardClick}
        />
      </motion.div>
    </div>
  );
}
