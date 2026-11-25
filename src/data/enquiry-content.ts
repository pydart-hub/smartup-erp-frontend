import type { PlanOption } from "@/components/enquiry/types";

export const CONTACT_INFO = {
  organization: "Smart Up Education",
  location: "Kochi, Kerala",
  websiteUrl: "https://smartupedu.in",
  websiteLabel: "smartupedu.in",
  whatsappDigits: "919847000000",
  whatsappDisplay: "+91 98470 00000",
  email: "admissions@smartupedu.in",
};

export const KEY_FACTS = [
  { label: "Classes 8–10", value: "CBSE Science" },
  { label: "Classes 11–12", value: "Science & Commerce" },
  { label: "Batches", value: "1:1 · 1:3 · Micro" },
  { label: "Mode", value: "Live + Recordings" },
];

export const CORE_HIGHLIGHTS = [
  {
    title: "Diagnostic First",
    description: "Target weak chapters from day one.",
  },
  {
    title: "Live + Recorded",
    description: "Interactive classes with anytime replays.",
  },
  {
    title: "Board Papers",
    description: "Previous-year questions, notes & worksheets.",
  },
  {
    title: "Parent Updates",
    description: "Weekly tests and clear score reports.",
  },
];

export interface PlanCardData {
  id: PlanOption;
  badge: string;
  title: string;
  subtitle: string;
  featured?: boolean;
  ctaLabel: string;
  highlights: string[];
}

export const PLANS: PlanCardData[] = [
  {
    id: "1:1 Personal",
    badge: "Personalised",
    title: "1:1 Personal",
    subtitle: "1 teacher · 1 student",
    featured: true,
    ctaLabel: "Select 1:1",
    highlights: [
      "Personal study plan & schedule",
      "Live 1:1 doubt clearing",
      "Bi-weekly parent updates",
    ],
  },
  {
    id: "1:3 Small Group",
    badge: "3 Max",
    title: "1:3 Small Group",
    subtitle: "1 teacher · 3 students",
    featured: false,
    ctaLabel: "Select 1:3",
    highlights: [
      "Small-group live classes",
      "Dedicated class doubt clearing",
      "Weekly scores & feedback",
    ],
  },
  {
    id: "Micro Batch",
    badge: "Best Value",
    title: "Micro Batch",
    subtitle: "10+ students",
    featured: false,
    ctaLabel: "Select Micro",
    highlights: [
      "Interactive live classes & polls",
      "Weekly & monthly tests",
      "Monthly progress summary",
    ],
  },
];

export const FAQS = [
  {
    question: "Classes & subjects covered?",
    answer:
      "CBSE Classes 8–10 (Science) and Classes 11–12 (Science & Commerce).",
  },
  {
    question: "Live or recorded classes?",
    answer: "Live interactive classes with recorded replays of every chapter.",
  },
  {
    question: "How do parents track progress?",
    answer: "Weekly tests with regular parent score updates.",
  },
  {
    question: "What are the fees?",
    answer:
      "Submit the form above to get class-wise fees and GCC batch timings.",
  },
];
