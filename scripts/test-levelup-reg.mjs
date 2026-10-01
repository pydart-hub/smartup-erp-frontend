const res = await fetch("http://127.0.0.1:3001/api/levelup/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "Test Student GCC",
    email: "test.gcc@smartup.com",
    schoolName: "SmartUp International School",
    phone: "+971501234567",
    selectedClass: "Class 10",
    country: "United Arab Emirates",
    emirateCity: "Dubai",
    curriculum: "CBSE",
  }),
});

const data = await res.json();
console.log("Status:", res.status);
console.log("Response:", data);
