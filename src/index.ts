import * as path from "path";
import { readFileSync, existsSync } from "fs";
import { NarratorInfo } from "./model";

const destinationPath = path.resolve(__dirname, "../../Zettelkasten/Figures");
const sourcePath = path.resolve(
  __dirname,
  "../../Books/Tahdhib-al-Kamal/Figures"
);

async function main(): Promise<void> {
  const narrators: NarratorInfo[] = JSON.parse(
    readFileSync("./data/Tahdhib.json", "utf-8")
  );

  for (const narrator of narrators.slice(0, 100)) {
    if (!narrator.id) {
      continue;
    }

    const destinationFile = path.join(destinationPath, `${narrator.name}.md`);
    if (existsSync(destinationFile)) {
      continue;
    }

    const sourceFile = path.join(
      sourcePath,
      `${toArabicDigits(narrator.id)}-${narrator.name}.md`
    );
    if (!existsSync(sourceFile)) {
      console.warn(`Source file does not exist: ${sourceFile}`);
      continue;
    }

    // Read the source file content
    const content = readFileSync(sourceFile, "utf-8");
    if (!["خ", "م"].some((symbol) => hasIsolatedLetter(content, symbol))) {
      continue;
    }

    // Write to the destination file
    require("fs").writeFileSync(destinationFile, content, "utf-8");
    console.log(`Generated: ${narrator.id}`);
  }
}

function hasIsolatedLetter(str: string, letter: string): boolean {
  if (!/^[\u0621-\u064A]$/.test(letter)) {
    throw new Error(
      "Input letter must be a single Arabic character (0621–064A)."
    );
  }

  // Escape the letter for use in regex
  const escapedLetter = letter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  
  // Pattern that checks if the letter is isolated:
  // - Not preceded by Arabic letters (allowing diacritics in between)
  // - Not followed by Arabic letters (allowing diacritics in between)
  const regex = new RegExp(
    `(?<![\\u0621-\\u064A][\\u064B-\\u065F]*)${escapedLetter}(?![\\u064B-\\u065F]*[\\u0621-\\u064A])`,
    "u"
  );
  return regex.test(str);
}

function toArabicDigits(str: number | null): string {
  if (str === null) return "";
  const arabic = "٠١٢٣٤٥٦٧٨٩";
  return String(str).replace(/[0-9]/g, (d) => arabic[parseInt(d)]);
}

main().catch(console.error);
