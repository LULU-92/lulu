window.__LULU_SNAPSHOT = {"wb_app_v":20260915074423,"wb_lulu_word_cursor":{"date":"2026-9-15","start":0},"wb_autopush_2026-9-15":{"v":6,"date":"2026-9-15","words":[{"en":"implement","zh":"实施，执行","pos":"v.","example":"We need to implement the new policy.","phonetic":"/ˈɪmplɪment/","exampleCn":"我们需要执行这项新政策。"},{"en":"significant","zh":"重要的，显著的","pos":"adj.","example":"There has been a significant improvement.","phonetic":"/sɪɡˈnɪfɪkənt/","exampleCn":"已经有了显著的改善。"},{"en":"evaluate","zh":"评估，评价","pos":"v.","example":"Let's evaluate the results carefully.","phonetic":"/ɪˈvæljueɪt/","exampleCn":"让我们仔细评估结果。"},{"en":"collaborate","zh":"合作，协作","pos":"v.","example":"We should collaborate on this project.","phonetic":"/kəˈlæbəreɪt/","exampleCn":"我们应该在这个项目上合作。"},{"en":"innovative","zh":"创新的","pos":"adj.","example":"This is an innovative solution.","phonetic":"/ˈɪnəveɪtɪv/","exampleCn":"这是一个创新的解决方案。"}],"newsOff":0,"quoteIdx":18,"briefPage":0,"quoteClick":0}};
(function(){
  try {
    var s = window.__LULU_SNAPSHOT || {};
    // 手机端通常连不上云端(Supabase被墙)，必须每次加载都用最新快照刷新全部数据；
    // 桌面端已能正常连云端、且是数据编辑主端，只补充缺失键，绝不覆盖本地已有改动。
    var ua = navigator.userAgent || '';
    var isMobile = /Mobi|Android|iPhone|iPad|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|Mobile/i.test(ua);
    var n = 0;
    for (var k in s) {
      if (!Object.prototype.hasOwnProperty.call(s, k)) continue;
      if (k.indexOf('wb_') === 0 && k !== 'wb_cloudsync') {
        if (isMobile) {
          localStorage.setItem(k, JSON.stringify(s[k])); n++;
        } else if (!localStorage.getItem(k)) {
          localStorage.setItem(k, JSON.stringify(s[k])); n++;
        }
      }
    }
    window.__LULU_SNAP_LOADED = n;
  } catch(e) { window.__LULU_SNAP_ERR = String(e); }
})();
