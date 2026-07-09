import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

export const runtime = "nodejs";
export const maxDuration = 120;

function getSupabaseUser(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
}

function getAIClient() {
  if (process.env.GROQ_API_KEY) {
    return { client: new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1" }), model: "llama-3.3-70b-versatile" };
  }
  return { client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }), model: "gpt-4o-mini" };
}

// pdf2json extraction — fixes decodeURIComponent crash on special chars
function parsePDFWithPdf2json(buffer: Buffer): Promise<string> {
  return new Promise((resolve) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const PDFParser = require("pdf2json");
      const parser = new PDFParser();
      parser.on("pdfParser_dataError", () => resolve(""));
      parser.on("pdfParser_dataReady", (data: any) => {
        try {
          const text = (data.Pages ?? []).map((page: any) =>
            (page.Texts ?? []).map((t: any) =>
              (t.R ?? []).map((r: any) => {
                try { return decodeURIComponent(r.T ?? ""); }
                catch { return r.T ?? ""; }          // don't crash on invalid %-sequences
              }).join("")
            ).join(" ")
          ).join("\n");
          resolve(text);
        } catch {
          resolve("");
        }
      });
      parser.parseBuffer(buffer);
    } catch {
      resolve("");
    }
  });
}

// pdfjs-dist fallback — handles more PDF encodings/fonts than pdf2json
async function parsePDFWithPdfjs(buffer: Buffer): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "";   // no worker needed server-side

    const pdf = await pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    }).promise;

    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page   = await pdf.getPage(i);
      const content = await page.getTextContent();
      pages.push(content.items.map((item: any) => item.str ?? "").join(" "));
    }
    return pages.join("\n");
  } catch {
    return "";
  }
}

async function extractPDFText(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  // Try pdf2json first (faster)
  const text1 = await parsePDFWithPdf2json(buffer);
  if (text1.trim().length >= 50) return { text: text1, pageCount: 0 };

  // Fallback: pdfjs-dist (better with complex fonts/encodings)
  const text2 = await parsePDFWithPdfjs(buffer);

  // Detect approximate page count from buffer to give a better error
  const pageCount = (buffer.toString("binary").match(/\/Type\s*\/Page\b/g) ?? []).length;

  return { text: text2, pageCount };
}

async function extractText(buffer: Buffer, fileName: string): Promise<string> {
  const name = fileName.toLowerCase();

  if (name.endsWith(".txt")) return buffer.toString("utf-8");

  if (name.endsWith(".pdf")) {
    const { text, pageCount } = await extractPDFText(buffer);
    if (text.trim().length < 50) {
      const hint = pageCount > 0
        ? `This appears to be a scanned PDF (${pageCount} page${pageCount !== 1 ? "s" : ""} detected but no text layer). Please export it as a text-based PDF or copy-paste the content into a .txt file.`
        : "Could not extract text. The PDF may be scanned, image-only, or password-protected. Try saving it as a text-based PDF or .txt file.";
      throw new Error(hint);
    }
    return text;
  }

  if (name.endsWith(".docx")) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mammoth = require("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value as string;
  }

  return buffer.toString("utf-8");
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

    const supabase = getSupabaseUser(token);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

    // ── Accept either storage path (large files) or raw FormData (small files) ──
    let buffer: Buffer;
    let fileName: string;

    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      // Large file path: file was uploaded directly to Supabase Storage by the browser
      const { storageKey, fileName: fn } = await req.json();
      if (!storageKey) return NextResponse.json({ detail: "No storageKey provided" }, { status: 400 });
      fileName = fn ?? storageKey.split("/").pop() ?? "file";

      const { data, error } = await supabase.storage.from("uploads").download(storageKey);
      if (error || !data) {
        return NextResponse.json({ detail: `Could not fetch file from storage: ${error?.message}` }, { status: 400 });
      }
      buffer = Buffer.from(await data.arrayBuffer());

      // Clean up temp file (best-effort, non-blocking)
      supabase.storage.from("uploads").remove([storageKey]).then(() => {});

    } else {
      // Small file path: FormData (kept for backward-compat, works for files < 4.5 MB)
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) return NextResponse.json({ detail: "No file provided" }, { status: 400 });
      fileName = file.name;
      buffer = Buffer.from(await file.arrayBuffer());
    }

    // ── Extract text ──
    let rawText: string;
    try {
      rawText = await extractText(buffer, fileName);
    } catch (e: any) {
      console.error("[Extract] File parse error:", e?.message);
      return NextResponse.json({ detail: `Could not read file: ${e?.message}` }, { status: 400 });
    }

    // Light cleanup of PDF-extraction noise (excess whitespace, stray blank lines)
    const cleaned = rawText
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    const trimmed = cleaned;
    const truncated = trimmed.slice(0, 12000);
    const { client, model } = getAIClient();

    const prompt = `You are an expert study material extractor. Extract structured study content from the text below.

Return ONLY valid JSON in this exact format:
{
  "subject_title": "Short subject name",
  "subject_description": "One sentence description",
  "modules": [
    {
      "title": "Module name",
      "concepts": [{"title": "Concept name", "explanation": "1-2 sentence explanation"}],
      "flashcards": [{"question": "Question?", "answer": "Answer", "difficulty": "easy|medium|hard"}]
    }
  ]
}

Create 2-4 modules, each with 3-5 concepts and 3-5 flashcards.

Text:
${truncated}`;

    let content: string;
    try {
      const response = await client.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 3000,
        temperature: 0.3,
      });
      content = response.choices[0].message.content ?? "";
    } catch (e: any) {
      console.error("[Extract] AI error:", e?.message);
      return NextResponse.json({ detail: `AI extraction failed: ${e?.message}` }, { status: 500 });
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ detail: "AI could not parse the document. Try a clearer text file." }, { status: 500 });
    }

    const preview = JSON.parse(jsonMatch[0]);
    // Return the extracted plain text too (capped) so it can be stored on the
    // subject for full-document exam/summary generation.
    return NextResponse.json({ preview, char_count: rawText.length, text: trimmed.slice(0, 120000) });

  } catch (err: any) {
    console.error("[Extract] Unexpected error:", err?.message);
    return NextResponse.json({ detail: err?.message ?? "Upload failed" }, { status: 500 });
  }
}
