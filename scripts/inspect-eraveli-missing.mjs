const BASE='https://smartup.m.frappe.cloud';
const AUTH='token 03330270e330d49:9c2261ae11ac2d2';
async function get(path) {
  const res = await fetch(BASE + path, { headers: { Authorization: AUTH, Accept: 'application/json' } });
  return res.json();
}
const branch='Smart Up Eraveli';
const ids=['STU-SU ERV-26-186','STU-SU ERV-26-187','STU-SU ERV-26-188','STU-SU ERV-26-189','STU-SU ERV-26-190'];
async function main() {
  for (const student of ids) {
    const stu = await get('/api/resource/Student/' + encodeURIComponent(student));
    console.log('\nSTUDENT', student, 'name=', stu.data?.student_name, 'enabled=', stu.data?.enabled, 'branch=', stu.data?.custom_branch);
    const pe = await get('/api/resource/Program Enrollment?' + new URLSearchParams({
      fields: JSON.stringify(['name','student','program','custom_plan','student_category','docstatus']),
      filters: JSON.stringify([['student','=',student]]),
      limit_page_length:'20'
    }));
    console.log('PE_COUNT', (pe.data||[]).length, 'PE', pe.data||[]);
    const groups = await get('/api/resource/Student Group?' + new URLSearchParams({
      fields: JSON.stringify(['name','program','student_group_name','custom_branch']),
      filters: JSON.stringify([['students.student','=',student]]),
      limit_page_length:'50'
    }));
    console.log('GROUPS_VIA_STUDENT', groups.data||[]);
  }
}
main().catch((e)=>{console.error(e);process.exit(1);});