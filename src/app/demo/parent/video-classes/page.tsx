"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Video, Play, Clock, BookOpen, ExternalLink, Youtube, CalendarX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DEMO_CHILDREN, DEMO_ATTENDANCE } from "../demoData";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

// Weekly timetable: day index (0=Sun,1=Mon,...,6=Sat) -> subject info
interface TimetableSlot {
  subject: string;
  topic: string;
  teacher: string;
  duration: string;
  youtubeUrl: string;
}

// Each child has a weekly timetable keyed by day-of-week (1=Mon ... 6=Sat)
const TIMETABLES: Record<string, Record<number, TimetableSlot>> = {
  [DEMO_CHILDREN[0].id]: { // Akhil — 10th Grade
    1: { subject: "Mathematics",      topic: "Quadratic Equations",             teacher: "Mr. Arjun Nair",    duration: "45 min", youtubeUrl: "https://www.youtube.com/live/XTPZG0OjQsg?si=eFrKndLqLJdZBiRE" },
    2: { subject: "Science",          topic: "Light — Reflection & Refraction", teacher: "Mrs. Deepa Menon",  duration: "55 min", youtubeUrl: "https://www.youtube.com/live/XTPZG0OjQsg?si=eFrKndLqLJdZBiRE" },
    3: { subject: "Social Science",   topic: "Nationalism in Europe",           teacher: "Mr. Rajan K",       duration: "50 min", youtubeUrl: "https://www.youtube.com/live/XTPZG0OjQsg?si=eFrKndLqLJdZBiRE" },
    4: { subject: "English",          topic: "Tenses & Voice",                  teacher: "Ms. Priya Thomas",  duration: "35 min", youtubeUrl: "https://www.youtube.com/live/XTPZG0OjQsg?si=eFrKndLqLJdZBiRE" },
    5: { subject: "Mathematics",      topic: "Arithmetic Progressions",         teacher: "Mr. Arjun Nair",    duration: "45 min", youtubeUrl: "https://www.youtube.com/live/XTPZG0OjQsg?si=eFrKndLqLJdZBiRE" },
    6: { subject: "Computer Science", topic: "Python Basics — Functions",       teacher: "Mr. Sujith M",      duration: "60 min", youtubeUrl: "https://www.youtube.com/live/XTPZG0OjQsg?si=eFrKndLqLJdZBiRE" },
  },
};

interface MissedEntry {
  date: string;
  dayLabel: string;
  slot: TimetableSlot;
}

function getMissedEntries(studentId: string): MissedEntry[] {
  const attendance = DEMO_ATTENDANCE[studentId] ?? [];
  const timetable = TIMETABLES[studentId] ?? {};
  return attendance
    .filter((r) => r.status === "Absent")
    .map((r) => {
      const dt = new Date(r.date);
      const dow = dt.getDay(); // 0=Sun … 6=Sat
      const slot = timetable[dow];
      if (!slot) return null;
      return {
        date: r.date,
        dayLabel: dt.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }),
        slot,
      };
    })
    .filter((e): e is MissedEntry => e !== null)
    .sort((a, b) => b.date.localeCompare(a.date)); // newest first
}

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:live\/|watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

const SUBJECT_COLORS: Record<string, string> = {
  Mathematics:      "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Science:          "bg-green-500/10 text-green-400 border-green-500/20",
  English:          "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "Social Science": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "Computer Science": "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  Hindi:            "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

export default function DemoVideoClassesPage() {
  const [selectedChild, setSelectedChild] = useState(DEMO_CHILDREN[0].id);

  const child = DEMO_CHILDREN.find((c) => c.id === selectedChild)!;
  const missed = getMissedEntries(selectedChild);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Missed Class Recordings</h1>
          <p className="text-sm text-text-secondary mt-1">
            Classes missed due to absence — watch the recorded session on YouTube
          </p>
        </div>
        <select
          value={selectedChild}
          onChange={(e) => setSelectedChild(e.target.value)}
          className="rounded-[10px] border border-border-light bg-surface text-text-primary text-sm px-3 py-2 outline-none focus:border-primary"
        >
          {DEMO_CHILDREN.map((c) => (
            <option key={c.id} value={c.id}>{c.name} — {c.class}</option>
          ))}
        </select>
      </motion.div>

      {/* Summary strip */}
      {missed.length > 0 && (
        <motion.div variants={item} className="flex items-center gap-3 px-4 py-3 rounded-[10px] bg-warning-light border border-amber-500/20">
          <CalendarX className="h-5 w-5 text-amber-400 shrink-0" />
          <p className="text-sm text-amber-300">
            <span className="font-semibold">{child.name}</span> was absent on{" "}
            <span className="font-semibold">{missed.length} day{missed.length !== 1 ? "s" : ""}</span> this month.
            Recordings are available below.
          </p>
        </motion.div>
      )}

      {/* Cards */}
      <motion.div variants={container} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {missed.map((entry) => (
          <MissedVideoCard key={`${entry.date}-${entry.slot.subject}`} entry={entry} />
        ))}
      </motion.div>

      {missed.length === 0 && (
        <motion.div variants={item} className="text-center py-16 text-text-tertiary">
          <Video className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No missed class recordings</p>
          <p className="text-xs mt-1">
            {child.name} has not been absent this month. Keep it up!
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}

function MissedVideoCard({ entry }: { entry: MissedEntry }) {
  const { date, dayLabel, slot } = entry;
  const videoId = getYouTubeId(slot.youtubeUrl);
  const thumbnailUrl = videoId
    ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    : null;
  const subjectColor = SUBJECT_COLORS[slot.subject] ?? "bg-primary/10 text-primary border-primary/20";

  return (
    <motion.div variants={item}>
      <Card className="overflow-hidden group hover:border-primary/30 transition-colors">
        {/* YouTube Thumbnail */}
        <a
          href={slot.youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block relative aspect-video bg-black overflow-hidden"
          aria-label={`Watch ${slot.topic} on YouTube`}
        >
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={slot.topic}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-[#2DD4BF]/10">
              <Video className="h-10 w-10 text-text-tertiary" />
            </div>
          )}
          {/* Play overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
              <Play className="h-6 w-6 text-white fill-white ml-1" />
            </div>
          </div>
          {/* YouTube badge */}
          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/80 rounded px-1.5 py-0.5">
            <Youtube className="h-3 w-3 text-red-500" />
            <span className="text-[10px] text-white font-medium">YouTube</span>
          </div>
          {/* Absent date tag */}
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/70 rounded px-2 py-0.5">
            <CalendarX className="h-3 w-3 text-amber-400" />
            <span className="text-[10px] text-amber-300 font-medium">Absent · {dayLabel}</span>
          </div>
        </a>

        {/* Info */}
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-text-primary leading-snug">{slot.topic}</p>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${subjectColor}`}>
              {slot.subject}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-text-tertiary">
            <span className="flex items-center gap-1">
              <BookOpen className="h-3 w-3" />
              {slot.teacher}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {slot.duration}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-border-light">
            <div className="flex items-center gap-1.5">
              <Badge variant="warning">Absent</Badge>
              <span className="text-xs text-text-tertiary">{dayLabel}</span>
            </div>
            <a
              href={slot.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Watch now
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
