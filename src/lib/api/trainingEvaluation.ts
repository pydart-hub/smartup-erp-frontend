import apiClient from "./client";
import type { FrappeListResponse, FrappeSingleResponse } from "@/lib/types/api";

// ── Training Evaluation Scorecard types & client API ────────────────────────────────────

export interface TeacherTrainingEvaluation {
  name: string; // Document ID
  teacher_name: string; // Instructor reference (ID/name)
  teacher_display_name?: string; // Display name
  branch: string; // Branch / Company
  subject: string; // Subject / Course
  evaluator: string; // Evaluator Name
  evaluation_date: string; // Date
  program_name: string; // e.g. "15-Day Professional Development Program"
  
  // Evaluation Criteria Scores
  classroom_presence: number; // Max 10
  lesson_planning: number; // Max 10
  teaching_presentation: number; // Max 15
  voice_modulation: number; // Max 10
  student_engagement: number; // Max 10
  classroom_management: number; // Max 15
  board_work: number; // Max 10
  time_management: number; // Max 5
  parent_communication: number; // Max 5
  overall_demonstration: number; // Max 10
  
  total_score: number; // Max 100
  
  // Remarks
  strengths: string;
  areas_for_improvement: string;
}

const DOCTYPE = "SU Teacher Training Evaluation";

export async function getEvaluations(): Promise<TeacherTrainingEvaluation[]> {
  const params = {
    fields: JSON.stringify([
      "name", "teacher_name", "branch", "subject", "evaluator", 
      "evaluation_date", "program_name", "total_score", "strengths", "areas_for_improvement"
    ]),
    limit_page_length: "500",
    order_by: "modified desc",
  };
  
  const { data } = await apiClient.get<FrappeListResponse<TeacherTrainingEvaluation>>(
    `/resource/${DOCTYPE}`, 
    { params }
  );

  // Map fields to include teacher_display_name defaults if missing
  return (data.data || []).map(item => ({
    ...item,
    teacher_display_name: item.teacher_name, // Map display name directly
  }));
}

export async function getEvaluation(name: string): Promise<TeacherTrainingEvaluation | undefined> {
  const { data } = await apiClient.get<FrappeSingleResponse<TeacherTrainingEvaluation>>(
    `/resource/${DOCTYPE}/${encodeURIComponent(name)}`
  );
  if (data.data) {
    return {
      ...data.data,
      teacher_display_name: data.data.teacher_name,
    };
  }
  return undefined;
}

export async function createEvaluation(data: Omit<TeacherTrainingEvaluation, "name" | "total_score">): Promise<TeacherTrainingEvaluation> {
  const total_score =
    data.classroom_presence +
    data.lesson_planning +
    data.teaching_presentation +
    data.voice_modulation +
    data.student_engagement +
    data.classroom_management +
    data.board_work +
    data.time_management +
    data.parent_communication +
    data.overall_demonstration;

  const payload = {
    ...data,
    total_score,
  };

  const { data: responseData } = await apiClient.post<FrappeSingleResponse<TeacherTrainingEvaluation>>(
    `/resource/${DOCTYPE}`,
    payload
  );
  return responseData.data;
}

export async function updateEvaluation(name: string, data: Partial<Omit<TeacherTrainingEvaluation, "name">>): Promise<TeacherTrainingEvaluation> {
  // Recalculate score if metrics are provided
  let total_score: number | undefined = undefined;
  
  if (
    data.classroom_presence !== undefined ||
    data.lesson_planning !== undefined ||
    data.teaching_presentation !== undefined ||
    data.voice_modulation !== undefined ||
    data.student_engagement !== undefined ||
    data.classroom_management !== undefined ||
    data.board_work !== undefined ||
    data.time_management !== undefined ||
    data.parent_communication !== undefined ||
    data.overall_demonstration !== undefined
  ) {
    // If updating metrics, we should fetch current document or calculate based on passed values
    const current = await getEvaluation(name);
    if (current) {
      const updatedMetrics = {
        classroom_presence: data.classroom_presence ?? current.classroom_presence,
        lesson_planning: data.lesson_planning ?? current.lesson_planning,
        teaching_presentation: data.teaching_presentation ?? current.teaching_presentation,
        voice_modulation: data.voice_modulation ?? current.voice_modulation,
        student_engagement: data.student_engagement ?? current.student_engagement,
        classroom_management: data.classroom_management ?? current.classroom_management,
        board_work: data.board_work ?? current.board_work,
        time_management: data.time_management ?? current.time_management,
        parent_communication: data.parent_communication ?? current.parent_communication,
        overall_demonstration: data.overall_demonstration ?? current.overall_demonstration,
      };
      total_score = Object.values(updatedMetrics).reduce((a, b) => a + b, 0);
    }
  }

  const payload = {
    ...data,
    ...(total_score !== undefined ? { total_score } : {}),
  };

  const { data: responseData } = await apiClient.put<FrappeSingleResponse<TeacherTrainingEvaluation>>(
    `/resource/${DOCTYPE}/${encodeURIComponent(name)}`,
    payload
  );
  return responseData.data;
}

export async function deleteEvaluation(name: string): Promise<boolean> {
  await apiClient.delete(`/resource/${DOCTYPE}/${encodeURIComponent(name)}`);
  return true;
}
