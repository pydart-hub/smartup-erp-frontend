# Academics Overview Structure

## Goal

Make every number in Director Academics Overview come from a consistent academic source of truth.

## Canonical hierarchy

1. Class overview
   Source: latest submitted `Program Enrollment` for every `enabled = 1` student.

2. Class -> subject overview
   Source: active `Course Enrollment` rows linked to those latest submitted program enrollments.

3. Subject -> branch overview
   Source: same `Course Enrollment` universe, split by branch.

4. Subject -> branch -> student list
   Source: same `Course Enrollment` universe, then enrich with attendance and assessment results.

## Counting rules

### `class.total_students`
- Count distinct active students from latest submitted `Program Enrollment`.

### `subject.total_students`
- Count distinct active students with active `Course Enrollment` for that subject
- Do not derive this from schedules
- Do not derive this from assessment results

### `branch.total_students`
- Count distinct active students in the class or subject universe for that branch
- Prefer enrollment batch mapping over `Student.custom_branch` when resolving branch

## Metric rules

### Attendance
- Use `Student Attendance`
- Attendance is a metric on the population
- Attendance must not define who belongs to the population

### Avg score
- Use submitted `Assessment Result`
- Score is a metric on the population
- Score must not define who belongs to the population

### Pass rate
- Use submitted `Assessment Result`
- Pass rate is based on assessed students
- It must not change the student population count

## Ordering

Preferred class order:

1. `10th State`
2. `10th CBSE`
3. `9th State`
4. `9th CBSE`
5. `8th State`
6. `8th CBSE`
7. `7th State`
8. `7th CBSE`
9. `6th State`
10. `6th CBSE`
11. `5th State`
12. `5th CBSE`
13. `12th Science State`
14. `12th Science CBSE`
15. `11th Science State`
16. `11th Science CBSE`

## Anti-patterns to avoid

- Counting students from attendance rows
- Counting students from schedule rows
- Counting students from exam results only
- Summing branch counts when the page should show the class universe directly
- Using different student universes at different drill-down levels
