#!/usr/bin/env python3
import os, json, datetime, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
PROMOS = ROOT / "7yup_pro_plus_project" / "data" / "promos.json"
REPORTS = ROOT / "reports"
REPORTS.mkdir(exist_ok=True)

today = datetime.datetime.utcnow().date().isoformat()
report_path = REPORTS / f"daily_report_{today}.md"

def load_promos():
    if PROMOS.exists():
        with open(PROMOS, "r", encoding="utf-8") as f:
            try:
                data = json.load(f)
                if isinstance(data, list):
                    return data
                elif isinstance(data, dict) and "items" in data:
                    return data["items"]
            except Exception as e:
                print(f"[ERROR] bad promos.json: {e}")
    return []

def main():
    promos = load_promos()
    total = len(promos)
    active = sum(1 for p in promos if p.get("active", True))
    badges = {}
    for p in promos:
        b = (p.get("badge") or "—").strip()
        badges[b] = badges.get(b, 0) + 1
    lines = []
    lines.append(f"# 7YUP PRO+ Daily Report — {today}")
    lines.append("")
    lines.append(f"- Total promos: **{total}**")
    lines.append(f"- Active: **{active}** / Inactive: **{total-active}**")
    lines.append(f"- By badge: " + ", ".join([f"`{k}`: {v}" for k,v in sorted(badges.items())]))
    lines.append("")
    lines.append("## Sample Top 10 (by rank)")
    top = sorted(promos, key=lambda x: x.get("rank", 9999))[:10]
    for i,p in enumerate(top, 1):
        brand = p.get("brand","")
        title = p.get("title","")
        badge = p.get("badge","")
        lines.append(f"{i}. **{brand}** — {title} {f'[`{badge}`]' if badge else ''}")
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"[OK] Wrote {report_path}")

if __name__ == "__main__":
    main()
