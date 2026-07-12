import json
import re
import sys
from pathlib import Path

import pdfplumber
from pypdf import PdfReader


def normalize_text(value: str) -> str:
    value = value.replace("\x00", "")
    value = value.replace("\r\n", "\n").replace("\r", "\n")
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()


def extract_with_pdfplumber(pdf_path: Path) -> str:
    pages: list[str] = []
    with pdfplumber.open(str(pdf_path)) as pdf:
        for page in pdf.pages:
            text = page.extract_text(x_tolerance=1.5, y_tolerance=3) or ""
            text = normalize_text(text)
            if text:
                pages.append(text)
    return "\n\n".join(pages).strip()


def extract_with_pypdf(pdf_path: Path) -> str:
    reader = PdfReader(str(pdf_path))
    pages: list[str] = []
    for page in reader.pages:
        text = page.extract_text() or ""
        text = normalize_text(text)
        if text:
            pages.append(text)
    return "\n\n".join(pages).strip()


def main() -> int:
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Usage: extract_pdf_text.py <pdf_path>"}))
        return 1

    pdf_path = Path(sys.argv[1])
    if not pdf_path.exists():
        print(json.dumps({"error": "PDF file not found"}))
        return 1

    text = extract_with_pdfplumber(pdf_path)
    method = "pdfplumber"

    if not text:
        text = extract_with_pypdf(pdf_path)
        method = "pypdf"

    if not text:
        print(json.dumps({"error": "No text extracted from PDF"}))
        return 1

    print(json.dumps({"text": text, "method": method}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
