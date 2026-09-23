export interface InstructorFeedbackRecord {
  name: string;
  instructor: string;
  instructor_name: string;
  branch: string;
  course?: string;
  program?: string;
  student?: string;
  student_name: string;
  student_phone?: string;
  is_anonymous: number | boolean;
  rating: number; // 1 to 5
  strengths?: string; // Comma-separated or JSON
  weaknesses?: string; // Comma-separated or JSON
  detailed_feedback?: string;
  suggestions?: string;
  review_date?: string;
  status: "Published" | "Hidden" | "Flagged";
  creation?: string;
}

export const COMMON_INSTRUCTOR_STRENGTHS = [
  "Clear Explanations",
  "Doubt Clearance",
  "Friendly & Patient",
  "Engaging Teaching Style",
  "Punctual & Dedicated",
  "Excellent Exam Prep",
  "Good Quality Notes",
  "Encouraging & Motivating",
  "Practical Examples",
  "Strong Subject Knowledge",
];

export const COMMON_INSTRUCTOR_WEAKNESSES = [
  "Teaching Speed Too Fast",
  "Teaching Speed Too Slow",
  "Low Voice / Audio Clarity",
  "Needs More Problem Solving",
  "Less Student Interaction",
  "Strict Classroom Handling",
  "Needs Regular Note Checking",
  "Needs More Revision Sessions",
  "Heavy Homework Load",
];
