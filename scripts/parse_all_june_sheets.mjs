import xlsx from "xlsx";
import fs from "fs";
import path from "path";

const excelFile = `C:\\Users\\arjun\\Downloads\\SmartUp Documents\\Fee Structures\\June_Joiners_Class8_9_Fee_Structure.xlsx`;
const outputFile = path.join(process.cwd(), "docs", "june_joiners_fee_structure_parsed.json");

console.log(`Parsing June Joiners Excel file: ${excelFile}`);

const wb = xlsx.readFile(excelFile);

const parsedData = {};

// We process all branch sheets
for (const sheetName of wb.SheetNames) {
  if (sheetName === "SUMMARY") continue; // skip summary sheet
  
  const sheet = wb.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  
  let currentLevel = "Basic";
  
  rows.forEach((row) => {
    if (!row || row.length === 0) return;
    
    const firstCell = String(row[0] || "").trim();
    
    if (firstCell.includes("INTERMEDIATE")) {
      currentLevel = "Intermediate";
      return;
    } else if (firstCell.includes("ADVANCED")) {
      currentLevel = "Advanced";
      return;
    } else if (firstCell.includes("BASIC")) {
      currentLevel = "Basic";
      return;
    }
    
    // Check if first cell is a class name (e.g. "8 State", "9 State", "8 CBSE", "9 CBSE")
    if (firstCell.match(/^(8|9)\s*(State|CBSE|Cbse)/i)) {
      const className = firstCell;
      const annual_fee = Number(row[1]) || 0;
      const early_bird = Number(row[2]) || 0;
      const otp = Number(row[3]) || 0;
      
      const quarterly_total = Number(row[4]) || 0;
      const q1 = Number(row[5]) || 0;
      const q2 = Number(row[6]) || 0;
      const q3 = Number(row[7]) || 0;
      const q4 = Number(row[8]) || 0;
      
      const inst6_total = Number(row[9]) || 0;
      const inst6_per = Number(row[10]) || 0;
      const inst6_last = Number(row[15]) || 0;
      
      const inst8_total = Number(row[16]) || 0;
      const inst8_per = Number(row[17]) || 0;
      const inst8_last = Number(row[24]) || 0;
      
      const key = `${sheetName}|${currentLevel}|${className}`;
      
      parsedData[key] = {
        branch: sheetName,
        plan: currentLevel,
        class: className,
        annual_fee,
        early_bird,
        otp,
        quarterly_total,
        q1, q2, q3, q4,
        inst6_total,
        inst6_per,
        inst6_last,
        inst8_total,
        inst8_per,
        inst8_last
      };
    }
  });
}

fs.writeFileSync(outputFile, JSON.stringify(parsedData, null, 2));
console.log(`\n✅ Saved June Joiners Parsed Fee Structure to: ${outputFile}`);
console.log(`Total parsed June entries: ${Object.keys(parsedData).length}`);
