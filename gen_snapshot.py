#!/usr/bin/env python3
"""从 Supabase 拉取最新工作台数据，生成本地同域快照 lulu_data.js。

关键修复：lulu_data.js 在「自身加载时」就同步把数据写入 localStorage，
早于主脚本里 `let todos = storage.get('todos')` 等模块级变量的初始化（主脚本在它之后才解析）。
这样首次打开手机端时，内存变量能直接读到快照数据，不依赖 Supabase 是否可达。
排除 wb_cloudsync（同步配置由设备自身 SYNC_DEFAULT 决定），只导出用户数据键。
"""
import json
import os
import re
import datetime
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
        # 自应用：加载即写入 localStorage，确保不晚于主脚本的模块级变量初始化
        f.write("""(function(){
  try {
    var s = window.__LULU_SNAPSHOT || {};
    // ⚠️ 关键修复：快照只在本机「完全没有该数据」时作首次种子植入，绝不覆盖已有本地内容。
    // 旧逻辑在手机端每次加载都无条件用(最多2小时前的)快照覆盖全部本地数据 →
    // 手机上刚编辑的内容一刷新就被冲掉，表现为"再进入回到没更新的状态"。
    var ua = navigator.userAgent || '';
    var isMobile = /Mobi|Android|iPhone|iPad|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|Mobile/i.test(ua);
    var n = 0, seeded = false;
    for (var k in s) {
      if (!Object.prototype.hasOwnProperty.call(s, k)) continue;
      if (k.indexOf('wb_') === 0 && k !== 'wb_cloudsync') {
        if (localStorage.getItem(k) === null) {
          localStorage.setItem(k, JSON.stringify(s[k])); n++; seeded = true;
        }
      }
    }
    // 若是从快照种子过来的(本机原本空)→ 作废云端指纹，让打开后从云端拉一次校准
    if (seeded && isMobile) { localStorage.removeItem('lulu_last_cloud_sync'); }
    window.__LULU_SNAP_LOADED = n;
  } catch(e) { window.__LULU_SNAP_ERR = String(e); }
})();
""")
    # 版本标记已停用：前端已移除"检测 version.json 自动强刷"逻辑（避免每次构建变版本号导致疯狂刷新），
    # 故不再写入 version.json，保持线上文件稳定。
    print(f"OK: wrote {len(snap)} keys (self-applying) -> {out_path}")


if __name__ == "__main__":
    main()
