import xlsx from "xlsx";
import path from "path";

const file = `C:\\Users\\arjun\\Downloads\\SmartUp Documents\\Fee Structures\\June_Joiners_Class8_9_Fee_Structure.xlsx`;

console.log(`Reading Excel file: ${file}\n`);

const workbook = xlsx.readFile(file);

console.log("Sheet Names in Workbook:");
console.log(workbook.SheetNames);
console.log("=".repeat(70));

for (const sheetName of workbook.SheetNames) {
  console.log(`\n--- SHEET: ${sheetName} ---`);
  const sheet = workbook.Sheets[sheetName];
  const json = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  json.forEach((row, idx) => {
    if (row && row.length > 0 && row.some(cell => cell !== null && cell !== "")) {
      console.log(`Row ${idx + 1}:`, JSON.stringify(row));
    }
  });
}
