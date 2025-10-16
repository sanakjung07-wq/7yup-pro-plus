#!/usr/bin/env python3
import os, json, re, sys, pathlib, urllib.request, urllib.parse, hashlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
CFG = ROOT / "data_sources" / "sheets.json"
OUTDIR = ROOT / "data_sources"
OUTDIR.mkdir(exist_ok=True)

def to_csv_url(url: str) -> str:
    # If it's a Google Sheets edit/gviz URL, rewrite to export CSV.
    # Accepts patterns:
    # - https://docs.google.com/spreadsheets/d/<id>/edit#gid=0
    # - https://docs.google.com/spreadsheets/d/<id>/gviz/tq?tqx=out:csv
    if "docs.google.com/spreadsheets" in url:
        m = re.search(r"/spreadsheets/d/([^/]+)/", url)
        gid = None
        m_gid = re.search(r"[#&?]gid=(\d+)", url)
        if m_gid:
            gid = m_gid.group(1)
        if m:
            sheet_id = m.group(1)
            base = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv"
            if gid:
                return f"{base}&gid={gid}"
            return base
    return url

def slugify(name: str) -> str:
    name = re.sub(r"[^a-zA-Z0-9ก-๙\-_.]+", "-", name.strip())
    return name.strip("-") or "sheet"

def fetch_one(url: str, name_hint: str = None) -> str:
    url_csv = to_csv_url(url)
    try:
        with urllib.request.urlopen(url_csv, timeout=30) as resp:
            data = resp.read()
    except Exception as e:
        print(f"[ERROR] fetch failed: {url_csv} → {e}", file=sys.stderr)
        return ""
    # derive filename
    if not name_hint:
        parsed = urllib.parse.urlparse(url_csv)
        base = parsed.path.rstrip("/").split("/")[-1] or "sheet"
        name_hint = base.split(".")[0]
    fname = slugify(name_hint) + ".csv"
    out = OUTDIR / fname
    with open(out, "wb") as f:
        f.write(data)
    print(f"[OK] fetched → {out} ({len(data)} bytes)")
    return str(out)

def main():
    urls_env = os.getenv("SHEETS_CSV_URLS", "").strip()
    names_env = os.getenv("SHEETS_CSV_NAMES", "").strip()
    pairs = []
    if CFG.exists():
        try:
            cfg = json.load(open(CFG, "r", encoding="utf-8"))
            if isinstance(cfg, list):
                for row in cfg:
                    url = (row.get("url") or "").strip()
                    name = (row.get("name") or "").strip() or None
                    if url:
                        pairs.append((url, name))
        except Exception as e:
            print(f"[WARN] bad sheets.json: {e}")
    if urls_env:
        urls = [u.strip() for u in urls_env.split(",") if u.strip()]
        names = [n.strip() for n in names_env.split(",")] if names_env else []
        for i,u in enumerate(urls):
            name = names[i] if i < len(names) else None
            pairs.append((u, name))
    if not pairs:
        print("[INFO] no sheets config or env provided; nothing to fetch.")
        return
    for url, name in pairs:
        fetch_one(url, name)

if __name__ == "__main__":
    main()
