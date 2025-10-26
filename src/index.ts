import * as path from "path";
import { readFileSync, existsSync, writeFileSync } from "fs";
import { ExtractedNarratorData, NarratorInfo } from "./model";

import { askGenAI, extractJsonCodeBlock, toArabicDigits } from "./utils";
import { createNarratorNote } from "./figureHelpers";

const MAX_GENERATED = 1000;

async function main(): Promise<void> {
  const destinationMdPath = path.resolve(
    __dirname,
    "../../Books/Tahdhib-al-Kamal/Processed"
  );
  const destinationPath = path.resolve(
    __dirname,
    "../../Books/Tahdhib-al-Kamal/Json"
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

    const destinationJsonFile = path.join(destinationPath, `${toArabicDigits(narrator.id)}-${narrator.name}.json`);
    const destinationMdFile = path.join(destinationMdPath, `${narrator.id}-${narrator.name}.md`);

    let extractedData: ExtractedNarratorData | null = null;

    if (!existsSync(destinationJsonFile)) {
      const sourceFile = path.join(
        sourcePath,
        `${toArabicDigits(narrator.id)}-${narrator.name}.md`
      );
      if (!existsSync(sourceFile)) {
        console.warn(`[${narrator.id}] Source file does not exist`);
        continue;
      }

      const content = readFileSync(sourceFile, "utf-8");

      console.log(`[${count + 1}][${narrator.id}] Generating...`);

      const userPrompt = userPromptTemplate.replace("{{bio}}", content);

      const generatedContent = await askGenAI(systemPrompt, userPrompt);

      extractedData = extractJsonCodeBlock<ExtractedNarratorData>(
        generatedContent || ""
      );

      if (!extractedData) {
        console.warn(`   Failed to extract valid JSON data`);
        continue;
      }

      extractedData.teachers = extractedData.teachers || [];
      extractedData.students = extractedData.students || [];

      writeFileSync(
        destinationJsonFile,
        JSON.stringify(extractedData, null, 2),
        "utf-8"
      );
    }

    if (!existsSync(destinationMdFile)) {
      if (!extractedData) {
        extractedData = JSON.parse(
          readFileSync(destinationJsonFile, "utf-8")
        );
      }

      const finalContent = createNarratorNote(narrator, extractedData!);
      writeFileSync(destinationMdFile, finalContent, "utf-8");

      count++;
      if (count >= MAX_GENERATED) {
        break;
      }
    }
  }

  console.log(`Total files generated: ${count}`);
}

main().catch(console.error);
