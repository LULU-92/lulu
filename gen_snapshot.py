#!/usr/bin/env python3
"""从 Supabase 拉取最新工作台数据，生成本地同域快照 lulu_data.js。
该快照由 Cloudflare Pages 同源托管，手机端首次打开时不依赖 Supabase 可达性即可拿到数据。
排除 wb_cloudsync（同步配置由设备自身 SYNC_DEFAULT 决定），只导出用户数据键。
"""
import json
import os
import urllib.request

SUPABASE_URL = "https://cxipvrpldukfypxrqwuq.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4aXB2cnBsZHVrZnlweHJxd3VxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMDU0MzEsImV4cCI6MjEwMDg4MTQzMX0.kzjgJNTR1XmS06oZGvSdGYk4Jn3rN02ptrLwVprwTao"
UID = "lulu-xiaolu-main"
EXCLUDE = {"wb_cloudsync"}


def main():
    url = f"{SUPABASE_URL}/rest/v1/lulu_data?id=eq.{UID}&select=data"
    req = urllib.request.Request(
        url, headers={"apikey": ANON_KEY, "Authorization": f"Bearer {ANON_KEY}"}
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        rows = json.load(r)
    if not rows:
        print("ERROR: cloud returned no rows")
        raise SystemExit(1)
    data = rows[0].get("data") or {}
    snap = {k: v for k, v in data.items() if k.startswith("wb_") and k not in EXCLUDE}
    out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "lulu_data.js")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("window.__LULU_SNAPSHOT = ")
        json.dump(snap, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")
    print(f"OK: wrote {len(snap)} keys -> {out_path}")


if __name__ == "__main__":
    main()
