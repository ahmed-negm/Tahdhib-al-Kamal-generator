import * as path from "path";
import { readFileSync, existsSync, writeFileSync } from "fs";
import { BOOK_SYMBOLS, ExtractedNarratorData, NarratorInfo } from "./model";

import {
  askGenAI,
  extractJsonCodeBlock,
  hasIsolatedLetter,
  toArabicDigits,
} from "./utils";
import { createNarratorNote } from "./figureHelpers";

const dryRun = false;
const MAX_GENERATED = !dryRun ? 200 : 10000000;

async function main(): Promise<void> {
  const originalPath = path.resolve(__dirname, "../../Zettelkasten/Figures");
  const destinationPath = path.resolve(
    __dirname,
    "../../Books/Tahdhib-al-Kamal/ProcessedFigures"
  );
  const sourcePath = path.resolve(
    __dirname,
    "../../Books/Tahdhib-al-Kamal/Figures"
  );
  const narrators: NarratorInfo[] = JSON.parse(
    readFileSync("./data/Tahdhib.json", "utf-8")
  );
  const systemPrompt = readFileSync("./data/SystemPrompt.md", "utf-8");
  const userPromptTemplate = readFileSync(
    "./data/ExtractNarratedFromTahdib.md",
    "utf-8"
  );

  let count = 0;
  for (const narrator of narrators) {
    if (!narrator.id) {
      continue;
    }

    const originalPathFile = path.join(originalPath, `${narrator.name}.md`);
    const destinationFile = path.join(destinationPath, `${narrator.name}.md`);
    if (existsSync(destinationFile) || existsSync(originalPathFile)) {
      continue;
    }

    const sourceFile = path.join(
      sourcePath,
      `${toArabicDigits(narrator.id)}-${narrator.name}.md`
    );
    if (!existsSync(sourceFile)) {
      console.warn(`[${narrator.id}] Source file does not exist`);
      continue;
    }

    const content = readFileSync(sourceFile, "utf-8");
    if (!BOOK_SYMBOLS.some((symbol) => hasIsolatedLetter(content, symbol))) {
      continue;
    }

    if (!dryRun) {
      console.log(`[${count + 1}][${narrator.id}] Generating...`);

      const userPrompt = userPromptTemplate.replace("{{bio}}", content);

      const generatedContent = await askGenAI(systemPrompt, userPrompt);

      const extractedData = extractJsonCodeBlock<ExtractedNarratorData>(
        generatedContent || ""
      );

      if (
        !extractedData ||
        !extractedData.teachers ||
        !extractedData.students
      ) {
        console.warn(`   Failed to extract valid JSON data`);
        continue;
      }

      const hasValidTeachers = extractedData.teachers.some(
        (teacher) =>
          teacher.symbols &&
          teacher.symbols.length > 0 &&
          BOOK_SYMBOLS.some((symbol) =>
            hasIsolatedLetter(teacher.symbols, symbol)
          )
      );
      const hasValidStudents = extractedData.students.some(
        (student) =>
          student.symbols &&
          student.symbols.length > 0 &&
          BOOK_SYMBOLS.some((symbol) =>
            hasIsolatedLetter(student.symbols, symbol)
          )
      );

      const finalContent = createNarratorNote(narrator, extractedData);
      writeFileSync(destinationFile, finalContent, "utf-8");
      if (!hasValidTeachers && !hasValidStudents) {
        console.warn(`   No valid teachers or students with book symbols`);
      }
    }

    count++;
    if (count >= MAX_GENERATED) {
      break;
    }
  }

  console.log(`Total files generated: ${count}`);
}

main().catch(console.error);
