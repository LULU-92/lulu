window.__LULU_SNAPSHOT = {"wb_app_v":20260916105308,"wb_lulu_word_cursor":{"date":"2026-9-16","start":0},"wb_autopush_2026-9-16":{"v":6,"date":"2026-9-16","words":[{"en":"implement","zh":"实施，执行","pos":"v.","example":"We need to implement the new policy.","phonetic":"/ˈɪmplɪment/","exampleCn":"我们需要执行这项新政策。"},{"en":"significant","zh":"重要的，显著的","pos":"adj.","example":"There has been a significant improvement.","phonetic":"/sɪɡˈnɪfɪkənt/","exampleCn":"已经有了显著的改善。"},{"en":"evaluate","zh":"评估，评价","pos":"v.","example":"Let's evaluate the results carefully.","phonetic":"/ɪˈvæljueɪt/","exampleCn":"让我们仔细评估结果。"},{"en":"collaborate","zh":"合作，协作","pos":"v.","example":"We should collaborate on this project.","phonetic":"/kəˈlæbəreɪt/","exampleCn":"我们应该在这个项目上合作。"},{"en":"innovative","zh":"创新的","pos":"adj.","example":"This is an innovative solution.","phonetic":"/ˈɪnəveɪtɪv/","exampleCn":"这是一个创新的解决方案。"}],"newsOff":1,"quoteIdx":19,"briefPage":0,"quoteClick":0}};
(function(){
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
