const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL || 'https://smartup.m.frappe.cloud';
const API_KEY = process.env.FRAPPE_API_KEY || '03330270e330d49';
const API_SECRET = process.env.FRAPPE_API_SECRET || '9c2261ae11ac2d2';

async function testRanking() {
  const headers = { Authorization: `token ${API_KEY}:${API_SECRET}`, Accept: 'application/json' };

  // Fetch all CWC Assessment Plans
  const plansRes = await fetch(`${FRAPPE_URL}/api/resource/Assessment Plan?filters=${encodeURIComponent(JSON.stringify([['assessment_group', 'like', '%CWC%']]))}&fields=${encodeURIComponent(JSON.stringify(['name', 'assessment_name', 'assessment_group', 'student_group', 'course', 'maximum_assessment_score']))}&limit_page_length=500`, { headers });
  const plansData = await plansRes.json();
  const plans = plansData.data || [];
  console.log('Total CWC plans:', plans.length);

  // Fetch Assessment Results for CWC
  const planNames = plans.map(p => p.name);
  const planMap = new Map(plans.map(p => [p.name, p]));

  // In Frappe, query results with limit 1000
  const resultsRes = await fetch(`${FRAPPE_URL}/api/resource/Assessment Result?fields=${encodeURIComponent(JSON.stringify(['name', 'student', 'student_name', 'assessment_plan', 'total_score', 'maximum_score']))}&limit_page_length=1000`, { headers });
  const resultsData = await resultsRes.json();
  const results = resultsData.data || [];
  console.log('Total assessment results fetched:', results.length);

  // Group by exam (assessment_name / assessment_group / course)
  const examStats = new Map();
  const studentStats = new Map();

  for (const r of results) {
    const plan = planMap.get(r.assessment_plan);
    const examTitle = plan ? (plan.assessment_name || plan.assessment_group) : 'General Exam';
    const maxScore = Number(r.maximum_score || plan?.maximum_assessment_score || 100);
    const score = Number(r.total_score || 0);
    const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;

    if (!examStats.has(examTitle)) {
      examStats.set(examTitle, {
        exam_name: examTitle,
        group: plan?.assessment_group || 'Exam',
        course: plan?.course || 'General',
        total_students: 0,
        total_score: 0,
        total_max_score: 0,
        pass_count: 0,
        top_score: 0,
        top_student: '',
      });
    }
    const es = examStats.get(examTitle);
    es.total_students++;
    es.total_score += score;
    es.total_max_score += maxScore;
    if (pct >= 40) es.pass_count++;
    if (score > es.top_score) {
      es.top_score = score;
      es.top_student = r.student_name;
    }

    // Student stats
    const sId = r.student;
    if (!studentStats.has(sId)) {
      studentStats.set(sId, {
        student_id: sId,
        student_name: r.student_name,
        branch: plan?.student_group?.split('-')[0] || 'Smart Up',
        exams_taken: 0,
        total_score: 0,
        total_max_score: 0,
        percentage: 0,
        best_exam: examTitle,
        best_score: score,
      });
    }
    const ss = studentStats.get(sId);
    ss.exams_taken++;
    ss.total_score += score;
    ss.total_max_score += maxScore;
    if (score > ss.best_score) {
      ss.best_score = score;
      ss.best_exam = examTitle;
    }
  }

  const examList = Array.from(examStats.values()).map(e => ({
    exam_name: e.exam_name,
    course: e.course,
    group: e.group,
    student_attempts: e.total_students,
    average_percentage: e.total_max_score > 0 ? Number(((e.total_score / e.total_max_score) * 100).toFixed(1)) : 0,
    pass_rate: e.total_students > 0 ? `${((e.pass_count / e.total_students) * 100).toFixed(1)}%` : '0%',
    top_performer: e.top_student,
    top_score: e.top_score,
  })).sort((a,b) => b.average_percentage - a.average_percentage);

  for (const ss of studentStats.values()) {
    ss.percentage = ss.total_max_score > 0 ? Number(((ss.total_score / ss.total_max_score) * 100).toFixed(1)) : 0;
  }

  const topStudentsList = Array.from(studentStats.values()).sort((a,b) => b.percentage - a.percentage);

  console.log('Top performing exams (by avg percentage):', JSON.stringify(examList.slice(0, 8), null, 2));
  console.log('Top students overall:', JSON.stringify(topStudentsList.slice(0, 8), null, 2));
}

testRanking();
