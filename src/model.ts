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