"""
Create the Complaint custom DocType on Frappe backend.
Run once: py docs/create_complaint_doctype.py
"""
import requests
import json

BASE = 'https://smartup.m.frappe.cloud'
HEADERS = {
    'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
    'Content-Type': 'application/json',
}

# Check if it already exists
r = requests.get(f'{BASE}/api/resource/DocType/Complaint', headers=HEADERS)
if r.status_code == 200:
    print('Complaint DocType already exists! Skipping creation.')
    exit(0)

doctype_def = {
    "doctype": "DocType",
    "name": "Complaint",
    "module": "Education",
    "custom": 1,
    "autoname": "CMPT-.#####",
    "document_type": "Document",
    "is_submittable": 0,
    "track_changes": 1,
    "engine": "InnoDB",
    "fields": [
        {
            "fieldname": "subject",
            "fieldtype": "Data",
            "label": "Subject",
            "reqd": 1,
            "in_list_view": 1,
            "in_standard_filter": 0,
        },
        {
            "fieldname": "category",
            "fieldtype": "Select",
            "label": "Category",
            "options": "Academic\nFee Related\nFacility\nStaff\nTransport\nFood\nOther",
            "reqd": 1,
            "in_list_view": 1,
            "in_standard_filter": 1,
        },
        {
            "fieldname": "priority",
            "fieldtype": "Select",
            "label": "Priority",
            "options": "Low\nMedium\nHigh",
            "default": "Medium",
            "in_list_view": 1,
            "in_standard_filter": 1,
        },
        {
            "fieldname": "status",
            "fieldtype": "Select",
            "label": "Status",
            "options": "Open\nIn Review\nResolved\nClosed",
            "default": "Open",
            "in_list_view": 1,
            "in_standard_filter": 1,
        },
        {
            "fieldname": "column_break_1",
            "fieldtype": "Column Break",
        },
        {
            "fieldname": "student",
            "fieldtype": "Link",
            "label": "Student",
            "options": "Student",
            "reqd": 1,
            "in_list_view": 1,
        },
        {
            "fieldname": "student_name",
            "fieldtype": "Data",
            "label": "Student Name",
            "fetch_from": "student.student_name",
            "read_only": 1,
            "in_list_view": 1,
        },
        {
            "fieldname": "branch",
            "fieldtype": "Link",
            "label": "Branch",
            "options": "Company",
            "in_standard_filter": 1,
        },
        {
            "fieldname": "branch_abbr",
            "fieldtype": "Data",
            "label": "Branch Abbr",
            "read_only": 1,
        },
        {
            "fieldname": "section_break_desc",
            "fieldtype": "Section Break",
            "label": "Details",
        },
        {
            "fieldname": "description",
            "fieldtype": "Text",
            "label": "Description",
            "reqd": 1,
        },
        {
            "fieldname": "section_break_guardian",
            "fieldtype": "Section Break",
            "label": "Guardian Info",
        },
        {
            "fieldname": "guardian",
            "fieldtype": "Link",
            "label": "Guardian",
            "options": "Guardian",
            "read_only": 1,
        },
        {
            "fieldname": "guardian_name",
            "fieldtype": "Data",
            "label": "Guardian Name",
            "fetch_from": "guardian.guardian_name",
            "read_only": 1,
        },
        {
            "fieldname": "guardian_email",
            "fieldtype": "Data",
            "label": "Guardian Email",
            "read_only": 1,
        },
        {
            "fieldname": "column_break_guardian",
            "fieldtype": "Column Break",
        },
        {
            "fieldname": "section_break_resolution",
            "fieldtype": "Section Break",
            "label": "Resolution",
        },
        {
            "fieldname": "resolution_notes",
            "fieldtype": "Text",
            "label": "Resolution Notes",
        },
        {
            "fieldname": "resolved_by",
            "fieldtype": "Data",
            "label": "Resolved By",
            "read_only": 1,
        },
        {
            "fieldname": "resolved_date",
            "fieldtype": "Date",
            "label": "Resolved Date",
            "read_only": 1,
        },
    ],
    "permissions": [
        {
            "role": "System Manager",
            "read": 1,
            "write": 1,
            "create": 1,
            "delete": 1,
        },
        {
            "role": "Academics User",
            "read": 1,
            "write": 1,
            "create": 1,
            "delete": 0,
        },
    ],
    "sort_field": "creation",
    "sort_order": "DESC",
    "title_field": "subject",
}

print("Creating Complaint DocType...")
r = requests.post(
    f'{BASE}/api/resource/DocType',
    headers=HEADERS,
    json=doctype_def,
)

if r.status_code in (200, 201):
    print("SUCCESS! Complaint DocType created.")
    data = r.json().get('data', {})
    print(f"  Name: {data.get('name')}")
    print(f"  Autoname: {data.get('autoname')}")
    print(f"  Module: {data.get('module')}")
else:
    print(f"FAILED! Status: {r.status_code}")
    print(r.text[:2000])
