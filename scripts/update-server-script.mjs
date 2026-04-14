import axios from 'axios';
const api = axios.create({
  baseURL: 'https://smartup.m.frappe.cloud/api',
  headers: { Authorization: 'token 03330270e330d49:9c2261ae11ac2d2' }
});

const NEW_SCRIPT = `doc = frappe.get_doc({
    "doctype": "Course Schedule",
    "student_group": frappe.form_dict.student_group,
    "course": frappe.form_dict.course,
    "instructor": frappe.form_dict.instructor,
    "schedule_date": frappe.form_dict.schedule_date,
    "from_time": frappe.form_dict.from_time,
    "to_time": frappe.form_dict.to_time,
    "room": frappe.form_dict.room,
    "custom_branch": frappe.form_dict.custom_branch,
    "custom_topic": frappe.form_dict.custom_topic,
    "custom_event_type": frappe.form_dict.custom_event_type,
    "custom_event_title": frappe.form_dict.custom_event_title
})

doc.flags.ignore_validate = True
doc.flags.ignore_mandatory = True
doc.insert()

frappe.response["message"] = {"name": doc.name, "doctype": "Course Schedule"}`;

api.put('/resource/Server%20Script/' + encodeURIComponent('Create Course Schedule Force'), {
  script: NEW_SCRIPT
}).then(r => console.log('Updated server script:', r.data.data.name))
  .catch(e => console.error('Error:', e.response?.data || e.message));
