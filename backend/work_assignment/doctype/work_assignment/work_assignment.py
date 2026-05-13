# Work Assignment Doctype Definition
# File: frappe-backend/work_assignment/doctype/work_assignment/work_assignment.py

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import getdate, today
from datetime import datetime, timedelta


class WorkAssignment(Document):
    """Work Assignment doctype - GM assigns work to instructors with deadline tracking"""

    def validate(self):
        """Validate before save"""
        self.validate_deadline()
        self.validate_branch()
        self.validate_instructors()
        self.calculate_status_counts()

    def validate_deadline(self):
        """Ensure deadline is in future and is a date"""
        if not self.deadline:
            frappe.throw(_("Deadline is mandatory"))
        
        deadline_date = getdate(self.deadline)
        today_date = getdate(today())
        
        if deadline_date < today_date:
            frappe.throw(_("Deadline must be in the future"))

    def validate_branch(self):
        """Ensure branch exists"""
        if not self.for_branch:
            frappe.throw(_("Branch (for_branch) is mandatory"))
        
        # Verify branch exists
        if not frappe.db.exists("Company", self.for_branch):
            frappe.throw(_("Branch {0} does not exist").format(self.for_branch))

    def validate_instructors(self):
        """Ensure at least one instructor is assigned"""
        if not self.assignments or len(self.assignments) == 0:
            frappe.throw(_("At least one instructor must be assigned"))
        
        # Check for duplicate instructors
        instructors = [row.instructor for row in self.assignments]
        if len(instructors) != len(set(instructors)):
            frappe.throw(_("Each instructor can only be assigned once"))
        
        # Validate each instructor exists and is from the same branch
        for row in self.assignments:
            if not row.instructor:
                frappe.throw(_("Instructor is mandatory in row {0}").format(row.idx))
            
            # Fetch instructor details
            instructor_doc = frappe.get_doc("Instructor", row.instructor)
            row.instructor_name = instructor_doc.instructor_name
            row.employee = instructor_doc.employee
            row.department = instructor_doc.department or ""

    def calculate_status_counts(self):
        """Calculate formula fields"""
        self.total_assigned = len(self.assignments) if self.assignments else 0
        self.submitted_count = len([r for r in self.assignments if r.submission_status == "Submitted"]) if self.assignments else 0
        self.approved_count = len([r for r in self.assignments if r.approval_status == "Approved"]) if self.assignments else 0

    def on_submit(self):
        """Actions when assignment is submitted"""
        self.workflow_state = "Active"
        self.status = "Active"
        
        # Create dashboard notifications for all assigned instructors
        for row in self.assignments:
            if row.submitted_by:
                instructor_user = frappe.get_doc("Instructor", row.instructor).employee
                # Get user from employee
                emp_doc = frappe.get_doc("Employee", instructor_user)
                user_email = emp_doc.user_id
                
                if user_email:
                    self.create_notification(
                        user=user_email,
                        subject=_("New Work Assignment: {0}").format(self.title),
                        document_type="Work Assignment",
                        document_name=self.name,
                        link=f"/app/instructor/my-assignments/{self.name}"
                    )

    def create_notification(self, user, subject, document_type, document_name, link):
        """Create a dashboard notification (Notification Log)"""
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

    def on_update_after_submit(self):
        """Allow updating remarks/status during approval"""
        pass


def get_work_assignments_for_instructor(instructor):
    """Get all work assignments for an instructor (for dashboard)"""
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
            fields=["*"]
        )
        
        if child_rows:
            assignment["assignment_details"] = child_rows
            result.append(assignment)
    
    return result
