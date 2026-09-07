-- Update durationMinutes for Scholarship Papers and ExamPublishings to match totalQuestions (1 min per question)
UPDATE "Paper"
SET "durationMinutes" = "totalQuestions"
WHERE id LIKE 'paper-scholarship-%';

UPDATE "ExamPublishing" ep
SET "durationMinutes" = p."totalQuestions"
FROM "Paper" p
WHERE ep."paperId" = p.id
  AND (ep.slug LIKE 'scholarship-%' OR ep.title ILIKE '%scholarship%');
