import json
import re
from collections import defaultdict
from datetime import datetime, time

import frappe
from frappe import _
from frappe.utils import get_datetime, now, nowdate


LEVEL_PATTERN = re.compile(r"\b(10|[8-9])(?:st|nd|rd|th)?\b", re.IGNORECASE)


def _parse_jsonish(value):
    if value is None:
        return None
    if isinstance(value, (list, tuple, dict)):
        return value
    if isinstance(value, str):
        raw = value.strip()
        if not raw:
            return None
        try:
            return json.loads(raw)
        except Exception:
            return [item.strip() for item in raw.split(",") if item.strip()]
    return value


def _normalize_levels(levels):
    parsed = _parse_jsonish(levels) or []
    cleaned = []
    for item in parsed:
        value = str(item).strip()
        if value in {"8", "9", "10"} and value not in cleaned:
            cleaned.append(value)
    return cleaned


def _derive_level(program):
    match = LEVEL_PATTERN.search(program or "")
    return match.group(1) if match else None


def _to_time(value):
    if not value:
        return None
    if isinstance(value, time):
        return value
    if isinstance(value, datetime):
        return value.time()
    text = str(value)
    for fmt in ("%H:%M:%S", "%H:%M"):
        try:
            return datetime.strptime(text, fmt).time()
        except ValueError:
            continue
    return None


def _assignment_status(assignment, assignment_status, attempt=None):
    if assignment_status == "Submitted":
        return "completed"
    if attempt and attempt.get("status") == "In Progress":
        return "in_progress"

    schedule_date = assignment.get("schedule_date")
    start_time = _to_time(assignment.get("start_time"))
    end_time = _to_time(assignment.get("end_time"))
    now_dt = get_datetime()

    if schedule_date:
        start_dt = get_datetime(f"{schedule_date} {start_time or time(0, 0, 0)}")
        if now_dt < start_dt:
            return "upcoming"
    return "available"


def _seconds_remaining(assignment, started_on):
    started_dt = get_datetime(started_on)
    duration = int(assignment.get("duration_minutes") or 0)
    ends_at = started_dt.timestamp() + (duration * 60)
    return max(0, int(ends_at - datetime.now().timestamp()))


def _get_child_row(doc, table_field, key_field, key_value):
    for row in doc.get(table_field) or []:
        if getattr(row, key_field, None) == key_value:
            return row
    return None


def _get_question_details(question_names):
    if not question_names:
        return {}

    questions = frappe.get_all(
        "Level Exam Question",
        filters={"name": ["in", question_names]},
        fields=[
            "name",
            "subject",
            "class_level",
            "question_text",
            "difficulty",
            "correct_option_key",
            "explanation",
        ],
        limit_page_length=0,
    )
    options = frappe.get_all(
        "Level Exam Question Option",
        filters={"parent": ["in", question_names], "parenttype": "Level Exam Question"},
        fields=["parent", "option_key", "option_text", "idx"],
        order_by="parent asc, idx asc",
        limit_page_length=0,
    )

    option_map = defaultdict(list)
    for option in options:
        option_map[option.parent].append(
            {
                "id": option.option_key,
                "option_key": option.option_key,
                "option_text": option.option_text,
            }
        )

    result = {}
    for question in questions:
        result[question.name] = {
            "id": question.name,
            "stem": question.question_text,
            "difficulty": (question.difficulty or "Easy").lower(),
            "correct_option_key": question.correct_option_key,
            "explanation": question.explanation,
            "options": option_map.get(question.name, []),
        }
    return result


def _get_latest_enrollments(levels=None, student_group=None):
    filters = {"docstatus": 1}
    if student_group:
        filters["student_batch_name"] = student_group

    rows = frappe.get_all(
        "Program Enrollment",
        filters=filters,
        fields=["student", "student_name", "program", "student_batch_name", "enrollment_date", "creation"],
        order_by="enrollment_date desc, creation desc",
        limit_page_length=0,
    )

    latest = {}
    for row in rows:
        if row.student in latest:
            continue
        level = _derive_level(row.program)
        if not level:
            continue
        if levels and level not in levels:
            continue
        latest[row.student] = {
            "student": row.student,
            "student_name": row.student_name,
            "program": row.program,
            "student_group": row.student_batch_name,
            "class_level": level,
        }
    return list(latest.values())


def _paper_totals(paper_doc):
    total_marks = sum(int(row.marks or 0) for row in paper_doc.questions or [])
    total_questions = len(paper_doc.questions or [])
    return total_questions, total_marks


def _build_result(attempt_doc):
    assignment_doc = frappe.get_doc("Level Exam Assignment", attempt_doc.assignment)
    paper_doc = frappe.get_doc("Level Exam Paper", attempt_doc.exam_paper)
    question_names = [row.question for row in paper_doc.questions or [] if row.question]
    question_details = _get_question_details(question_names)
    answers_by_question = {row.question: row for row in attempt_doc.answers or []}

    question_rows = []
    for paper_row in sorted(paper_doc.questions or [], key=lambda row: int(row.display_order or row.idx or 0)):
        detail = question_details.get(paper_row.question)
        if not detail:
            continue
        answer_row = answers_by_question.get(paper_row.question)
        selected_key = answer_row.selected_option_key if answer_row else None
        correct_key = detail["correct_option_key"]
        is_correct = bool(selected_key and selected_key == correct_key)
        question_rows.append(
            {
                "question_id": paper_row.question,
                "stem": detail["stem"],
                "marks": int(paper_row.marks or 0),
                "selected_option_id": selected_key,
                "correct_option_id": correct_key,
                "is_correct": is_correct,
                "explanation": detail.get("explanation"),
                "options": [
                    {
                        **option,
                        "is_correct": option["option_key"] == correct_key,
                    }
                    for option in detail["options"]
                ],
            }
        )

    return {
        "attempt_id": attempt_doc.name,
        "exam_id": attempt_doc.assignment,
        "title": assignment_doc.assignment_title or paper_doc.paper_title,
        "subject_name": attempt_doc.subject,
        "level_code": str(attempt_doc.class_level),
        "child": {
            "student_id": attempt_doc.student,
            "student_name": attempt_doc.student_name,
        },
        "submitted_at": str(attempt_doc.submitted_on or attempt_doc.started_on or now()),
        "status": "auto_submitted" if attempt_doc.status == "Auto Submitted" else "submitted",
        "score_obtained": int(attempt_doc.score_obtained or 0),
        "total_marks": int(attempt_doc.total_marks or 0),
        "percentage": int(attempt_doc.percentage or 0),
        "correct_count": int(attempt_doc.correct_count or 0),
        "wrong_count": int(attempt_doc.wrong_count or 0),
        "unanswered_count": int(attempt_doc.unanswered_count or 0),
        "questions": question_rows,
    }


@frappe.whitelist()
def get_level_exam_list(student):
    student = str(student or "").strip()
    if not student:
        frappe.throw(_("Student is required"))

    assignment_rows = frappe.get_all(
        "Level Exam Assignment Student",
        filters={"student": student, "parenttype": "Level Exam Assignment"},
        fields=["parent", "assignment_status"],
        limit_page_length=0,
    )
    if not assignment_rows:
        return []

    assignment_names = [row.parent for row in assignment_rows]
    assignments = frappe.get_all(
        "Level Exam Assignment",
        filters={"name": ["in", assignment_names], "status": "Published"},
        fields=[
            "name",
            "assignment_title",
            "exam_paper",
            "subject",
            "class_level",
            "schedule_date",
            "start_time",
            "end_time",
        ],
        limit_page_length=0,
    )
    assignment_map = {row.name: row for row in assignments}

    paper_names = [row.exam_paper for row in assignments if row.exam_paper]
    papers = frappe.get_all(
        "Level Exam Paper",
        filters={"name": ["in", paper_names]},
        fields=["name", "paper_title", "subject", "class_level", "duration_minutes", "status"],
        limit_page_length=0,
    )
    paper_map = {row.name: row for row in papers}

    attempts = frappe.get_all(
        "Level Exam Attempt",
        filters={"student": student, "assignment": ["in", assignment_names]},
        fields=[
            "name",
            "assignment",
            "status",
            "submitted_on",
            "started_on",
            "percentage",
        ],
        order_by="modified desc",
        limit_page_length=0,
    )
    latest_attempt_by_assignment = {}
    for attempt in attempts:
        latest_attempt_by_assignment.setdefault(attempt.assignment, attempt)

    result = []
    for row in assignment_rows:
        assignment = assignment_map.get(row.parent)
        if not assignment:
            continue
        paper = paper_map.get(assignment.exam_paper)
        if not paper:
            continue
        paper_doc = frappe.get_doc("Level Exam Paper", paper.name)
        total_questions, total_marks = _paper_totals(paper_doc)
        latest_attempt = latest_attempt_by_assignment.get(assignment.name)
        status = _assignment_status(assignment, row.assignment_status, latest_attempt)
        if row.assignment_status == "Submitted":
            status = "completed"

        result.append(
            {
                "exam_id": assignment.name,
                "title": assignment.assignment_title or paper.paper_title,
                "subject_code": assignment.subject,
                "subject_name": assignment.subject,
                "level_code": str(assignment.class_level),
                "duration_minutes": int(paper.duration_minutes or 0),
                "total_questions": total_questions,
                "total_marks": total_marks,
                "available_from": f"{assignment.schedule_date}T{assignment.start_time or '00:00:00'}",
                "available_until": f"{assignment.schedule_date}T{assignment.end_time or '23:59:59'}",
                "status": status,
                "assignment_status": (row.assignment_status or "Assigned").lower(),
                "attempt_id": latest_attempt.name if latest_attempt else None,
                "submitted_at": str(latest_attempt.submitted_on) if latest_attempt and latest_attempt.submitted_on else None,
                "percentage": int(latest_attempt.percentage or 0) if latest_attempt and latest_attempt.submitted_on else None,
            }
        )

    return sorted(result, key=lambda item: item["available_from"], reverse=True)


@frappe.whitelist()
def get_level_exam_detail(assignment, student):
    assignment_doc = frappe.get_doc("Level Exam Assignment", assignment)
    student_row = _get_child_row(assignment_doc, "students", "student", student)
    if not student_row:
        frappe.throw(_("This student is not assigned to the selected level exam"))

    paper_doc = frappe.get_doc("Level Exam Paper", assignment_doc.exam_paper)
    total_questions, total_marks = _paper_totals(paper_doc)
    active_attempt = frappe.get_all(
        "Level Exam Attempt",
        filters={"assignment": assignment, "student": student, "status": "In Progress"},
        fields=["name", "started_on"],
        order_by="creation desc",
        limit_page_length=1,
    )
    active = active_attempt[0] if active_attempt else None
    answered_count = 0
    if active:
        attempt_doc = frappe.get_doc("Level Exam Attempt", active.name)
        answered_count = len([row for row in attempt_doc.answers or [] if row.selected_option_key])

    return {
        "exam_id": assignment_doc.name,
        "title": assignment_doc.assignment_title or paper_doc.paper_title,
        "subject_code": assignment_doc.subject,
        "subject_name": assignment_doc.subject,
        "level_code": str(assignment_doc.class_level),
        "instructions": paper_doc.instructions or "",
        "duration_minutes": int(paper_doc.duration_minutes or 0),
        "total_questions": total_questions,
        "total_marks": total_marks,
        "available_from": f"{assignment_doc.schedule_date}T{assignment_doc.start_time or '00:00:00'}",
        "available_until": f"{assignment_doc.schedule_date}T{assignment_doc.end_time or '23:59:59'}",
        "status": _assignment_status(assignment_doc.as_dict(), student_row.assignment_status, active),
        "child": {
            "student_id": student,
            "student_name": student_row.student_name,
            "level_code": str(assignment_doc.class_level),
        },
        "active_attempt": {
            "attempt_id": active.name,
            "status": "in_progress",
            "started_at": str(active.started_on),
            "submitted_at": None,
            "answered_count": answered_count,
            "total_questions": total_questions,
            "remaining_seconds": _seconds_remaining(paper_doc.as_dict(), active.started_on),
        } if active else None,
    }


@frappe.whitelist()
def start_level_exam(assignment, student):
    assignment_doc = frappe.get_doc("Level Exam Assignment", assignment)
    student_row = _get_child_row(assignment_doc, "students", "student", student)
    if not student_row:
        frappe.throw(_("This student is not assigned to the selected level exam"))

    existing = frappe.get_all(
        "Level Exam Attempt",
        filters={"assignment": assignment, "student": student, "status": "In Progress"},
        fields=["name"],
        order_by="creation desc",
        limit_page_length=1,
    )
    if existing:
        return {"attempt_id": existing[0].name}

    paper_doc = frappe.get_doc("Level Exam Paper", assignment_doc.exam_paper)
    total_questions, total_marks = _paper_totals(paper_doc)
    attempt = frappe.get_doc(
        {
            "doctype": "Level Exam Attempt",
            "assignment": assignment_doc.name,
            "exam_paper": assignment_doc.exam_paper,
            "student": student,
            "student_name": student_row.student_name,
            "subject": assignment_doc.subject,
            "class_level": assignment_doc.class_level,
            "started_on": now(),
            "status": "In Progress",
            "total_marks": total_marks,
        }
    )
    attempt.insert(ignore_permissions=True)

    student_row.assignment_status = "Started"
    assignment_doc.save(ignore_permissions=True)
    frappe.db.commit()
    return {"attempt_id": attempt.name}


@frappe.whitelist()
def get_level_exam_attempt(attempt, student=None):
    attempt_doc = frappe.get_doc("Level Exam Attempt", attempt)
    if student and attempt_doc.student != student:
        frappe.throw(_("This attempt does not belong to the selected student"))

    if attempt_doc.status != "In Progress":
        frappe.throw(_("Attempt already submitted"))

    paper_doc = frappe.get_doc("Level Exam Paper", attempt_doc.exam_paper)
    question_names = [row.question for row in paper_doc.questions or [] if row.question]
    details = _get_question_details(question_names)
    answer_map = {row.question: row.selected_option_key for row in attempt_doc.answers or []}
    total_questions, total_marks = _paper_totals(paper_doc)

    questions = []
    for row in sorted(paper_doc.questions or [], key=lambda item: int(item.display_order or item.idx or 0)):
        detail = details.get(row.question)
        if not detail:
            continue
        questions.append(
            {
                "id": row.question,
                "stem": detail["stem"],
                "explanation": detail.get("explanation"),
                "difficulty": detail["difficulty"],
                "marks": int(row.marks or 0),
                "display_order": int(row.display_order or row.idx or 0),
                "selected_option_id": answer_map.get(row.question),
                "options": detail["options"],
            }
        )

    return {
        "attempt_id": attempt_doc.name,
        "exam_id": attempt_doc.assignment,
        "title": frappe.db.get_value("Level Exam Assignment", attempt_doc.assignment, "assignment_title") or paper_doc.paper_title,
        "subject_name": attempt_doc.subject,
        "level_code": str(attempt_doc.class_level),
        "duration_minutes": int(paper_doc.duration_minutes or 0),
        "total_questions": total_questions,
        "total_marks": total_marks,
        "started_at": str(attempt_doc.started_on),
        "remaining_seconds": _seconds_remaining(paper_doc.as_dict(), attempt_doc.started_on),
        "child": {
            "student_id": attempt_doc.student,
            "student_name": attempt_doc.student_name,
        },
        "questions": questions,
    }


@frappe.whitelist()
def save_level_exam_answer(attempt, question, selected_option_key, student=None):
    attempt_doc = frappe.get_doc("Level Exam Attempt", attempt)
    if student and attempt_doc.student != student:
        frappe.throw(_("This attempt does not belong to the selected student"))
    if attempt_doc.status != "In Progress":
        frappe.throw(_("Attempt is not active"))

    answer_row = _get_child_row(attempt_doc, "answers", "question", question)
    if answer_row:
        answer_row.selected_option_key = selected_option_key
    else:
        attempt_doc.append(
            "answers",
            {
                "question": question,
                "selected_option_key": selected_option_key,
            },
        )
    attempt_doc.save(ignore_permissions=True)
    frappe.db.commit()
    return {"ok": True}


@frappe.whitelist()
def submit_level_exam(attempt, student=None, auto_submitted=None):
    attempt_doc = frappe.get_doc("Level Exam Attempt", attempt)
    if student and attempt_doc.student != student:
        frappe.throw(_("This attempt does not belong to the selected student"))

    if attempt_doc.status in {"Submitted", "Auto Submitted"}:
        return _build_result(attempt_doc)

    paper_doc = frappe.get_doc("Level Exam Paper", attempt_doc.exam_paper)
    question_details = _get_question_details([row.question for row in paper_doc.questions or [] if row.question])
    answer_map = {row.question: row for row in attempt_doc.answers or []}

    score = 0
    correct = 0
    wrong = 0
    unanswered = 0

    for paper_row in paper_doc.questions or []:
        detail = question_details.get(paper_row.question)
        if not detail:
            continue
        answer_row = answer_map.get(paper_row.question)
        selected_key = answer_row.selected_option_key if answer_row else None
        is_correct = bool(selected_key and selected_key == detail["correct_option_key"])
        marks = int(paper_row.marks or 0)
        if not selected_key:
            unanswered += 1
        elif is_correct:
            correct += 1
            score += marks
        else:
            wrong += 1

        if answer_row:
            answer_row.correct_option_key = detail["correct_option_key"]
            answer_row.is_correct = 1 if is_correct else 0
            answer_row.marks_awarded = marks if is_correct else 0
        else:
            attempt_doc.append(
                "answers",
                {
                    "question": paper_row.question,
                    "selected_option_key": None,
                    "correct_option_key": detail["correct_option_key"],
                    "is_correct": 0,
                    "marks_awarded": 0,
                },
            )

    total_marks = sum(int(row.marks or 0) for row in paper_doc.questions or [])
    percentage = int(round((score / total_marks) * 100)) if total_marks else 0

    attempt_doc.status = "Auto Submitted" if str(auto_submitted or "").strip() in {"1", "true", "True"} else "Submitted"
    attempt_doc.submitted_on = now()
    attempt_doc.score_obtained = score
    attempt_doc.total_marks = total_marks
    attempt_doc.percentage = percentage
    attempt_doc.correct_count = correct
    attempt_doc.wrong_count = wrong
    attempt_doc.unanswered_count = unanswered
    attempt_doc.save(ignore_permissions=True)

    assignment_doc = frappe.get_doc("Level Exam Assignment", attempt_doc.assignment)
    student_row = _get_child_row(assignment_doc, "students", "student", attempt_doc.student)
    if student_row:
        student_row.assignment_status = "Submitted"
        assignment_doc.save(ignore_permissions=True)

    frappe.db.commit()
    return _build_result(attempt_doc)


@frappe.whitelist()
def get_level_exam_result(attempt, student=None):
    attempt_doc = frappe.get_doc("Level Exam Attempt", attempt)
    if student and attempt_doc.student != student:
        frappe.throw(_("This attempt does not belong to the selected student"))
    if attempt_doc.status == "In Progress":
        return submit_level_exam(attempt, student=student, auto_submitted=1)
    return _build_result(attempt_doc)


@frappe.whitelist()
def get_gm_level_exam_catalog(class_levels=None, subject=None):
    levels = _normalize_levels(class_levels)
    filters = {"status": "Published"}
    if subject:
        filters["subject"] = subject
    if levels:
        filters["class_level"] = ["in", levels]

    papers = frappe.get_all(
        "Level Exam Paper",
        filters=filters,
        fields=["name", "paper_title", "subject", "class_level", "duration_minutes"],
        order_by="class_level asc, subject asc, modified desc",
        limit_page_length=0,
    )

    result = []
    subjects = {}
    for paper in papers:
        paper_doc = frappe.get_doc("Level Exam Paper", paper.name)
        total_questions, total_marks = _paper_totals(paper_doc)
        subjects[paper.subject] = {"code": paper.subject, "name": paper.subject}
        result.append(
            {
                "exam_id": paper.name,
                "title": paper.paper_title,
                "subject_code": paper.subject,
                "subject_name": paper.subject,
                "level_code": str(paper.class_level),
                "duration_minutes": int(paper.duration_minutes or 0),
                "total_questions": total_questions,
                "total_marks": total_marks,
                "available_from": f"{nowdate()}T00:00:00",
                "available_until": f"{nowdate()}T23:59:59",
            }
        )

    return {
        "subjects": sorted(subjects.values(), key=lambda item: item["name"]),
        "exams": result,
    }


@frappe.whitelist()
def sync_exam_papers_from_catalog(exams=None):
    exam_rows = _parse_jsonish(exams) or []
    if not isinstance(exam_rows, list):
        frappe.throw(_("exams must be a list"))

    synced = []

    for raw_exam in exam_rows:
        if not isinstance(raw_exam, dict):
            continue

        title = (raw_exam.get("title") or "").strip()
        subject = (raw_exam.get("subject_name") or raw_exam.get("subject") or "").strip()
        class_level = str(raw_exam.get("level_code") or raw_exam.get("class_level") or "").strip()
        duration_minutes = int(raw_exam.get("duration_minutes") or 20)
        instructions = raw_exam.get("instructions") or ""
        questions = raw_exam.get("questions") or []

        if not title or not subject or class_level not in {"8", "9", "10"} or not questions:
            continue

        question_names = []
        display_order = 1

        for raw_question in questions:
            if not isinstance(raw_question, dict):
                continue

            question_text = (raw_question.get("stem") or raw_question.get("question_text") or "").strip()
            correct_option_key = str(raw_question.get("correct_option_key") or "").strip()
            difficulty = str(raw_question.get("difficulty") or "Medium").strip().title()
            explanation = raw_question.get("explanation") or ""
            marks = int(raw_question.get("marks") or 1)
            options = raw_question.get("options") or []

            if not question_text or not correct_option_key or not options:
                continue

            existing_question_name = frappe.db.get_value(
                "Level Exam Question",
                {
                    "subject": subject,
                    "class_level": class_level,
                    "question_text": question_text,
                },
                "name",
            )

            question_doc = frappe.get_doc("Level Exam Question", existing_question_name) if existing_question_name else frappe.get_doc(
                {
                    "doctype": "Level Exam Question",
                    "subject": subject,
                    "class_level": class_level,
                    "question_text": question_text,
                }
            )

            question_doc.subject = subject
            question_doc.class_level = class_level
            question_doc.question_text = question_text
            question_doc.difficulty = difficulty if difficulty in {"Easy", "Medium", "Hard"} else "Medium"
            question_doc.correct_option_key = correct_option_key
            question_doc.explanation = explanation
            question_doc.is_active = 1
            question_doc.review_status = "Approved"
            question_doc.set("options", [])

            for option in options:
                option_key = str(option.get("option_key") or "").strip()
                option_text = str(option.get("option_text") or "").strip()
                if not option_key or not option_text:
                    continue
                question_doc.append(
                    "options",
                    {
                        "option_key": option_key,
                        "option_text": option_text,
                    },
                )

            if existing_question_name:
                question_doc.save(ignore_permissions=True)
            else:
                question_doc.insert(ignore_permissions=True)

            question_names.append(
                {
                    "question": question_doc.name,
                    "marks": marks,
                    "display_order": display_order,
                }
            )
            display_order += 1

        if not question_names:
            continue

        existing_paper_name = frappe.db.get_value(
            "Level Exam Paper",
            {
                "paper_title": title,
                "subject": subject,
                "class_level": class_level,
            },
            "name",
        )

        paper_doc = frappe.get_doc("Level Exam Paper", existing_paper_name) if existing_paper_name else frappe.get_doc(
            {
                "doctype": "Level Exam Paper",
                "paper_title": title,
                "subject": subject,
                "class_level": class_level,
            }
        )

        paper_doc.paper_title = title
        paper_doc.subject = subject
        paper_doc.class_level = class_level
        paper_doc.duration_minutes = duration_minutes
        paper_doc.instructions = instructions
        paper_doc.status = "Published"
        paper_doc.set("questions", [])

        for row in question_names:
            paper_doc.append("questions", row)

        total_questions, total_marks = _paper_totals(paper_doc)
        paper_doc.total_questions = total_questions
        paper_doc.total_marks = total_marks

        if existing_paper_name:
            paper_doc.save(ignore_permissions=True)
        else:
            paper_doc.insert(ignore_permissions=True)

        synced.append(
            {
                "exam_id": raw_exam.get("exam_id") or raw_exam.get("id") or paper_doc.name,
                "paper_name": paper_doc.name,
                "title": title,
                "subject": subject,
                "class_level": class_level,
            }
        )

    frappe.db.commit()
    return synced


@frappe.whitelist()
def assign_level_exam_to_targets(exam_papers=None, class_levels=None, student_group=None):
    paper_names = _parse_jsonish(exam_papers) or []
    paper_names = [str(item).strip() for item in paper_names if str(item).strip()]
    levels = _normalize_levels(class_levels)
    if not paper_names or not levels:
        frappe.throw(_("exam_papers and class_levels are required"))

    enrollments = _get_latest_enrollments(levels=levels, student_group=student_group)
    if not enrollments:
        return {"assigned_count": 0, "target_student_count": 0, "level_codes": levels}

    papers = frappe.get_all(
        "Level Exam Paper",
        filters={"name": ["in", paper_names], "status": "Published"},
        fields=["name", "paper_title", "subject", "class_level"],
        limit_page_length=0,
    )
    paper_map = {paper.name: paper for paper in papers}
    assigned_count = 0

    for paper_name in paper_names:
        paper = paper_map.get(paper_name)
        if not paper:
            continue
        matching_students = [row for row in enrollments if row["class_level"] == str(paper.class_level)]
        if not matching_students:
            continue

        existing_name = frappe.db.get_value(
            "Level Exam Assignment",
            {
                "exam_paper": paper.name,
                "class_level": paper.class_level,
                "student_group": student_group or "",
                "status": ["!=", "Closed"],
            },
            "name",
        )
        assignment_doc = frappe.get_doc("Level Exam Assignment", existing_name) if existing_name else frappe.get_doc(
            {
                "doctype": "Level Exam Assignment",
                "assignment_title": f"{paper.paper_title} - {paper.class_level}th Assignment",
                "exam_paper": paper.name,
                "subject": paper.subject,
                "class_level": paper.class_level,
                "assignment_mode": "By Student Group" if student_group else "By Class",
                "program": matching_students[0]["program"],
                "student_group": student_group or "",
                "schedule_date": nowdate(),
                "start_time": "00:00:00",
                "end_time": "23:59:59",
                "status": "Published",
                "students": [],
            }
        )

        existing_students = {row.student for row in assignment_doc.students or []}
        for enrollment in matching_students:
            if enrollment["student"] in existing_students:
                continue
            assignment_doc.append(
                "students",
                {
                    "student": enrollment["student"],
                    "student_name": enrollment["student_name"],
                    "program": enrollment["program"],
                    "student_group": enrollment["student_group"],
                    "assignment_status": "Assigned",
                },
            )
            existing_students.add(enrollment["student"])
            assigned_count += 1

        if existing_name:
            assignment_doc.save(ignore_permissions=True)
        else:
            assignment_doc.insert(ignore_permissions=True)

    frappe.db.commit()
    return {
        "assigned_count": assigned_count,
        "target_student_count": len(enrollments),
        "level_codes": levels,
    }
