/* ===== 05 首页 · UI v2 ===== */
(function (A) {
  'use strict';
  A.actions = A.actions || {};

  function icon(n) { return '<svg class="ic"><use href="#i-' + n + '"/></svg>'; }

  A.renderHome = function () {
    var now = new Date(), h = now.getHours();
    var greet = h < 6 ? '夜深了' : (h < 11 ? '早上好' : (h < 14 ? '中午好' : (h < 18 ? '下午好' : '晚上好')));
    var t = A.today();
    var mk = t.slice(0, 7);
    var ps = A.purchaseStats(mk + '-01', t);
    var monthBill = A.billMonthTotal(mk);
    var assets = A.totalAssets();
    var rems = A.buildReminders();
    var counts = { red: 0, orange: 0, yellow: 0 };
    rems.forEach(function (r) { counts[r.level]++; });

    var html = '<div class="hello"><div class="date">' + t.replace(/-/g, ' / ') + ' · ' + A.weekday(t) + '</div>' +
      '<div class="title">' + greet + '，<span>家里都好</span></div></div>';

    if (A.db.isDemo) {
      html += '<div class="demo-tip" id="demo-tip">' + icon('sparkle') + '<span class="grow">当前是<b>示例数据</b>，可以直接点开体验。开始记自己家之前，' +
        '<b data-action="clear-demo" style="text-decoration:underline">一键清空</b>即可。</span>' +
        '<button class="x" data-action="hide-demo-tip">&times;</button></div>';
    }

    html += '<div class="wrap">';

    /* 主视觉：家庭资产总值 —— 全页唯一视觉焦点 */
    html += '<div class="hero-card" data-action="go" data-href="#/stats/assets">' +
      '<div class="lab">' + icon('layers') + '家庭资产总值 <span style="opacity:.65">· 在用物品</span></div>' +
      '<div class="num mono-num"><small>¥</small>' + A.fmtNum(assets, 0) + '</div>' +
      '<div class="foot">共 ' + A.activeItems().length + ' 件在用物品' +
      (A.db.settings.depreciation ? ' · 已按折旧估算' : ' · 按购买价合计') + ' ›</div>' +
      '<div class="hero-metrics">' +
      '<div><div class="k">本月家庭支出</div><div class="v">' + A.money0(monthBill) + '</div></div>' +
      '<div><div class="k">本月新增</div><div class="v">' + ps.count + ' 件</div></div>' +
      '</div><span class="arrow">›</span></div>';

    /* 本月支出 + 临期待办 */
    html += '<div class="stat2">' +
      '<div class="mini-card" data-action="go" data-href="#/stats"><div class="lab">' + icon('wallet') + '本月家庭支出</div>' +
      '<div class="num mono-num">' + A.money0(monthBill) + '</div>' +
      '<div class="tiny muted mt6">固定支出 · 查看统计 ›</div></div>' +
      '<div class="mini-card" data-action="go" data-href="#/reminders"><div class="lab">' + icon('bell') + '临期待办</div>' +
      '<div class="num mono-num" style="color:' + (counts.red ? 'var(--red)' : (counts.orange ? 'var(--orange)' : 'var(--text)')) + '">' + rems.length + ' <small>项</small></div>' +
      '<div class="tiny muted mt6">' + (counts.red ? counts.red + ' 项已逾期 · ' : '') + '去看看 ›</div></div>' +
      '</div>';

    /* 物品总数 / 本月新增 / 本月购买金额 */
    html += '<div class="triple" data-action="go" data-href="#/items">' +
      '<div><div class="n mono-num">' + A.db.items.length + '</div><div class="l">物品总数</div></div>' +
      '<div><div class="n mono-num">' + ps.count + '</div><div class="l">本月新增件</div></div>' +
      '<div><div class="n mono-num" style="font-size:16px">' + A.shortMoney(ps.amount) + '</div><div class="l">本月购买(元)</div></div>' +
      '</div>';

    /* 待办提醒 */
    html += '<div class="sec-title">待办提醒 <span class="more" data-action="go" data-href="#/reminders">全部 ' + rems.length + ' 项 ›</span></div>';
    html += '<div class="card tight">';
    if (!rems.length) {
      html += '<div class="empty" style="padding:26px 10px"><div class="e">🌿</div><div class="t">一切都在掌控中</div><div class="d">暂无临期事项</div></div>';
    } else {
      html += rems.slice(0, 5).map(function (r) {
        var cls = r.level === 'red' ? 'red' : (r.level === 'orange' ? 'orange' : 'yellow');
        var tagCls = 'lv-' + cls;
        return '<div class="todo-row" data-action="go" data-href="#/' + (r.refType === 'bill' ? 'bill/' : 'item/') + r.refId + '">' +
          '<span class="todo-dot bg-' + cls + '"></span>' +
          '<span class="grow"><span class="t">' + A.esc(r.title) + ' · ' + A.esc(r.target) + '</span>' +
          '<span class="d">' + A.dateLabel(r.due) + '到期 · ' + A.daysText(r.daysLeft) + '</span></span>' +
          '<span class="todo-tag ' + tagCls + '">' + (r.level === 'red' ? '已过期' : (r.level === 'orange' ? '紧急' : '临期')) + '</span></div>';
      }).join('');
      if (rems.length > 5) html += '<div class="tiny muted center mt10" data-action="go" data-href="#/reminders">还有 ' + (rems.length - 5) + ' 项，查看全部 ›</div>';
    }
    html += '</div>';

    /* 快捷入口：线性图标 + 圆角色底 */
    html += '<div class="sec-title">快捷入口</div>' +
      '<div class="quick-grid">' +
      quick('plus', '加物品', '#/add', 'qi-g') + quick('box', '全部物品', '#/items', 'qi-c') +
      quick('receipt', '记一笔', '#/bills', 'qi-a') + quick('chart', '统计', '#/stats', 'qi-t') +
      '</div>';

    html += '<div class="hr-text">' + icon('shield') + '数据只保存在这台设备上</div></div>';
    return html;
  };

  function quick(icn, label, href, cls) {
    return '<div class="quick-item" data-action="go" data-href="' + href + '">' +
      '<span class="qi ' + cls + '">' + icon(icn) + '</span>' +
      '<span class="ql">' + label + '</span></div>';
  }

  A.actions['hide-demo-tip'] = function () {
    var n = A.$('#demo-tip'); if (n) n.remove();
  };
  A.actions['clear-demo'] = function () {
    A.confirm('清空示例数据', '将删除全部示例物品和账目，得到一个干净的空清单。此操作不可撤销。', function () {
      A.resetDB(false); A.toast('已清空，开始记自己家的东西吧'); A.render();
    }, '确认清空');
  };

})(window.App);
