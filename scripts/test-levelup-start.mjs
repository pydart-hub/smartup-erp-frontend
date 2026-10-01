const res = await fetch("http://127.0.0.1:3001/api/levelup/start", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "Arjun Test",
    email: "test@gmail.com",
    schoolName: "ABC School",
    phone: "+919808805455",
    selectedClass: "Class 10",
    country: "India",
    emirateCity: "Ernakulam",
    curriculum: "CBSE",
  }),
});

const data = await res.json();
console.log("Start API Status:", res.status);
console.log("Start API Response:", data);
