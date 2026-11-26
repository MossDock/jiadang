/* ===== 08 提醒中心 ===== */
(function (A) {
  'use strict';
  A.actions = A.actions || {};

  A.renderReminders = function () {
    var list = A.buildReminders();
    var groups = [
      { k: 'red', t: '已过期 / 逾期', color: 'var(--red)', icon: '🔴' },
      { k: 'orange', t: '3 天内 · 紧急', color: 'var(--orange)', icon: '🟠' },
      { k: 'yellow', t: '临期提醒', color: '#b58b1f', icon: '🟡' }
    ];
    var html = A.pageHeader('提醒', {
      back: false,
      right: '<button class="iconbtn" data-action="go" data-href="#/settings" aria-label="提醒设置">⚙</button>'
    });

    html += '<div class="wrap">';
    html += '<div class="card tight"><div class="row" style="gap:6px">' +
      groups.map(function (g) {
        var n = list.filter(function (r) { return r.level === g.k; }).length;
        return '<div style="flex:1;text-align:center;min-width:0"><div class="big-num" style="font-size:22px;color:' + g.color + '">' + n + '</div>' +
          '<div class="tiny muted">' + g.t.split(' ')[0] + '</div></div>';
      }).join('') +
      '<div style="flex:1;text-align:center;min-width:0;border-left:1px solid var(--line)"><div class="big-num" style="font-size:22px">' + list.length + '</div><div class="tiny muted">全部待办</div></div>' +
      '</div></div>';

    if (!list.length) {
      html += '<div class="empty"><div class="e">🌿</div><div class="t">一切都在掌控中，暂无临期事项</div>' +
        '<div class="d">食品、证件、缴费、保养、浇水这些事，到期前会自动出现在这里</div></div>';
    } else {
      groups.forEach(function (g) {
        var arr = list.filter(function (r) { return r.level === g.k; });
        if (!arr.length) return;
        html += '<div class="rem-group"><div class="rem-head"><span style="color:' + g.color + '">' + g.icon + '</span>' +
          g.t + '<span class="cnt">' + arr.length + ' 项</span></div>';
        html += arr.map(function (r) {
          return '<div class="rem-card ' + r.level + '" data-action="rem-open" data-type="' + r.refType + '" data-id="' + r.refId + '">' +
            '<div class="rem-ico">' + r.icon + '</div>' +
            '<div class="grow"><div class="rt">' + A.esc(r.title) + '</div>' +
            '<div class="rd">' + A.esc(r.target) + ' · ' + r.due + ' · ' + A.esc(r.source) + '</div></div>' +
            '<div class="days" style="color:' + g.color + '">' + A.daysText(r.daysLeft) + '<small>点击查看</small></div>' +
            '<button class="rem-close" data-action="rem-dismiss" data-id="' + A.esc(r.id) + '" aria-label="关闭这条提醒">×</button></div>';
        }).join('');
        html += '</div>';
      });
    }

    /* 设置入口 */
    var adv = A.db.settings.advance || {};
    html += '<div class="sec-title">提醒规则</div><div class="card">' +
      '<div class="small muted mb8">各类事项提前多少天提醒，可以在设置里改</div>' +
      A.ADVANCE_DEFS.map(function (d) {
        return '<div class="row between small" style="padding:5px 0;border-bottom:1px solid var(--line-2)">' +
          '<span>' + d.icon + ' ' + A.esc(d.label) + '</span><span class="b c-primary">提前 ' + A.num(adv[d.key] || d.def) + ' 天</span></div>';
      }).join('') +
      '<div class="row" style="gap:8px;margin-top:12px"><button class="btn soft sm" style="flex:1" data-action="go" data-href="#/settings">调整提前天数</button>' +
      '<button class="btn ghost sm" style="flex:1" data-action="rem-reset">恢复已关闭的提醒</button></div></div>';

    html += '<div class="hr-text">提醒按紧急程度排序 · 点 × 可单独关闭一条</div></div><div class="safe-bottom"></div>';
    return html;
  };

  A.actions['rem-open'] = function (el) {
    A.go('#/' + (el.dataset.type === 'bill' ? 'bill/' : 'item/') + el.dataset.id);
  };
  A.actions['rem-dismiss'] = function (el) {
    A.dismissReminder(el.dataset.id);
    A.toast('这条提醒已关闭');
    A.render();
  };
  A.actions['rem-reset'] = function () {
    if (!A.db.dismissed.length) { A.toast('没有被关闭的提醒'); return; }
    A.confirm('恢复已关闭的提醒', '之前点 × 关闭的提醒会重新出现（日期变化后也会自动重新提醒）。', function () {
      A.db.dismissed = []; A.save(); A.toast('已恢复'); A.render();
    }, '恢复', false);
  };

})(window.App);
