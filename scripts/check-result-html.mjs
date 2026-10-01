async function checkResultHtml() {
  const attemptId = 'ee499674-fcbd-415a-9ad1-5f495afb53fd';
  const res = await fetch('https://smartuplearning.net/exam-site/result/' + attemptId);
  const html = await res.text();
  
  const idx = html.indexOf('Student Level');
  if (idx !== -1) {
    console.log("Snippet around Student Level:\n", html.slice(idx - 50, idx + 250));
  } else {
    console.log("Student Level not found in HTML");
  }

  const idx2 = html.indexOf('Diagnosed Level');
  if (idx2 !== -1) {
    console.log("Snippet around Diagnosed Level:\n", html.slice(idx2 - 50, idx2 + 250));
  }
}

checkResultHtml().catch(console.error);
