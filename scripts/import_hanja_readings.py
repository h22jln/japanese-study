#!/usr/bin/env python3
"""Import Korean Hanja readings into Supabase.

Expected CSV columns:
  hanja, meaning_ko, sound_ko, radical, strokes, source

Only `hanja` is required. Common alternate column names are accepted:
  meaning / meaningKo / meaning_ko
  sound / eum / main_sound / sound_ko

Usage:
  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... python scripts/import_hanja_readings.py path/to/hanja.csv
"""

from __future__ import annotations

import csv
import json
import os
import sys
import urllib.error
import urllib.request


SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
BATCH_SIZE = 500


def first_value(row: dict[str, str], *keys: str) -> str | None:
    for key in keys:
        value = (row.get(key) or "").strip()
        if value:
            return value
    return None


def normalize_row(row: dict[str, str]) -> dict[str, object] | None:
    hanja = first_value(row, "hanja", "char", "character", "한자")
    if not hanja:
        return None
    hanja = hanja.strip()[0]

    strokes = first_value(row, "strokes", "stroke", "total_strokes", "획수")
    payload: dict[str, object] = {
        "hanja": hanja,
        "meaning_ko": first_value(row, "meaning_ko", "meaningKo", "meaning", "뜻"),
        "sound_ko": first_value(row, "sound_ko", "sound", "eum", "main_sound", "음"),
        "radical": first_value(row, "radical", "부수"),
        "source": first_value(row, "source", "출처") or "csv",
    }
    if strokes and strokes.isdigit():
        payload["strokes"] = int(strokes)
    return payload


def post_batch(rows: list[dict[str, object]]) -> None:
    if not SUPABASE_URL or not SERVICE_KEY:
        raise RuntimeError("SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")

    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/hanja_readings?on_conflict=hanja"
    request = urllib.request.Request(
        url,
        data=json.dumps(rows).encode("utf-8"),
        method="POST",
        headers={
            "apikey": SERVICE_KEY,
            "Authorization": f"Bearer {SERVICE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates",
        },
    )
    try:
        with urllib.request.urlopen(request) as response:
            response.read()
    except urllib.error.HTTPError as error:
        raise RuntimeError(error.read().decode("utf-8")) from error


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python scripts/import_hanja_readings.py path/to/hanja.csv")

    imported = 0
    batch: list[dict[str, object]] = []
    with open(sys.argv[1], newline="", encoding="utf-8-sig") as file:
        for row in csv.DictReader(file):
            payload = normalize_row(row)
            if not payload:
                continue
            batch.append(payload)
            if len(batch) >= BATCH_SIZE:
                post_batch(batch)
                imported += len(batch)
                batch = []

    if batch:
        post_batch(batch)
        imported += len(batch)

    print(f"Imported {imported} hanja readings")


if __name__ == "__main__":
    main()
