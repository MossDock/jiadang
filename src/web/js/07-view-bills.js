/* ===== 07 账目 / 支出统计 / 资产统计 / 时间段购买统计 ===== */
(function (A) {
  'use strict';
  A.actions = A.actions || {};

  var TABS = [
    { k: 'bills', l: '项目', h: '#/bills' },
    { k: 'stats', l: '支出统计', h: '#/stats' },
    { k: 'assets', l: '资产统计', h: '#/stats/assets' },
    { k: 'purchases', l: '购买统计', h: '#/stats/purchases' }
  ];

  A.renderBills = function (p) {
    var tab = p.tab || 'bills';
    var html = A.pageHeader('账目', {
      back: false,
      right: '<button class="iconbtn primary" data-action="go" data-href="#/billform" aria-label="新增支出项目">＋</button>'
    });
    html += '<div class="segmented four">' + TABS.map(function (t) {
      return '<div class="' + (tab === t.k ? 'on' : '') + '" data-action="stats-tab" data-tab="' + t.k + '">' + t.l + '</div>';
    }).join('') + '</div>';

    if (tab === 'bills') html += billsTab();
    else if (tab === 'stats') html += statsTab();
    else if (tab === 'assets') html += assetsTab();
    else html += purchasesTab();
    html += '<div class="safe-bottom"></div>';
    return html;
  };
  A.actions['stats-tab'] = function (el) {
    var t = null; TABS.forEach(function (x) { if (x.k === el.dataset.tab) t = x; });
    if (t) A.go(t.h);
  };

  /* ---------------- 项目列表 ---------------- */
  function billsTab() {
    var mk = A.today().slice(0, 7);
    var total = A.billMonthTotal(mk);
    var cat = A.billCategoryData(mk);
    var html = '<div class="wrap">';

    html += '<div class="card"><div class="row between"><span class="small muted">本月家庭固定支出</span>' +
      '<span class="small muted">' + mk + '</span></div>' +
      '<div class="big-num mt6 mono-num">' + A.money(total) + '</div>' +
      '<div class="divider"></div>' +
      '<div class="row between"><span class="small b">分类占比</span><span class="tiny muted">共 ' + A.allRecords().filter(function (r) { return A.monthKey(r.date) === mk; }).length + ' 笔</span></div>' +
      '<div class="mt10">' + (cat.length ? A.chartDonut(cat.slice(0, 6), A.shortMoney(total), '本月合计') : '<div class="small muted center" style="padding:16px">本月还没有缴费记录</div>') + '</div></div>';

    html += '<div class="sec-title">周期支出项目 <span class="more">' + A.db.bills.length + ' 个</span></div>';
    if (!A.db.bills.length) {
      html += '<div class="empty"><div class="e">💰</div><div class="t">还没有支出项目</div><div class="d">添加房租、水电燃气等，就能记录缴费并自动提醒</div>' +
        '<button class="btn" data-action="go" data-href="#/billform">添加项目</button></div>';
    }
    A.db.bills.forEach(function (b) {
      var due = A.nextDueDate(b);
      var left = due ? A.daysLeft(due) : 9999;
      var cls = left < 0 ? 'c-red' : (left <= 3 ? 'c-orange' : (left <= 7 ? 'c-yellow' : 'muted'));
      var paid = (b.records || []).reduce(function (s, r) { return s + A.num(r.amount); }, 0);
      html += '<div class="bill-card" data-action="bill-open" data-id="' + b.id + '">' +
        '<div class="bill-ico"><svg class="ic"><use href="#i-receipt"/></svg></div>' +
        '<div class="grow"><div class="bn">' + A.esc(b.name) + '</div>' +
        '<div class="bd">' + A.cycleLabel(b.cycle) + ' · 累计 ' + A.money0(paid) + ' / ' + (b.records || []).length + ' 笔</div></div>' +
        '<div class="ba"><div class="m mono-num">' + A.money0(b.amount) + '</div>' +
        '<div class="d ' + cls + '">' + (due ? '下次 ' + A.dateLabel(due) : '未设缴费日') + '</div></div></div>';
    });
    html += '<div class="hr-text">支出统计与物品购买支出分开计算，互不混淆</div></div>';
    return html;
  }
  A.actions['bill-open'] = function (el) { A.go('#/bill/' + el.dataset.id); };

  /* ---------------- 项目详情 ---------------- */
  A.renderBillDetail = function (id) {
    var b = A.getBill(id);
    if (!b) return A.pageHeader('项目不存在', { back: true }) + '<div class="empty"><div class="d">可能已被删除</div></div>';
    var due = A.nextDueDate(b), left = due ? A.daysLeft(due) : 9999;
    var paid = (b.records || []).reduce(function (s, r) { return s + A.num(r.amount); }, 0);
    var tpl = null;
    A.BILL_TEMPLATES.forEach(function (t) { if (t.id === b.templateId) tpl = t; });
    var custom = b.custom || {};

    var html = A.pageHeader(b.name, { back: true, right: '<button class="iconbtn" data-action="bill-edit" data-id="' + b.id + '">✎</button>' });
    html += '<div class="wrap">';
    html += '<div class="hero-card"><div class="lab">' + (b.icon || '💰') + ' 周期金额 · ' + A.cycleLabel(b.cycle) + '</div>' +
      '<div class="num mono-num"><small>¥</small>' + A.fmtNum(b.amount) + '</div>' +
      '<div class="foot">下次缴费 ' + (due || '未设置') + (due ? ' · ' + A.daysText(left) : '') + '</div></div>';

    html += '<div class="card"><div class="group-title">项目信息</div><div class="group-body">' +
      kv('缴费周期', A.cycleLabel(b.cycle)) +
      kv('提醒方式', b.due === 'dayOfMonth' ? '每月固定日' : (b.due === 'fixedDate' ? '指定到期日' : '按周期推算')) +
      (b.due === 'dayOfMonth' ? kv('每月几号', (b.dueDay || 1) + ' 号') : '') +
      kv('提醒提前天数', (b.remindDays === null || b.remindDays === undefined || b.remindDays === '') ? '跟随全局设置' : b.remindDays + ' 天') +
      kv('累计缴费', A.money(paid) + ' · ' + (b.records || []).length + ' 笔') +
      (tpl ? tpl.fields.map(function (fd) {
        var v = custom[fd.key];
        return v ? kv(fd.label, A.esc(v)) : '';
      }).join('') : '') +
      '</div></div>';

    html += '<div class="sec-title">缴费记录 <span class="more">' + (b.records || []).length + ' 笔</span></div>';
    html += '<div class="card"><button class="btn block soft mb12" data-action="record-add" data-id="' + b.id + '">＋ 记一笔缴费</button>';
    if (!(b.records || []).length) html += '<div class="small muted center" style="padding:18px">还没有缴费记录，点上面记一笔</div>';
    else {
      html += '<div class="tl">' + b.records.map(function (r) {
        return '<div class="tl-item"><div class="th"><span class="b">' + A.esc(r.period || r.date) + '</span>' +
          '<span class="b mono-num">' + A.money(r.amount) + '</span></div>' +
          '<div class="tm">' + r.date + (r.note ? ' · ' + A.esc(r.note) : '') +
          (r.photo ? ' · <span class="c-primary" data-action="photo-view" data-src="' + A.esc(r.photo) + '">查看凭证</span>' : '') +
          ' · <span class="c-red" data-action="record-del" data-id="' + b.id + '" data-rec="' + r.id + '">删除</span></div></div>';
      }).join('') + '</div>';
    }
    html += '</div></div>';
    html += '<div class="actionbar" data-slot="actionbar">' +
      '<button class="btn ghost" data-action="bill-edit" data-id="' + b.id + '">✎ 编辑项目</button>' +
      '<button class="btn danger" data-action="bill-delete" data-id="' + b.id + '">删除项目</button></div>';
    return html;
  };
  function kv(k, v) { return '<div class="kv"><span class="k">' + A.esc(k) + '</span><span class="v">' + (v || '—') + '</span></div>'; }

  A.actions['bill-edit'] = function (el) { A.go('#/billform/edit/' + el.dataset.id); };
  A.actions['bill-delete'] = function (el) {
    var id = el.dataset.id, b = A.getBill(id);
    A.confirm('删除支出项目', '将删除「' + (b ? b.name : '') + '」及其全部缴费记录，不可恢复。', function () {
      A.deleteBill(id); A.toast('已删除'); A.go('#/bills', true);
    }, '确认删除');
  };

  /* ---------------- 缴费记录 ---------------- */
  A.actions['record-add'] = function (el) {
    var b = A.getBill(el.dataset.id); if (!b) return;
    var t = A.today();
    A.ui.recPhoto = '';
    var body = '<form id="recbill-form">' +
      A.fieldHTML({ key: 'date', label: '缴费日期', type: 'date' }, t) +
      A.fieldHTML({ key: 'amount', label: '金额（元）', type: 'number', unit: '元' }, b.amount || '') +
      A.fieldHTML({ key: 'period', label: '周期覆盖时段', type: 'text', placeholder: '如：2026年11月' }, t.slice(0, 4) + '年' + (+t.slice(5, 7)) + '月') +
      A.fieldHTML({ key: 'note', label: '备注', type: 'text', placeholder: '可选' }, '') +
      '<div class="field"><label>凭证照片（可选）</label><div class="photo-picker" id="rec-photo-box">' +
      '<div class="addp" data-action="rec-photo-add">＋</div></div>' +
      '<input type="file" id="rec-photo-file" accept="image/*" style="display:none"></div>' +
      '</form>';
    A.openSheet({
      title: '记一笔 · ' + b.name, body: body,
      foot: '<button class="btn ghost" data-sheet-close>取消</button><button class="btn" id="recbill-save">保存</button>',
      onMount: function (root, close) {
        A.$('#recbill-save', root).onclick = function () {
          var d = A.formData(A.$('#recbill-form', root));
          if (!A.num(d.amount)) { A.toast('请填写金额'); return; }
          A.addRecord(b.id, { date: d.date || t, amount: A.num(d.amount), period: d.period, note: d.note, photo: A.ui.recPhoto || '' });
          close(); A.toast('缴费已记录'); A.render();
        };
      }
    });
  };
  A.actions['rec-photo-add'] = function () { var f = A.$('#rec-photo-file'); if (f) f.click(); };
  A.onRecPhotoChosen = function (input) {
    var file = (input.files || [])[0]; if (!file) return;
    A.compressImage(file, 800).then(function (data) {
      A.ui.recPhoto = data;
      var box = A.$('#rec-photo-box');
      if (box) box.innerHTML = '<div class="ph"><img src="' + data + '" data-action="photo-view" data-src="' + data + '"><button type="button" class="del" data-action="rec-photo-del">×</button></div>';
    }).catch(function () { A.toast('照片读取失败'); });
    input.value = '';
  };
  A.actions['rec-photo-del'] = function () {
    A.ui.recPhoto = '';
    var box = A.$('#rec-photo-box');
    if (box) box.innerHTML = '<div class="addp" data-action="rec-photo-add">＋</div>';
  };
  A.actions['record-del'] = function (el) {
    var id = el.dataset.id, rid = el.dataset.rec;
    A.confirm('删除缴费记录', '确定删除这一笔缴费记录吗？', function () {
      A.deleteRecord(id, rid); A.toast('已删除'); A.render();
    }, '删除');
  };

  /* ---------------- 支出统计 ---------------- */
  function statsTab() {
    var mk = A.today().slice(0, 7), prevKey = A.lastMonths(2)[0];
    var cur = A.billMonthTotal(mk), prev = A.billMonthTotal(prevKey);
    var trend = A.billMonthSeries(12), cat = A.billCategoryData(mk);
    var year = A.today().slice(0, 4);
    var yearTotal = A.allRecords().reduce(function (s, r) { return s + (String(r.date).slice(0, 4) === year ? A.num(r.amount) : 0); }, 0);
    var yearCount = A.allRecords().filter(function (r) { return String(r.date).slice(0, 4) === year; }).length;
    var diff = prev > 0 ? Math.round((cur - prev) / prev * 100) : 0;

    var html = '<div class="wrap">';
    html += '<div class="card"><div class="small muted">本月固定支出</div>' +
      '<div class="big-num mt6 mono-num">' + A.money(cur) + '</div>' +
      '<div class="small muted mt6">上月 ' + A.money0(prev) + (prev > 0 ? ' · 环比 ' + (diff >= 0 ? '+' : '') + diff + '%' : '') + '</div></div>';

    html += '<div class="card"><div class="group-title">近 12 个月趋势</div>' + A.chartBars(trend) +
      '<div class="tiny muted center mt6">按月汇总实际缴费金额</div></div>';

    html += '<div class="card"><div class="group-title">本月分类占比</div>' +
      (cat.length ? A.chartDonut(cat, A.shortMoney(cur), '本月合计') : '<div class="small muted center" style="padding:18px">本月暂无缴费记录</div>') +
      '<div class="divider"></div>' + A.inlineBars(cat.slice(0, 8)) + '</div>';

    html += '<div class="card"><div class="group-title">' + year + ' 年度汇总</div><div class="group-body">' +
      '<div class="triple" style="box-shadow:none;background:var(--card-2)">' +
      '<div><div class="n" style="font-size:16px">' + A.shortMoney(yearTotal) + '</div><div class="l">全年合计(元)</div></div>' +
      '<div><div class="n" style="font-size:16px">' + A.shortMoney(yearTotal / 12) + '</div><div class="l">月均(元)</div></div>' +
      '<div><div class="n">' + yearCount + '</div><div class="l">缴费笔数</div></div></div></div></div>';

    html += '<div class="card"><div class="group-title">各项目累计</div>' +
      A.inlineBars(A.db.bills.map(function (b) {
        return { label: b.name, value: (b.records || []).reduce(function (s, r) { return s + A.num(r.amount); }, 0) };
      }).sort(function (a, b) { return b.value - a.value; }).slice(0, 10)) + '</div>';
    html += '</div>';
    return html;
  }

  /* ---------------- 资产统计 ---------------- */
  function assetsTab() {
    var total = A.totalAssets(), byCat = A.assetByCategory(), byLoc = A.assetByLocation();
    var hist = A.db.items.filter(function (i) { return i.status === '已丢弃' || i.status === '已送人'; });
    var html = '<div class="wrap">';
    html += '<div class="card"><div class="small muted">家庭资产总值 · 在用物品</div>' +
      '<div class="big-num mt6 mono-num">' + A.money(total) + '</div>' +
      '<div class="small muted mt6">' + A.activeItems().length + ' 件在用物品' +
      (A.db.settings.depreciation ? ' · 已开启折旧参考（家电数码 10%/年、家具 5%/年）' : ' · 按购买价合计，原始价格始终保留') + '</div>' +
      '<div class="divider"></div><div class="row between"><span class="small">折旧参考估算</span>' +
      '<span class="switch' + (A.db.settings.depreciation ? ' on' : '') + '" data-action="toggle-depreciation"><i></i></span></div></div>';

    html += '<div class="card"><div class="group-title">按类别分布</div>' +
      (byCat.length ? A.chartDonut(byCat.slice(0, 8), A.shortMoney(total), '总价值') : '<div class="small muted center" style="padding:18px">暂无在用物品</div>') +
      '<div class="divider"></div>' + A.inlineBars(byCat.slice(0, 12), { format: function (v) { return A.money0(v); } }) + '</div>';

    html += '<div class="card"><div class="group-title">按存放位置分布</div>' +
      A.inlineBars(byLoc.slice(0, 10), { format: function (v) { return A.money0(v); } }) + '</div>';

    html += '<div class="card"><div class="group-title">历史价值</div><div class="group-body">' +
      '<div class="row between"><span class="small muted">已丢弃 / 已送人（不计入总价值）</span><span class="b">' + A.money0(A.historyValue()) + '</span></div>' +
      '<div class="row between mt10"><span class="small muted">历史物品件数</span><span class="b">' + hist.length + ' 件</span></div>' +
      (hist.length ? '<div class="divider"></div>' + hist.slice(0, 8).map(function (i) {
        return '<div class="row between small" style="padding:5px 0"><span class="muted ellipsis">' + A.esc(i.name) + ' · ' + A.esc(i.status) + '</span><span>' + A.money0(A.itemValue(i)) + '</span></div>';
      }).join('') : '') + '</div></div>';
    html += '</div>';
    return html;
  }

  /* ---------------- 时间段购买统计 ---------------- */
  function monthlyAll() {
    return A.lastMonths(12).map(function (k) {
      return {
        label: A.monthLabel(k),
        value: A.db.items.reduce(function (s, i) { return s + (A.monthKey(i.purchaseDate) === k ? A.itemValue(i) : 0); }, 0)
      };
    });
  }
  function presetRange(preset) {
    var t = A.today();
    if (preset === 'month') return [t.slice(0, 7) + '-01', t];
    if (preset === 'year') return [t.slice(0, 4) + '-01-01', t];
    if (preset === '30') return [A.addDays(t, -29), t];
    if (preset === 'all') return ['', ''];
    return [A.ui.pFrom || '', A.ui.pTo || ''];
  }
  function purchasesTab() {
    if (!A.ui.pPreset) A.ui.pPreset = 'month';
    var range = presetRange(A.ui.pPreset);
    var from = range[0], to = range[1];
    A.ui.pFrom = from; A.ui.pTo = to;
    var ps = A.purchaseStats(from, to);
    var t = A.today();
    var thisMonth = A.purchaseStats(t.slice(0, 7) + '-01', t).amount;
    var pmFirst = A.addMonths(t, -1).slice(0, 7) + '-01';
    var lastMonth = A.purchaseStats(pmFirst, A.addDays(t.slice(0, 7) + '-01', -1)).amount;
    var thisYear = A.purchaseStats(t.slice(0, 4) + '-01-01', t).amount;
    var lastYear = A.purchaseStats((+t.slice(0, 4) - 1) + '-01-01', A.addMonths(t, -12)).amount;

    var html = '<div class="wrap">';
    html += '<div class="card"><div class="group-title">选择时间段</div>' +
      '<div class="date-range"><input type="date" id="p-from" value="' + A.esc(from) + '" data-action="p-date">' +
      '<span class="muted">至</span><input type="date" id="p-to" value="' + A.esc(to) + '" data-action="p-date"></div>' +
      '<div class="quick-dates">' + [
        { k: 'month', l: '本月' }, { k: '30', l: '最近 30 天' }, { k: 'year', l: '今年' }, { k: 'all', l: '全部时间' }, { k: 'custom', l: '自定义' }
      ].map(function (o) { return '<span class="qd' + (A.ui.pPreset === o.k ? ' on' : '') + '" data-action="p-preset" data-k="' + o.k + '">' + o.l + '</span>'; }).join('') + '</div></div>';

    html += '<div class="card"><div class="small muted">该时间段购买支出</div>' +
      '<div class="big-num mt6 mono-num">' + A.money(ps.amount) + '</div>' +
      '<div class="triple mt10" style="box-shadow:none;background:var(--card-2)">' +
      '<div><div class="n">' + ps.list.length + '</div><div class="l">购买笔数</div></div>' +
      '<div><div class="n">' + ps.count + '</div><div class="l">购买件数</div></div>' +
      '<div><div class="n" style="font-size:16px">' + (ps.list.length ? A.money0(ps.amount / ps.list.length) : '¥0') + '</div><div class="l">笔均金额</div></div></div></div>';

    html += '<div class="card"><div class="group-title">按类别细分</div>' +
      A.inlineBars(ps.byCat.slice(0, 12), { format: function (v) { return A.money0(v); } }) +
      (ps.byCat.length ? '<div class="divider"></div>' + ps.byCat.slice(0, 8).map(function (c) {
        return '<div class="row between small" style="padding:4px 0"><span class="muted">' + A.esc(c.label) + '</span><span>' + c.count + ' 件 · ' + A.money0(c.value) + ' · ' + A.pct(c.value, ps.amount) + '%</span></div>';
      }).join('') : '') + '</div>';

    html += '<div class="card"><div class="group-title">单笔最大支出 TOP 5</div>' +
      (ps.top.length ? ps.top.map(function (r, i) {
        return '<div class="rank"><span class="no' + (i === 0 ? ' top' : '') + '">' + (i + 1) + '</span><span class="rn">' + A.esc(r.label) + '</span><span class="rv mono-num">' + A.money0(r.value) + '</span></div>';
      }).join('') : '<div class="small muted center" style="padding:16px">该时间段没有购买记录</div>') + '</div>';

    html += '<div class="card"><div class="group-title">近 12 个月购买金额走势</div>' + A.chartBars(monthlyAll()) +
      '<div class="tiny muted center mt6">统计全部物品的购买金额（不受上面时间段影响）</div></div>';

    html += '<div class="card"><div class="group-title">对比</div><div class="group-body">' +
      cmpRow('本月 vs 上月', thisMonth, lastMonth) + cmpRow('今年 vs 去年同期', thisYear, lastYear) + '</div></div>';

    html += '<div class="card"><div class="group-title">导出统计结果</div>' +
      '<div class="row" style="gap:8px"><button class="btn soft sm" style="flex:1" data-action="export-purchase-csv">导出 CSV</button>' +
      '<button class="btn sm" style="flex:1" data-action="export-purchase-excel">导出 Excel</button></div></div>';
    html += '</div>';
    return html;
  }
  function cmpRow(label, a, b) {
    var d = b > 0 ? Math.round((a - b) / b * 100) : 0;
    return '<div class="kv"><span class="k">' + label + '</span><span class="v">' + A.money0(a) + ' / ' + A.money0(b) +
      ' <span class="' + (d >= 0 ? 'c-red' : 'c-green') + '">(' + (d >= 0 ? '+' : '') + d + '%)</span></span></div>';
  }
  A.actions['p-preset'] = function (el) {
    A.ui.pPreset = el.dataset.k;
    if (A.ui.pPreset !== 'custom') { var r = presetRange(A.ui.pPreset); A.ui.pFrom = r[0]; A.ui.pTo = r[1]; }
    A.render();
  };
  A.onPurchaseDateChange = function () {
    var f = A.$('#p-from'), t = A.$('#p-to');
    if (!f || !t) return;
    A.ui.pPreset = 'custom'; A.ui.pFrom = f.value; A.ui.pTo = t.value;
    A.render();
  };
  function purchaseRows() {
    var ps = A.purchaseStats(A.ui.pFrom, A.ui.pTo);
    var rows = [['家当 · 时间段购买统计'], ['时间段', (A.ui.pFrom || '最早') + ' ~ ' + (A.ui.pTo || '至今')],
      ['购买笔数', ps.list.length], ['购买件数', ps.count], ['总金额(元)', Math.round(ps.amount * 100) / 100], []];
    rows.push(['按类别', '件数', '金额(元)', '占比(%)']);
    ps.byCat.forEach(function (c) { rows.push([c.label, c.count, Math.round(c.value * 100) / 100, A.pct(c.value, ps.amount)]); });
    rows.push([], ['单笔 TOP5', '金额(元)']);
    ps.top.forEach(function (r) { rows.push([r.label, Math.round(r.value * 100) / 100]); });
    rows.push([], ['月份', '购买金额(元)']);
    monthlyAll().forEach(function (m, i) { rows.push([A.lastMonths(12)[i], Math.round(m.value * 100) / 100]); });
    rows.push([], ['物品明细'], ['名称', '类别', '购买日期', '金额(元)', '数量', '存放位置']);
    ps.list.forEach(function (i) { rows.push([i.name, A.catName(i.categoryId), i.purchaseDate, Math.round(A.itemValue(i) * 100) / 100, i.qty, i.location]); });
    return rows;
  }
  A.actions['export-purchase-csv'] = function () { A.exportCSV('购买统计_' + A.today() + '.csv', purchaseRows()); };
  A.actions['export-purchase-excel'] = function () {
    A.exportExcel('购买统计_' + A.today() + '.xls', [{ name: '购买统计', rows: purchaseRows() }]);
  };

  /* ---------------- 账目项目表单 ---------------- */
  A.renderBillForm = function (p) {
    var editing = !!p.id;
    var b = editing ? A.getBill(p.id) : null;
    if (editing && !b) return A.pageHeader('项目不存在', { back: true }) + '<div class="empty"><div class="d">可能已被删除</div></div>';

    /* 新增第一步：选模板 */
    if (!editing && !p.tpl) {
      var h = A.pageHeader('新增支出项目', { back: true }) +
        '<div class="wrap"><div class="small muted" style="padding:4px 2px 12px">选一个项目类型，也可以直接选「自定义项目」</div>' +
        '<div class="cat-grid">' + A.BILL_TEMPLATES.map(function (t) {
          return '<div class="cat-tile" data-action="pick-bill-tpl" data-tpl="' + t.id + '"><div class="e">' + t.icon + '</div><div class="n">' + A.esc(t.name) + '</div></div>';
        }).join('') + '</div></div>';
      return h;
    }

    var tplId = p.tpl || b.templateId;
    var tpl = null;
    A.BILL_TEMPLATES.forEach(function (t) { if (t.id === tplId) tpl = t; });
    if (!tpl) tpl = A.BILL_TEMPLATES[A.BILL_TEMPLATES.length - 1];
    var custom = editing ? (b.custom || {}) : {};
    var due = editing ? b.due : tpl.due;
    var cycle = editing ? b.cycle : tpl.cycle;

    var html = A.pageHeader(editing ? '编辑项目' : '新增 · ' + tpl.name, { back: true });
    html += '<div class="wrap"><form id="bill-form" data-tpl="' + tpl.id + '" data-id="' + (p.id || '') + '">';
    html += '<div class="form-group"><div class="fg-head">项目设置<span class="arw">▾</span></div><div class="fg-body">' +
      A.fieldHTML({ key: 'name', label: '项目名称', type: 'text', placeholder: '如：房租 / 电费', required: true }, editing ? b.name : tpl.name) +
      A.fieldHTML({ key: 'amount', label: '周期金额（元）', type: 'number', unit: '元', hint: '每期大概多少钱，用于展示和预估' }, editing ? b.amount : '') +
      A.fieldHTML({ key: 'cycle', label: '缴费周期', type: 'select', options: A.CYCLES.map(function (c) { return { v: c.v, l: c.l }; }) }, cycle) +
      A.fieldHTML({ key: 'due', label: '提醒方式', type: 'select', options: [{ v: 'cycle', l: '按上次缴费日 + 周期推算' }, { v: 'dayOfMonth', l: '每月固定几号' }, { v: 'fixedDate', l: '指定到期 / 续费日' }] }, due) +
      A.fieldHTML({ key: 'dueDay', label: '每月几号（提醒方式选「每月固定几号」时填）', type: 'number', hint: '1–28' }, editing ? b.dueDay : '') +
      A.fieldHTML({ key: 'remindDays', label: '提醒提前天数', type: 'number', hint: '留空则跟随设置页的全局天数' }, editing ? b.remindDays : '') +
      '</div></div>';

    html += '<div class="form-group"><div class="fg-head">' + A.esc(tpl.name) + ' · 项目资料<span class="arw">▾</span></div><div class="fg-body">' +
      (tpl.fields.length ? tpl.fields.map(function (fd) {
        return A.fieldHTML(Object.assign({}, fd, { key: 'c_' + fd.key }), custom[fd.key]);
      }).join('') : '<div class="small muted" style="padding:4px 0 8px">这个项目没有额外资料字段</div>') +
      '<div class="tiny muted" style="line-height:1.6;padding-top:6px">💡 到期日类型的字段（如网费到期、会员续费日、合同到期）会自动进入提醒中心。</div>' +
      '</div></div>';

    html += '<div class="form-foot"><button type="submit" class="btn block">' + (editing ? '保存修改' : '创建项目') + '</button></div>';
    html += '</form></div><div class="safe-bottom"></div>';
    return html;
  };
  A.actions['pick-bill-tpl'] = function (el) { A.go('#/billform/' + el.dataset.tpl); };
  A.onBillSubmit = function (form) {
    var d = A.formData(form);
    if (!String(d.name || '').trim()) { A.toast('请填写项目名称'); return; }
    var tpl = null;
    A.BILL_TEMPLATES.forEach(function (t) { if (t.id === form.dataset.tpl) tpl = t; });
    var custom = {};
    (tpl ? tpl.fields : []).forEach(function (fd) { custom[fd.key] = d['c_' + fd.key]; });
    var obj = {
      templateId: form.dataset.tpl, name: String(d.name).trim(),
      icon: tpl ? tpl.icon : '💰', amount: A.num(d.amount), cycle: d.cycle || 'monthly',
      due: d.due || 'cycle', dueDay: A.num(d.dueDay) || A.num(custom.dueDay) || '',
      remindDays: d.remindDays === '' ? null : A.num(d.remindDays),
      custom: custom
    };
    if (form.dataset.id) obj.id = form.dataset.id;
    var saved = A.saveBill(obj);
    A.toast(form.dataset.id ? '修改已保存' : '项目已创建');
    A.go('#/bill/' + saved.id, true);
  };
  A.actions['toggle-depreciation'] = function () {
    A.db.settings.depreciation = !A.db.settings.depreciation;
    A.save(); A.toast(A.db.settings.depreciation ? '已开启折旧参考' : '已关闭折旧参考'); A.render();
  };

})(window.App);
