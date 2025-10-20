import { GoogleGenAI } from "@google/genai";

export function getSignedUrl(url: string): string {
  return url.replace(/ /g, "%20");
}

export function hasIsolatedLetter(str: string, letter: string): boolean {

  const escapedLetter = letter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(
    `(?<![\\u0621-\\u064A][\\u064B-\\u065F]*)${escapedLetter}(?![\\u064B-\\u065F]*[\\u0621-\\u064A])`,
    "u"
  );
  return regex.test(str);
}

export function toArabicDigits(str: number | null): string {
  if (str === null) return "";
  const arabic = "٠١٢٣٤٥٦٧٨٩";
  return String(str).replace(/[0-9]/g, (d) => arabic[parseInt(d)]);
}

export function extractJsonCodeBlock<T = any>(text: string): T | null {
  const match = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

export async function askGenAI(
  systemPrompt: string,
  userPrompt: string
): Promise<string | undefined> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.1,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Error generating content:", error);
    throw error;
  }
}
