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
    // 手机端通常连不上云端(Supabase被墙)，快照是离线兜底：内容与本地不同才写入；
    // 桌面端已能正常连云端、且是数据编辑主端，只补充缺失键，绝不覆盖本地已有改动。
    var ua = navigator.userAgent || '';
    var isMobile = /Mobi|Android|iPhone|iPad|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|Mobile/i.test(ua);
    var n = 0, changed = false;
    for (var k in s) {
      if (!Object.prototype.hasOwnProperty.call(s, k)) continue;
      if (k.indexOf('wb_') === 0 && k !== 'wb_cloudsync') {
        var cur = localStorage.getItem(k);
        var val = JSON.stringify(s[k]);
        if (cur !== val) {
          changed = true;
          if (isMobile || !cur) { localStorage.setItem(k, val); n++; }
        }
      }
    }
    // 手机端快照覆盖了本地数据后，作废"云端指纹"，强制打开页面后从云端重新校准一次，
    // 防止旧快照数据滞留（桌面端不动指纹，避免误伤未推送的本地编辑）。
    if (changed && isMobile) { localStorage.removeItem('lulu_last_cloud_sync'); }
    window.__LULU_SNAP_LOADED = n;
  } catch(e) { window.__LULU_SNAP_ERR = String(e); }
})();
""")
    # 版本标记：每次构建写入 version.json（含构建时间），供前端检测新版本自动刷新
    ver_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "version.json")
    with open(ver_path, "w", encoding="utf-8") as f:
        f.write(json.dumps({"v": datetime.datetime.now().strftime("%Y%m%d%H%M%S")}, ensure_ascii=False))
    print(f"OK: wrote {len(snap)} keys (self-applying) + version.json -> {out_path}")


if __name__ == "__main__":
    main()
