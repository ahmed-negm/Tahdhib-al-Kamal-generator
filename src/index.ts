import * as path from "path";
import { readFileSync, existsSync, writeFileSync } from "fs";
import { ExtractedNarratorData, NarratorInfo } from "./model";

import {
  askGenAI,
  extractJsonCodeBlock,
  hasIsolatedLetter,
  toArabicDigits,
} from "./utils";
import { createNarratorNote } from "./figureHelpers";

const MAX_GENERATED = 5;

async function main(): Promise<void> {
  const destinationPath = path.resolve(__dirname, "../../Zettelkasten/Figures");
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

    const content = readFileSync(sourceFile, "utf-8");
    if (!["خ", "م"].some((symbol) => hasIsolatedLetter(content, symbol))) {
      continue;
    }

    console.log(`Generating: ${narrator.id} ...`);

    const userPrompt = userPromptTemplate.replace("{{bio}}", content);

    const generatedContent = await askGenAI(systemPrompt, userPrompt);

    const extractedData = extractJsonCodeBlock<ExtractedNarratorData>(
      generatedContent || ""
    );

    if (!extractedData || !extractedData.teachers || !extractedData.students) {
      console.warn(
        `Failed to extract valid JSON data for narrator ID ${narrator.id}`
      );
      continue;
    }

    const finalContent = createNarratorNote(narrator, extractedData);
    writeFileSync(destinationFile, finalContent, "utf-8");

    count++;
    if (count >= MAX_GENERATED) {
      break;
    }
  }

  console.log(`Total files generated: ${count}`);
}

main().catch(console.error);
