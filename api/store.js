import fs from "fs";
import path from "path";

const filePath = path.resolve("./transactions.json");

// Initialize the file if it doesn't exist
if (!fs.existsSync(filePath)) {
  fs.writeFileSync(filePath, JSON.stringify({}));
}

export function readTransactions() {
  try {
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading transactions:", err);
    return {};
  }
}

export function writeTransactions(transactions) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(transactions, null, 2));
  } catch (err) {
    console.error("Error writing transactions:", err);
  }
}
