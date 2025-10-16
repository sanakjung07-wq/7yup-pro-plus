#!/usr/bin/env python3
import os, json, csv, re, sys, hashlib, datetime, unicodedata, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA_SOURCES = ROOT / "data_sources"
PROMOS_JSON = ROOT / "7yup_pro_plus_project" / "data" / "promos.json"

def slugify(text):
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = re.sub(r"[^a-zA-Z0-9ก-๙\-\s_]+", "", text)
    text = re.sub(r"\s+", "-", text).strip("-").lower()
    return text[:120]


def load_mappings():
    mfile = (ROOT / "data_sources" / "mappings.json")
    mapping = {}
    if mfile.exists():
        try:
            mapping = json.load(open(mfile, "r", encoding="utf-8"))
        except Exception as e:
            print(f"[WARN] bad mappings.json: {e}")
    # expected shape:
    # {
    #   "default": { "แบรนด์": "brand", "หัวข้อ": "title", ... },
    #   "overrides": { "file_pattern.csv": { ... } }
    # }
    return mapping

def apply_header_mapping(row: dict, filename: str, mappings: dict) -> dict:
    defmap = mappings.get("default", {})
    overrides = mappings.get("overrides", {})
    usemap = dict(defmap)
    for pat, m in overrides.items():
        try:
            if re.search(pat, filename, flags=re.IGNORECASE):
                usemap.update(m)
        except Exception:
            if pat in filename:
                usemap.update(m)
    out = {}
    for k,v in row.items():
        key = usemap.get(k, k)  # map if present else keep original
        out[key] = v
    return out


def load_existing():
    if PROMOS_JSON.exists():
        with open(PROMOS_JSON, "r", encoding="utf-8") as f:
            try:
                data = json.load(f)
                if isinstance(data, list):
                    return data
                elif isinstance(data, dict) and "items" in data and isinstance(data["items"], list):
                    return data["items"]
                else:
                    print("[WARN] promos.json format not list; wrapping into list")
                    return [data]
            except Exception as e:
                print(f"[ERROR] Failed to parse promos.json: {e}")
                return []
    return []

def read_all_sources():
    items = []
    for p in DATA_SOURCES.glob("**/*"):
        if p.is_file() and p.suffix.lower() in (".json", ".csv"):
            if p.suffix.lower() == ".json":
                try:
                    with open(p, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    if isinstance(data, list):
                        items.extend(data)
                    elif isinstance(data, dict) and "items" in data:
                        items.extend(data["items"])
                    else:
                        items.append(data)
                except Exception as e:
                    print(f"[WARN] bad JSON {p}: {e}")
            elif p.suffix.lower() == ".csv":
                with open(p, "r", encoding="utf-8-sig") as f:
                    reader = csv.DictReader(f)
                    mapping = load_mappings()
                    for row in reader:
                        items.append(apply_header_mapping(row, p.name, mapping))
    return items

def normalize_item(it):
    it = dict(it)
    brand = it.get("brand") or it.get("Brand") or ""
    title = it.get("title") or it.get("Title") or ""
    desc = it.get("desc") or it.get("description") or it.get("Description") or ""
    url = it.get("url") or it.get("link") or it.get("URL") or ""
    badge = it.get("badge") or it.get("tag") or ""
    image = it.get("image") or it.get("img") or it.get("thumb") or ""
    category = it.get("category") or it.get("cat") or ""
    rank = it.get("rank") or it.get("sort") or 9999
    createdAt = it.get("createdAt") or it.get("date") or datetime.datetime.utcnow().isoformat()

    # id/slug
    id_ = it.get("id") or it.get("slug")
    if not id_:
        id_ = slugify(f"{brand}-{title}") or hashlib.sha1(f"{brand}-{title}-{url}".encode()).hexdigest()[:10]

    # active flag
    active = it.get("active")
    if isinstance(active, str):
        active = active.strip().lower() in ("1","true","yes","y","on")

    return {
        "id": str(id_),
        "brand": brand,
        "title": title,
        "desc": desc,
        "url": url,
        "badge": badge,
        "image": image,
        "category": category,
        "rank": int(rank) if str(rank).isdigit() else 9999,
        "createdAt": createdAt,
        "active": bool(active) if active is not None else True
    }

def merge_unique(existing, new_items):
    by_id = {e.get("id"): e for e in existing if e.get("id")}
    for it in new_items:
        n = normalize_item(it)
        if n["id"] in by_id:
            # update minimal fields (non-empty override)
            cur = by_id[n["id"]]
            for k,v in n.items():
                if v not in (None, "", []):
                    cur[k] = v
        else:
            by_id[n["id"]] = n
    merged = list(by_id.values())
    merged.sort(key=lambda x: (not x.get("active", True), x.get("rank", 9999), x.get("brand",""), x.get("title","")))
    return merged

def main():
    existing = load_existing()
    incoming = read_all_sources()
    merged = merge_unique(existing, incoming)
    with open(PROMOS_JSON, "w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)
    print(f"[OK] Merged {len(incoming)} records into promos.json → {len(merged)} total")

if __name__ == "__main__":
    main()
