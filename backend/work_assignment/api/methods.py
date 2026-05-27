# Work Assignment API Methods
# File: frappe-backend/work_assignment/api/methods.py

import frappe
from frappe import _
from frappe.utils import getdate, now
from datetime import datetime
import json


@frappe.whitelist()
def submit_instructor_work(work_assignment_id, google_drive_link):
    """
    API method: Instructor submits Google Drive link
    
    Args:
        work_assignment_id: Work Assignment document name (e.g., "WA-001")
        google_drive_link: URL of Google Drive file
    
    Returns:
        dict with status and message
    """
    try:
        # Validate current user is an instructor
        current_user = frappe.session.user
        instructor = frappe.db.get_value("Instructor", {"employee": frappe.db.get_value("User", current_user, "name")})
        
        if not instructor:
            frappe.throw(_("Only instructors can submit work"))
        
        # Get work assignment
        work_assignment = frappe.get_doc("Work Assignment", work_assignment_id)
        
        # Check if assignment is active
        if work_assignment.workflow_state != "Active":
            frappe.throw(_("Assignment is not active"))
        
        if not work_assignment.enabled:
            frappe.throw(_("Assignment is disabled"))
        
        # Check deadline
        deadline_date = getdate(work_assignment.deadline)
        today_date = getdate(frappe.utils.today())
        
        if today_date > deadline_date:
            frappe.throw(_("Submission deadline has passed"))
        
        # Find the assignment detail row for this instructor
        assignment_detail = None
        for row in work_assignment.assignments:
            if row.instructor == instructor[0]:
                assignment_detail = row
                break
        
        if not assignment_detail:
            frappe.throw(_("You are not assigned to this work"))
        
        # Update the assignment detail
        assignment_detail.google_drive_link = google_drive_link
        assignment_detail.submission_status = "Submitted"
        assignment_detail.submitted_on = now()
        assignment_detail.submitted_by = current_user
        
        # Save work assignment
        work_assignment.save()
        
        # Create notification for GM
        gm_user = frappe.db.get_value("Work Assignment", work_assignment_id, "created_by")
        if gm_user:
            create_dashboard_notification(
                user=gm_user,
                subject=_("{0} submitted {1}").format(instructor[1], work_assignment.title),
                document_type="Work Assignment",
                document_name=work_assignment_id,
                link=f"/app/work-assignments/{work_assignment_id}"
            )
        
        return {
            "status": "success",
            "message": _("Work submitted successfully"),
            "submission_status": "Submitted",
            "submitted_on": assignment_detail.submitted_on
        }
    
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), _("Error in submit_instructor_work"))
        return {
            "status": "error",
            "message": str(e)
        }


@frappe.whitelist()
def approve_submission(work_assignment_id, assignment_row_idx, approval_remarks=None):
    """
    API method: GM approves an instructor's submission
    
    Args:
        work_assignment_id: Work Assignment document name
        assignment_row_idx: Index of the row in assignments table
        approval_remarks: Optional remarks from GM
    
    Returns:
        dict with status and message
    """
    try:
        # Validate current user is GM or Admin
        current_user = frappe.session.user
        user_roles = frappe.get_roles(current_user)
        
        if "General Manager" not in user_roles and "Administrator" not in user_roles and "Director" not in user_roles:
            frappe.throw(_("Only General Manager, Director, or Admin can approve submissions"))
        
        # Get work assignment
        work_assignment = frappe.get_doc("Work Assignment", work_assignment_id)
        
        # Find the row
        assignment_detail = None
        for row in work_assignment.assignments:
            if row.idx == int(assignment_row_idx):
                assignment_detail = row
                break
        
        if not assignment_detail:
            frappe.throw(_("Assignment row not found"))
        
        if assignment_detail.submission_status != "Submitted":
            frappe.throw(_("Can only approve submitted work"))
        
        # Update approval
        assignment_detail.approval_status = "Approved"
        assignment_detail.approved_by = current_user
        assignment_detail.approval_date = now()
        if approval_remarks:
            assignment_detail.approval_remarks = approval_remarks
        
        # Save work assignment
        work_assignment.save()
        
        # Check if all are approved/rejected - close assignment if complete
        check_and_complete_assignment(work_assignment)
        
        # Create notification for instructor
        instructor = assignment_detail.instructor
        instructor_doc = frappe.get_doc("Instructor", instructor)
        if instructor_doc.employee:
            emp_doc = frappe.get_doc("Employee", instructor_doc.employee)
            instructor_user = emp_doc.user_id
            
            if instructor_user:
                create_dashboard_notification(
                    user=instructor_user,
                    subject=_("Your work has been APPROVED ✅"),
                    document_type="Work Assignment",
                    document_name=work_assignment_id,
                    link=f"/app/instructor/my-assignments/{work_assignment_id}"
                )
        
        return {
            "status": "success",
            "message": _("Submission approved"),
            "approval_status": "Approved",
            "approval_date": assignment_detail.approval_date
        }
    
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), _("Error in approve_submission"))
        return {
            "status": "error",
            "message": str(e)
        }


@frappe.whitelist()
def reject_submission(work_assignment_id, assignment_row_idx, rejection_reason, can_resubmit=True):
    """
    API method: GM rejects an instructor's submission
    
    Args:
        work_assignment_id: Work Assignment document name
        assignment_row_idx: Index of the row in assignments table
        rejection_reason: Reason for rejection
        can_resubmit: Allow instructor to resubmit (default True)
    
    Returns:
        dict with status and message
    """
    try:
        # Validate current user is GM or Admin
        current_user = frappe.session.user
        user_roles = frappe.get_roles(current_user)
        
        if "General Manager" not in user_roles and "Administrator" not in user_roles and "Director" not in user_roles:
            frappe.throw(_("Only General Manager, Director, or Admin can reject submissions"))
        
        # Get work assignment
        work_assignment = frappe.get_doc("Work Assignment", work_assignment_id)
        
        # Find the row
        assignment_detail = None
        for row in work_assignment.assignments:
            if row.idx == int(assignment_row_idx):
                assignment_detail = row
                break
        
        if not assignment_detail:
            frappe.throw(_("Assignment row not found"))
        
        if assignment_detail.submission_status != "Submitted":
            frappe.throw(_("Can only reject submitted work"))
        
        # Update rejection
        assignment_detail.approval_status = "Rejected"
        assignment_detail.rejection_reason = rejection_reason
        assignment_detail.approved_by = current_user
        assignment_detail.approval_date = now()
        assignment_detail.can_resubmit = can_resubmit
        
        # If allow resubmit, reset submission status
        if can_resubmit:
            assignment_detail.submission_status = "Pending"
            assignment_detail.google_drive_link = None
            assignment_detail.submitted_on = None
            assignment_detail.submitted_by = None
        
        # Save work assignment
        work_assignment.save()
        
        # Create notification for instructor
        instructor = assignment_detail.instructor
        instructor_doc = frappe.get_doc("Instructor", instructor)
        if instructor_doc.employee:
            emp_doc = frappe.get_doc("Employee", instructor_doc.employee)
            instructor_user = emp_doc.user_id
            
            if instructor_user:
                resubmit_msg = _(" Resubmission allowed.") if can_resubmit else ""
                create_dashboard_notification(
                    user=instructor_user,
                    subject=_("Your work was REJECTED ❌.{0}").format(resubmit_msg),
                    document_type="Work Assignment",
                    document_name=work_assignment_id,
                    link=f"/app/instructor/my-assignments/{work_assignment_id}"
                )
        
        return {
            "status": "success",
            "message": _("Submission rejected"),
            "approval_status": "Rejected",
            "can_resubmit": can_resubmit
        }
    
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), _("Error in reject_submission"))
        return {
            "status": "error",
            "message": str(e)
        }


@frappe.whitelist()
def get_instructor_assignments():
    """
    Get all work assignments for current instructor
    
    Returns:
        List of assignments with details
    """
    try:
        current_user = frappe.session.user
        
        # Get instructor record for this user
        instructor = frappe.db.get_value(
            "Instructor",
            filters={"employee": frappe.db.get_value("User", current_user, "name")},
            fieldname="name"
        )
        
        if not instructor:
            return []
        
        # Get all active work assignments
        assignments = frappe.get_all(
            "Work Assignment",
            filters={
                "workflow_state": "Active",
                "enabled": 1
            },
            fields=["name", "title", "description", "topic", "deadline", "for_branch"]
        )
        
        # Filter to only assignments where this instructor is included
        result = []
        for assignment in assignments:
            child_rows = frappe.get_all(
                "Work Assignment Detail",
                filters={
                    "parent": assignment["name"],
                    "instructor": instructor
                },
                fields=[
                    "idx", "submission_status", "google_drive_link", "submitted_on",
                    "approval_status", "approval_remarks", "rejection_reason", "can_resubmit"
                ]
            )
            
            if child_rows:
                assignment["my_assignment"] = child_rows[0]
                result.append(assignment)
        
        return result
    
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), _("Error in get_instructor_assignments"))
        return []


@frappe.whitelist()
def get_gm_assignments(branch=None):
    """
    Get all work assignments for current GM
    
    Args:
        branch: Filter by specific branch (optional)
    
    Returns:
        List of assignments created by this GM
    """
    try:
        current_user = frappe.session.user
        
        # Get assignments created by this user
        filters = {"created_by": current_user}
        if branch:
            filters["for_branch"] = branch
        
        assignments = frappe.get_all(
            "Work Assignment",
            filters=filters,
            fields=["name", "title", "topic", "for_branch", "deadline", "workflow_state", "total_assigned", "submitted_count", "approved_count"],
            order_by="modified desc"
        )
        
        # For each assignment, get full details
        result = []
        for assignment in assignments:
            assignment_doc = frappe.get_doc("Work Assignment", assignment["name"])
            assignment["status_details"] = {
                "submitted": assignment_doc.submitted_count,
                "approved": assignment_doc.approved_count,
                "pending": assignment_doc.total_assigned - assignment_doc.submitted_count - assignment_doc.approved_count,
                "total": assignment_doc.total_assigned
            }
            assignment["submissions"] = [
                {
                    "idx": row.idx,
                    "instructor": row.instructor,
                    "instructor_name": row.instructor_name,
                    "submission_status": row.submission_status,
                    "approval_status": row.approval_status,
                    "google_drive_link": row.google_drive_link,
                    "submitted_on": row.submitted_on,
                    "approval_remarks": row.approval_remarks,
                    "rejection_reason": row.rejection_reason
                }
                for row in assignment_doc.assignments
            ]
            result.append(assignment)
        
        return result
    
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), _("Error in get_gm_assignments"))
        return []


def create_dashboard_notification(user, subject, document_type, document_name, link):
    """
    Helper function to create a dashboard notification (Notification Log)
    """
    try:
        notif = frappe.new_doc("Notification Log")
        notif.for_user = user
        notif.type = "Alert"
        notif.subject = subject
        notif.document_type = document_type
        notif.document_name = document_name
        notif.link = link
        notif.insert(ignore_permissions=True)
        frappe.db.commit()
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), _("Failed to create notification for {0}").format(user))


def check_and_complete_assignment(work_assignment):
    """
    Check if all submissions in assignment are approved/rejected, if so close assignment
    """
    try:
        all_processed = all(
            row.approval_status in ["Approved", "Rejected"]
            for row in work_assignment.assignments
        )
        
        if all_processed:
            work_assignment.workflow_state = "Completed"
            work_assignment.status = "Completed"
            work_assignment.save()
            
            # Notify GM that assignment is complete
            create_dashboard_notification(
                user=work_assignment.created_by,
                subject=_("Work Assignment {0} is now COMPLETE").format(work_assignment.name),
                document_type="Work Assignment",
                document_name=work_assignment.name,
                link=f"/app/work-assignments/{work_assignment.name}"
            )
    
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), _("Error in check_and_complete_assignment"))
