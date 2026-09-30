const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL || 'https://smartup.m.frappe.cloud';
const API_KEY = process.env.FRAPPE_API_KEY || '03330270e330d49';
const API_SECRET = process.env.FRAPPE_API_SECRET || '9c2261ae11ac2d2';

async function testFullExamPerformance() {
  const headers = { Authorization: `token ${API_KEY}:${API_SECRET}`, Accept: 'application/json' };

  // 1. Fetch Assessment Plans (CWC and regular)
  const plansRes = await fetch(`${FRAPPE_URL}/api/resource/Assessment Plan?fields=${encodeURIComponent(JSON.stringify(['name', 'assessment_name', 'assessment_group', 'student_group', 'course', 'maximum_assessment_score']))}&limit_page_length=500`, { headers });
  const plansData = await plansRes.json();
  const plans = plansData.data || [];
  const planMap = new Map(plans.map(p => [p.name, p]));

  // 2. Fetch Assessment Results
  const resultsRes = await fetch(`${FRAPPE_URL}/api/resource/Assessment Result?filters=${encodeURIComponent(JSON.stringify([['docstatus', '=', 1]]))}&fields=${encodeURIComponent(JSON.stringify(['name', 'student', 'student_name', 'assessment_plan', 'total_score', 'maximum_score']))}&limit_page_length=2000`, { headers });
  const resultsData = await resultsRes.json();
  const results = resultsData.data || [];

  console.log(`Plans: ${plans.length}, Results: ${results.length}`);

  // Helpers to resolve branch
  function resolveBranch(studentId, studentGroup) {
    if (studentId.includes("CHL")) return "Smart Up Chullickal";
    if (studentId.includes("PLR")) return "Smart Up Palluruthy";
    if (studentId.includes("ERV")) return "Smart Up Eraveli";
    if (studentId.includes("FTK")) return "Smart Up Fortkochi";
    if (studentId.includes("THP")) return "Smart Up Thopumpadi";
    if (studentId.includes("VNL")) return "Smart Up Vennala";
    if (studentId.includes("MMK") || studentId.includes("MKZ")) return "Smart Up Moolamkuzhi";
    if (studentId.includes("EDPLY") || studentId.includes("EDP")) return "Smart Up Edappally";
    if (studentId.includes("KDV")) return "Smart Up Kadavanthara";
    if (studentGroup) {
      const g = studentGroup.split("-")[0];
      if (g) return `Smart Up ${g}`;
    }
    return "Smart Up General";
  }

  const examAgg = new Map();
  const studentAgg = new Map();
  const cwcExamAgg = new Map();

  for (const r of results) {
    const plan = planMap.get(r.assessment_plan);
    const examName = plan?.assessment_name || plan?.assessment_group || 'General Assessment';
    const group = plan?.assessment_group || 'Exam';
    const course = plan?.course || 'General';
    const maxScore = Number(r.maximum_score || plan?.maximum_assessment_score || 100);
    const score = Number(r.total_score || 0);
    const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
    const branch = resolveBranch(String(r.student || ''), plan?.student_group);

    // Exam aggregator
    if (!examAgg.has(examName)) {
      examAgg.set(examName, {
        exam_name: examName,
        course,
        group,
        attempts: 0,
        total_score: 0,
        total_max_score: 0,
        pass_count: 0,
        top_score: 0,
        top_student: '',
        top_student_branch: '',
      });
    }
    const ea = examAgg.get(examName);
    ea.attempts++;
    ea.total_score += score;
    ea.total_max_score += maxScore;
    if (pct >= 40) ea.pass_count++;
    if (score > ea.top_score) {
      ea.top_score = score;
      ea.top_student = r.student_name || r.student;
      ea.top_student_branch = branch;
    }

    // Student aggregator
    const sId = String(r.student || '');
    if (!studentAgg.has(sId)) {
      studentAgg.set(sId, {
        student_id: sId,
        student_name: r.student_name || sId,
        branch,
        exams_taken: 0,
        total_score: 0,
        total_max_score: 0,
        best_exam: examName,
        best_score: score,
        best_percentage: pct,
        is_cwc_participant: group.toLowerCase().includes('cwc'),
      });
    }
    const sa = studentAgg.get(sId);
    sa.exams_taken++;
    sa.total_score += score;
    sa.total_max_score += maxScore;
    if (group.toLowerCase().includes('cwc')) sa.is_cwc_participant = true;
    if (score > sa.best_score || (score === sa.best_score && pct > sa.best_percentage)) {
      sa.best_score = score;
      sa.best_percentage = Number(pct.toFixed(1));
      sa.best_exam = examName;
    }
  }

  // Format best performing exams
  const bestExams = Array.from(examAgg.values())
    .map(e => ({
      exam_name: e.exam_name,
      course: e.course,
      group: e.group,
      attempts: e.attempts,
      average_percentage: e.total_max_score > 0 ? Number(((e.total_score / e.total_max_score) * 100).toFixed(1)) : 0,
      pass_rate: e.attempts > 0 ? `${((e.pass_count / e.attempts) * 100).toFixed(1)}%` : '0%',
      top_performer: e.top_student,
      top_score: e.top_score,
      top_performer_branch: e.top_student_branch,
    }))
    .filter(e => e.attempts >= 3)
    .sort((a, b) => b.average_percentage - a.average_percentage);

  // Format top students
  const topStudents = Array.from(studentAgg.values())
    .map(s => ({
      student_id: s.student_id,
      student_name: s.student_name,
      branch: s.branch,
      exams_taken: s.exams_taken,
      total_score: s.total_score,
      total_max_score: s.total_max_score,
      overall_percentage: s.total_max_score > 0 ? Number(((s.total_score / s.total_max_score) * 100).toFixed(1)) : 0,
      best_exam: s.best_exam,
      best_score: s.best_score,
      best_percentage: s.best_percentage,
      is_cwc: s.is_cwc_participant,
    }))
    .sort((a, b) => b.overall_percentage - a.overall_percentage);

  // CWC Toppers by Branch
  const cwcStudents = topStudents.filter(s => s.is_cwc);
  const branchToppers = {};
  for (const s of cwcStudents) {
    if (!branchToppers[s.branch]) branchToppers[s.branch] = [];
    if (branchToppers[s.branch].length < 3) {
      branchToppers[s.branch].push(s);
    }
  }

  console.log('--- BEST PERFORMING EXAMS (TOP 5) ---');
  console.log(JSON.stringify(bestExams.slice(0, 5), null, 2));

  console.log('--- OVERALL TOP STUDENTS (TOP 5) ---');
  console.log(JSON.stringify(topStudents.slice(0, 5), null, 2));

  console.log('--- CWC BRANCH TOPPERS (SAMPLE) ---');
  console.log(JSON.stringify(Object.keys(branchToppers).map(b => ({ branch: b, toppers: branchToppers[b] })), null, 2));
}

testFullExamPerformance();
