import fs from "fs";

const envPath = "/var/www/smartup-erp/.env.local";
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  const cleaned = content
    .split("\n")
    .filter((line) => !line.includes("LEVELUP_DATABASE_URL"))
    .join("\n")
    .trim();

  const finalContent =
    cleaned +
    '\nLEVELUP_DATABASE_URL="postgresql://smartup_offline_admin:Smartup@123@localhost:5432/smartup_online?schema=public"\n';

  fs.writeFileSync(envPath, finalContent, "utf8");
  console.log("Updated .env.local successfully");
}

const envMainPath = "/var/www/smartup-erp/.env";
if (fs.existsSync(envMainPath)) {
  const content = fs.readFileSync(envMainPath, "utf8");
  const cleaned = content
    .split("\n")
    .filter((line) => !line.includes("LEVELUP_DATABASE_URL"))
    .join("\n")
    .trim();

  const finalContent =
    cleaned +
    '\nLEVELUP_DATABASE_URL="postgresql://smartup_offline_admin:Smartup@123@localhost:5432/smartup_online?schema=public"\n';

  fs.writeFileSync(envMainPath, finalContent, "utf8");
  console.log("Updated .env successfully");
}
