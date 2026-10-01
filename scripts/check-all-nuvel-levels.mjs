const attemptIds = [
  { id: 'ee499674-fcbd-415a-9ad1-5f495afb53fd', name: 'Physics' },
  { id: '5ad858bc-94c6-48a4-bf2e-09468202daa7', name: 'Maths' },
  { id: 'bd0b5929-e67b-4daf-a9d5-521ff81fe2c8', name: 'Malayalam' },
  { id: '91d895d2-63f4-4c45-9b22-c70a59bc087f', name: 'Hindi' },
  { id: '5b039930-21e4-4a98-82cc-5c9764166b8c', name: 'English' },
  { id: '4e9293b8-e906-45e5-8151-0146da855c4a', name: 'Chemistry' },
  { id: '5c42fae6-ee05-438b-a775-51da24009e2a', name: 'Biology' },
];

async function checkAllNuvel() {
  for (const item of attemptIds) {
    const res = await fetch('https://smartuplearning.net/exam-site/result/' + item.id);
    const html = await res.text();
    const marker = '<span>Student Level</span></div><div class="mt-3 text-3xl font-black text-text-primary">';
    const idx = html.indexOf(marker);
    if (idx !== -1) {
      const level = html.slice(idx + marker.length, idx + marker.length + 15).split('<')[0].trim();
      console.log(`${item.name} (${item.id}): Level = ${level}`);
    } else {
      console.log(`${item.name} (${item.id}): Student Level NOT FOUND`);
    }
  }
}

checkAllNuvel().catch(console.error);
