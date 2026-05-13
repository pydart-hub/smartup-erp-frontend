# Work Assignment Detail Child Table Definition
# File: frappe-backend/work_assignment/doctype/work_assignment_detail/work_assignment_detail.py

from frappe.model.document import Document
from frappe import _
import frappe


class WorkAssignmentDetail(Document):
    """Child table for Work Assignment - stores per-instructor submission & approval data"""

    def validate(self):
        """Validate child row"""
        self.validate_instructor()
        self.validate_google_drive_link()

    def validate_instructor(self):
        """Ensure instructor exists"""
        if not self.instructor:
            frappe.throw(_("Instructor is mandatory"))
        
        if not frappe.db.exists("Instructor", self.instructor):
            frappe.throw(_("Instructor {0} does not exist").format(self.instructor))

    def validate_google_drive_link(self):
        """Validate Google Drive URL format if provided"""
        if self.google_drive_link:
            link = self.google_drive_link.strip()
            
            # Valid Google Drive URL patterns
            valid_patterns = [
                "https://drive.google.com/file/d/",
                "https://drive.google.com/open?id="
            ]
            
            if not any(link.startswith(pattern) for pattern in valid_patterns):
                frappe.throw(_("Invalid Google Drive URL. Must be a valid https://drive.google.com/... link"))
            
            if not link.startswith("https://"):
                frappe.throw(_("Google Drive links must use HTTPS"))
