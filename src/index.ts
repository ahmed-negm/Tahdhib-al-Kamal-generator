import * as path from "path";
import { readFileSync, existsSync } from "fs";
import { NarratorInfo } from "./model";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
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

    require("fs").writeFileSync(destinationFile, generatedContent, "utf-8");

    count++;
    if (count >= MAX_GENERATED) {
      break;
    }
  }

  console.log(`Total files generated: ${count}`);
}

function hasIsolatedLetter(str: string, letter: string): boolean {
  if (!/^[\u0621-\u064A]$/.test(letter)) {
    throw new Error(
      "Input letter must be a single Arabic character (0621–064A)."
    );
  }

  const escapedLetter = letter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

async function askGenAI(
  systemPrompt: string,
  userPrompt: string
): Promise<string | undefined> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.1
      },
    });

    return response.text;
  } catch (error) {
    console.error("Error generating content:", error);
    throw error; // Rethrow the error after logging
  }
}

main().catch(console.error);
