# Work Assignment Detail Child Table Definition
# File: frappe-backend/work_assignment/doctype/work_assignment_detail/work_assignment_detail.py

from frappe.model.document import Document
from frappe import _
import frappe
import re
from urllib.parse import urlparse, parse_qs


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

            if not link.startswith("https://"):
                frappe.throw(_("Google submission links must use HTTPS"))

            parsed = urlparse(link)
            hostname = (parsed.hostname or "").lower()
            path = parsed.path or ""
            query = parse_qs(parsed.query or "")
            has_id = bool(query.get("id", [None])[0])

            drive_patterns = [
                r"^/file/d/[A-Za-z0-9_-]+",
                r"^/drive/folders/[A-Za-z0-9_-]+",
            ]
            docs_patterns = [
                r"^/file/d/[A-Za-z0-9_-]+",
                r"^/presentation/d/[A-Za-z0-9_-]+",
                r"^/document/d/[A-Za-z0-9_-]+",
                r"^/spreadsheets/d/[A-Za-z0-9_-]+",
            ]

            is_valid = False

            if hostname == "drive.google.com":
                is_valid = any(re.match(pattern, path) for pattern in drive_patterns) or (
                    path in ("/open", "/uc") and has_id
                )
            elif hostname == "docs.google.com":
                is_valid = any(re.match(pattern, path) for pattern in docs_patterns)

            if not is_valid:
                frappe.throw(
                    _(
                        "Invalid Google submission URL. Use a shared https://drive.google.com/... or https://docs.google.com/... link"
                    )
                )
