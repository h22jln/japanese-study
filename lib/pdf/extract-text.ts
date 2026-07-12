import { access, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const PYTHON_CANDIDATES = [
  process.env.PDF_PYTHON_PATH,
  process.env.PYTHON,
  "python3",
  "/Users/hjshin/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3",
  "/usr/bin/python3",
].filter((value): value is string => Boolean(value));

async function findPythonExecutable() {
  for (const candidate of PYTHON_CANDIDATES) {
    try {
      if (candidate.includes("/")) {
        await access(candidate);
      }
      return candidate;
    } catch {}
  }

  throw new Error("PDF text extractor runtime is not available");
}

export async function extractPdfText(pdfBuffer: Buffer) {
  const tempDir = await mkdtemp(join(tmpdir(), "kotoba-pdf-"));
  const pdfPath = join(tempDir, "document.pdf");
  const python = await findPythonExecutable();
  const scriptPath = resolve(process.cwd(), "scripts/extract_pdf_text.py");

  try {
    await writeFile(pdfPath, pdfBuffer);
    const { stdout } = await execFileAsync(python, [scriptPath, pdfPath], { maxBuffer: 10 * 1024 * 1024 });
    const parsed = JSON.parse(stdout) as { text?: string; method?: string; error?: string };

    if (parsed.error) throw new Error(parsed.error);
    if (!parsed.text) throw new Error("PDF text extraction returned empty text");

    const text = parsed.text.trim();
    if (!text) throw new Error("PDF text extraction returned empty text");

    return { text, method: parsed.method ?? "unknown" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "PDF text extraction failed";
    throw new Error(`PDF text extraction failed: ${message}`);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
