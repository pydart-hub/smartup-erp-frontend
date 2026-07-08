"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Video, BookOpen, Link2, ListVideo } from "lucide-react";
import { ThreeDCard } from "@/components/learning-hub/ThreeDCard";
import { motion } from "framer-motion";

export default function GMLearningHub() {
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
          Management Console
        </span>
        <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-800 dark:text-white tracking-tight">
          Learning Hub Management
        </h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-2xl text-base">
          Configure resource mapping and assign video classroom links or study materials to respective classes and batches.
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
          title="Topic wise video classes"
          description="Map virtual meeting links, recorded lecture feeds, and online video playlists to specific courses and batches."
          icon={
            <div className="relative">
              <Video className="h-6 w-6" />
              <Link2 className="h-3 w-3 absolute -bottom-1 -right-1 bg-indigo-600 rounded-full text-white" />
            </div>
          }
          gradientFrom="from-cyan-600"
          gradientTo="to-blue-600"
          badge="Assign Link"
          onClick={() => router.push("/dashboard/general-manager/topic-coverage/manage")}
        />

        <ThreeDCard
          title="Chapter wise Video classes"
          description="Upload subject and chapter-wise video links for each student group (10th State, 10th CBSE, etc.). Parents browse by their child's class."
          icon={<ListVideo className="h-6 w-6" />}
          gradientFrom="from-violet-600"
          gradientTo="to-indigo-600"
          badge="Manage"
          onClick={() => router.push("/dashboard/general-manager/group-video-classes")}
        />

        <ThreeDCard
          title="Study Material Link Assign"
          description="Upload digital books, reference PDFs, notes folders, and assign content access privileges to student categories."
          icon={
            <div className="relative">
              <BookOpen className="h-6 w-6" />
              <Link2 className="h-3 w-3 absolute -bottom-1 -right-1 bg-purple-600 rounded-full text-white" />
            </div>
          }
          gradientFrom="from-pink-600"
          gradientTo="to-rose-600"
          badge="Assign Material"
          onClick={handleCardClick}
        />
      </motion.div>
    </div>
  );
}
