export interface NarratorInfo {
  id: number | null;
  name: string;
  part: number;
  page: number;
  islamWebIndex: number;
  shamelaIndex: number;
}

export interface TahdibNarrator {
  name: string;
  symbols: string;
}

export interface ExtractedNarratorData {
  knownName: string;
  teachers: TahdibNarrator[];
  students: TahdibNarrator[];
}

export const BOOKS = [
  { symbol: "خ", name: "البخاري" },
  { symbol: "م", name: "مسلم" },
  { symbol: "ت", name: "الترمذي" },
  { symbol: "س", name: "النسائي" },
  { symbol: "ق", name: "ابن ماجه" },
  { symbol: "د", name: "أبي داود" },
] as const;

// get list of book symbols
export const BOOK_SYMBOLS = BOOKS.map((b) => b.symbol) as string[];
BOOK_SYMBOLS.push("ع");
BOOK_SYMBOLS.push("٤");

export const BUKHARI_SYMBOLS = ["خ", "ع", "٤"];
