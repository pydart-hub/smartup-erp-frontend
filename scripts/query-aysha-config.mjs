import fs from "fs";

const feeData = JSON.parse(fs.readFileSync("docs/fee_structure_parsed.json", "utf8"));
console.log("Config entry for 'Tier 1|Basic|Plus Two':");
console.log(JSON.stringify(feeData["Tier 1|Basic|Plus Two"], null, 2));
