import gzip
import json
import os
import re
import sys
import time
import urllib.request
from pathlib import Path

from lxml import etree


ROOT = Path(__file__).resolve().parents[1]
WORK_DIR = ROOT / "work" / "jmdict"
DOWNLOAD_URL = "http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz"
BATCH_SIZE = 400


def load_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip()
    return values


def ensure_env():
    env_values = {}
    env_values.update(load_env_file(ROOT / ".env"))
    env_values.update(load_env_file(ROOT / ".env.local"))
    for key, value in env_values.items():
        os.environ.setdefault(key, value)


def download_source(target_path: Path):
    target_path.parent.mkdir(parents=True, exist_ok=True)
    if target_path.exists():
        return
    with urllib.request.urlopen(DOWNLOAD_URL) as response, target_path.open("wb") as output:
        output.write(response.read())


def text_values(nodes):
    values = []
    for node in nodes:
        text = (node.text or "").strip()
        if text:
            values.append(text)
    return values


def parse_jmdict(source_path: Path):
    with gzip.open(source_path, "rb") as handle:
        context = etree.iterparse(handle, events=("end",), tag="entry", recover=True)
        for _, entry in context:
            sequence_text = entry.findtext("ent_seq")
            if not sequence_text:
                entry.clear()
                continue

            spellings = []
            reading_elements = entry.findall("r_ele")
            spelling_elements = entry.findall("k_ele")
            for element in spelling_elements:
                value = element.findtext("keb")
                if value:
                    spellings.append(value.strip())

            readings = []
            for element in reading_elements:
                value = element.findtext("reb")
                if value:
                    readings.append(value.strip())

            glosses = []
            parts_of_speech = []
            for sense in entry.findall("sense"):
                for gloss in sense.findall("gloss"):
                    lang = gloss.attrib.get("{http://www.w3.org/XML/1998/namespace}lang", "eng")
                    if lang == "eng" and gloss.text:
                        text = gloss.text.strip()
                        if text:
                            glosses.append(text)
                parts_of_speech.extend(text_values(sense.findall("pos")))

            is_common = False
            for element in [*spelling_elements, *reading_elements]:
                priorities = text_values(element.findall("ke_pri")) + text_values(element.findall("re_pri"))
                if any(priority.startswith(("news1", "ichi1", "spec1", "gai1")) for priority in priorities):
                    is_common = True
                    break

            spellings = list(dict.fromkeys(spellings))
            readings = list(dict.fromkeys(readings))
            glosses = list(dict.fromkeys(glosses))[:12]
            parts_of_speech = [re.sub(r"\s+", " ", value).strip() for value in dict.fromkeys(parts_of_speech)]

            if not readings or not glosses:
                entry.clear()
                continue

            yield {
                "entry_sequence": int(sequence_text),
                "primary_spelling": spellings[0] if spellings else None,
                "primary_reading": readings[0],
                "spellings": spellings,
                "readings": readings,
                "glosses": glosses,
                "glosses_ko": [],
                "parts_of_speech": parts_of_speech[:8],
                "is_common": is_common,
            }
            entry.clear()


def chunked(values, size):
    batch = []
    for value in values:
        batch.append(value)
        if len(batch) >= size:
            yield batch
            batch = []
    if batch:
        yield batch


def request_json(url: str, *, method: str = "GET", body=None):
    headers = {
        "apikey": os.environ["SUPABASE_SERVICE_ROLE_KEY"],
        "Authorization": f"Bearer {os.environ['SUPABASE_SERVICE_ROLE_KEY']}",
    }
    data = None
    if body is not None:
        headers["Content-Type"] = "application/json"
        headers["Prefer"] = "return=representation,resolution=merge-duplicates"
        data = json.dumps(body).encode("utf-8")
    request = urllib.request.Request(url, method=method, headers=headers, data=data)
    with urllib.request.urlopen(request) as response:
        raw = response.read()
        return json.loads(raw.decode("utf-8")) if raw else None


def import_entries(entries):
    base_url = os.environ["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/") + "/rest/v1"
    request_json(f"{base_url}/dictionary_terms?id=gt.0", method="DELETE")
    request_json(f"{base_url}/dictionary_entries?entry_sequence=gt.0", method="DELETE")

    imported = 0
    started_at = time.time()

    for batch in chunked(entries, BATCH_SIZE):
        inserted = request_json(f"{base_url}/dictionary_entries?select=id,entry_sequence,spellings,readings", method="POST", body=batch)
        terms = []
        for item in inserted or []:
            for spelling in item.get("spellings", []):
                terms.append({"entry_id": item["id"], "term": spelling, "term_type": "kanji"})
            for reading in item.get("readings", []):
                terms.append({"entry_id": item["id"], "term": reading, "term_type": "reading"})
        if terms:
            request_json(f"{base_url}/dictionary_terms", method="POST", body=terms)
        imported += len(batch)
        if imported % 2000 == 0:
            elapsed = time.time() - started_at
            print(f"Imported {imported} entries in {elapsed:.1f}s")


def main():
    ensure_env()
    if not os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or not os.environ.get("SUPABASE_SERVICE_ROLE_KEY"):
        raise SystemExit("Supabase env vars are missing")

    source_path = WORK_DIR / "JMdict_e.gz"
    download_source(source_path)
    import_entries(parse_jmdict(source_path))
    print("JMdict import complete")


if __name__ == "__main__":
    main()
