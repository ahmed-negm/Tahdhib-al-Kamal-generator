import { readFileSync } from "fs";
import {
  BOOKS,
  ExtractedNarratorData,
  NarratorInfo,
  TahdibNarrator,
} from "./model";
import { getSignedUrl, toArabicDigits } from "./utils";

type BookName = (typeof BOOKS)[number]["name"];

const OTHERS_COLUMN = "Others";
const CHECKMARKS = ["✔", "✓", "✅"];
const HEADERS = ["الاسم", ...BOOKS.map((b) => b.name), OTHERS_COLUMN];

export function createNarratorNote(
  narrator: NarratorInfo,
  extractedData: ExtractedNarratorData
) {
  const { teachers, students } = extractedData;
  const teachersMarkdown = generateMarkdownTable(
    teachers.filter((n) => n.symbols)
  );
  const studentsMarkdown = generateMarkdownTable(
    students.filter((n) => n.symbols)
  );

  return createFigureNote(
    narrator,
    extractedData.knownName,
    teachersMarkdown,
    studentsMarkdown
  );
}

function createFigureNote(
  narrator: NarratorInfo,
  knownName: string,
  teachers: string,
  students: string
) {
  const replacements = {
    NAME: narrator.name,
    SIGNED_NAME: getSignedUrl(
      toArabicDigits(narrator.id!) + "-" + narrator.name
    ),
    KNOWN_NAME: knownName,
    PART: toArabicDigits(narrator.part),
    PAGE: toArabicDigits(narrator.page),
    SHAMELA_INDEX: narrator.shamelaIndex.toString(),
    TAHDHIB_ID: narrator.id?.toString() ?? "",
    DATE: new Date().toISOString().slice(0, 10),
    TEACHERS: teachers,
    STUDENTS: students,
  };

  const template = readFileSync("./data/Mohadith.md", "utf-8");
  return populateTemplate(template, replacements);
}

function populateTemplate(
  template: string,
  replacements: Record<string, string | number>
): string {
  let result = template;

  for (const [placeholder, value] of Object.entries(replacements)) {
    const regex = new RegExp(`{{${placeholder}}}`, "g");
    result = result.replace(regex, String(value));
  }

  return result;
}

function generateMarkdownTable(narrators: TahdibNarrator[]): string {
  const headerRow = `| ${HEADERS.join(" | ")} |`;
  const separatorRow = `| ${HEADERS.map(() => "---").join(" | ")} |`;
  const rows = narrators.map(narratorToRow);
  return [headerRow, separatorRow, ...rows].join("\n");
}

function processSymbols(symbols: string): Record<string, string> {
  const result: Record<string, string> = {};
  HEADERS.forEach((h) => (result[h] = ""));

  if (!symbols) return result;

  const clean = symbols.replace(/[()]/g, "").trim();
  const chars = clean.split(" ");

  // If "ع" or "٤" is present, mark all columns with check mark
  if (chars.includes("ع") || chars.includes("٤")) {
    for (const h of HEADERS.slice(0, -1)) {
      result[h] = CHECKMARKS[0];
    }
    return result;
  }

  const used = new Set<string>();
  for (const { symbol, name } of BOOKS) {
    if (chars.includes(symbol)) {
      result[name] = "✔";
      used.add(symbol);
    }
  }

  const others = chars.filter((ch) => !used.has(ch) && ch !== "");
  result[OTHERS_COLUMN] = others.join(" ");
  return result;
}

function narratorToRow(narrator: TahdibNarrator): string {
  const marks = processSymbols(narrator.symbols);
  return `| ${narrator.name} | ${BOOKS.map((b) => marks[b.name]).join(
    " | "
  )} | ${marks[OTHERS_COLUMN]} |`;
}

function isCheck(cell: string | undefined): boolean {
  if (!cell) return false;
  return CHECKMARKS.some((mark) => cell.includes(mark));
}

function extractFirstTableLines(
  markdown: string,
  sectionTitle: string
): string[] {
  const lines = markdown.split(/\r?\n/);
  const headerLineIndex = lines.findIndex((l) =>
    l.trim().startsWith(`## ${sectionTitle}`)
  );
  if (headerLineIndex === -1) return [];

  // find first table line after the header
  let i = headerLineIndex + 1;
  // skip non-table lines until a '|' line appears
  while (i < lines.length && !lines[i].trim().startsWith("|")) i++;
  if (i >= lines.length) return [];

  // collect consecutive '|' lines (the first table only)
  const tableLines: string[] = [];
  for (; i < lines.length; i++) {
    if (lines[i].trim().startsWith("|")) tableLines.push(lines[i]);
    else break; // stop at first non-table line after table started
  }

  return tableLines;
}

function parseTableLines(tableLines: string[], book?: BookName): string[] {
  if (tableLines.length === 0) return [];

  // Expect header + separator + data...
  if (tableLines.length <= 2) return []; // no data rows

  const dataLines = tableLines.slice(2); // skip header and separator rows
  const nonNameCount = HEADERS.length - 1; // 7

  const narrators: string[] = [];

  // Find the column index for the given book
  let bookColIdx: number | undefined = undefined;
  if (book) {
    bookColIdx = HEADERS.indexOf(book);
    if (bookColIdx === -1) bookColIdx = undefined;
  }

  for (const raw of dataLines) {
    // split by '|' but preserve empty slots
    const parts = raw.split("|").map((p) => p.trim());
    // remove leading empty slot if line begins with '|'
    if (parts.length > 0 && parts[0] === "") parts.shift();
    // remove trailing empty slot if line ends with '|'
    if (parts.length > 0 && parts[parts.length - 1] === "") parts.pop();

    // If too many columns, the name likely contained '|' — reconstruct name by
    // taking everything except last `nonNameCount` columns as the name.
    let cols: string[] = [];
    if (parts.length > HEADERS.length) {
      const rest = parts.slice(-nonNameCount);
      const nameParts = parts.slice(0, parts.length - nonNameCount);
      const name = nameParts.join(" | ").trim();
      cols = [name, ...rest];
    } else {
      // if fewer, pad with empty strings to keep positions stable
      cols = parts.slice(0);
      while (cols.length < HEADERS.length) cols.push("");
    }

    // Now cols.length should be >= HEADERS.length (we padded)
    // Take first HEADERS.length elements to be safe
    cols = cols.slice(0, HEADERS.length);

    const name = cols[0].trim();

    // If book is specified, only include narrators who have a checkmark in that book column
    if (bookColIdx !== undefined) {
      const cell = cols[bookColIdx];
      if (!isCheck(cell)) continue;
    }

    // If the name is Obsidian link like [[Name|Display]], extract the actual name part
    const linkMatch = name.match(/\[\[(.+?)(\|.+?)?\]\]/);
    if (linkMatch) {
      // Use the part before the pipe if present, else the whole inside of [[ ]]
      const extractedName = linkMatch[1].trim();
      if (extractedName) {
        narrators.push(extractedName.replace(/\\+/g, ""));
      }
      continue;
    }

    narrators.push(name);
  }

  return narrators;
}
