async function testProd() {
  const url = 'https://smartuplearning.net/api/mcp';
  
  // 1. tools/list
  const listRes = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' })
  });
  const listData = await listRes.json();
  console.log('Production registered tools count:', listData.result?.tools?.length);
  console.log('Tools:', listData.result?.tools?.map(t => t.name).join(', '));

  // 2. get_overdue_fees
  const overdueRes = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: { name: 'get_overdue_fees', arguments: {} }
    })
  });
  const overdueData = await overdueRes.json();
  const overdueContent = JSON.parse(overdueData.result?.content?.[0]?.text || '{}');
  console.log('\n--- Production Overdue Fees ---');
  console.log('Total Overdue:', overdueContent.total_overdue);
  console.log('Students with Overdue:', overdueContent.students_with_overdue);
  console.log('Overdue Invoices Count:', overdueContent.overdue_invoices_count);
  console.log('Sample Branch:', overdueContent.branch_breakdown?.[0]);

  // 3. get_exam_metrics
  const examRes = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'get_exam_metrics', arguments: {} }
    })
  });
  const examData = await examRes.json();
  const examContent = JSON.parse(examData.result?.content?.[0]?.text || '{}');
  console.log('\n--- Production Exam Metrics ---');
  console.log('Online diagnosis papers:', examContent.total_papers, 'attempts:', examContent.total_student_attempts);
  console.log('Best performing exam:', examContent.summary?.best_performing_exam, examContent.summary?.best_exam_avg_score);
  console.log('Top student overall:', examContent.summary?.top_student_overall, examContent.summary?.top_student_percentage);
  console.log('Top 3 exams:', examContent.best_performing_exams?.slice(0, 3)?.map(e => `${e.exam_name} (${e.average_percentage}%)`));

  // 4. get_top_students
  const topRes = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: { name: 'get_top_students', arguments: { exam_name: 'CWC', limit: 3 } }
    })
  });
  // 5. get_executive_kpis
  const kpiRes = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: { name: 'get_executive_kpis', arguments: {} }
    })
  });
  const kpiData = await kpiRes.json();
  const kpiContent = JSON.parse(kpiData.result?.content?.[0]?.text || '{}');
  console.log('\n--- Production Executive KPIs ---');
  console.log('Total Students:', kpiContent.total_students);
  console.log('Active Students:', kpiContent.active_students);
  console.log('Discontinued Students:', kpiContent.discontinued_students);
  console.log('Total Staff:', kpiContent.total_staff);
  console.log('Total Billed:', kpiContent.total_billed);
  console.log('Total Collected:', kpiContent.total_collected);
  console.log('Total Outstanding:', kpiContent.total_outstanding);
  console.log('Collection Rate:', kpiContent.collection_rate);

  // 6. get_fees_and_collections
  const feeRes = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: { name: 'get_fees_and_collections', arguments: {} }
    })
  });
  const feeData = await feeRes.json();
  const feeContent = JSON.parse(feeData.result?.content?.[0]?.text || '{}');
  console.log('\n--- Production Fees Summary ---');
  console.log(feeContent.summary);
}

testProd();
