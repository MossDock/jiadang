/* ===== 06 物品清单：列表 / 详情 / 表单 / 子记录 ===== */
(function (A) {
  'use strict';
  A.actions = A.actions || {};

  var BASE_KEYS = ['purchaseDate', 'price', 'qty', 'location', 'status', 'note'];

  /* ---------------- 物品列表 ---------------- */
  A.renderItems = function () {
    var ui = A.ui;
    var cats = A.db.categories;
    var html = A.pageHeader('物品', {
      back: false,
      right: '<button class="iconbtn primary" data-action="go" data-href="#/add" aria-label="添加物品">＋</button>'
    });

    html += '<div class="searchbar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>' +
      '<input id="item-search" type="search" placeholder="搜名称 / 备注 / 存放位置" value="' + A.esc(ui.itemsSearch || '') + '" data-action="item-search"></div>';

    html += '<div class="chips"><div class="chip' + (ui.itemsCat === 'all' ? ' on' : '') + '" data-action="item-cat" data-v="all">全部</div>' +
      cats.map(function (c) {
        return '<div class="chip' + (ui.itemsCat === c.id ? ' on' : '') + '" data-action="item-cat" data-v="' + c.id + '">' + c.icon + ' ' + A.esc(c.name) + '</div>';
      }).join('') + '</div>';

    html += '<div class="filterbar">' +
      fbtn('状态', ui.itemsStatus === 'all' ? '' : ui.itemsStatus, 'filter-status') +
      fbtn('位置', ui.itemsLocation === 'all' ? '' : ui.itemsLocation, 'filter-location') +
      fbtn('购买时间', periodLabel(ui.itemsBuyPeriod), 'filter-period') +
      fbtn('排序', sortLabel(ui.itemsSort), 'filter-sort') +
      '</div>';

    html += '<div id="item-list">' + A.itemsListHTML() + '</div>';
    html += '<div class="safe-bottom"></div>';
    return html;
  };
  function fbtn(name, val, act) {
    return '<button class="fbtn' + (val ? ' on' : '') + '" data-action="' + act + '">' + A.esc(name) + (val ? '：' + A.esc(val) : '') + ' ▾</button>';
  }
  function periodLabel(p) { return p === '30' ? '近30天' : p === '180' ? '近半年' : p === 'year' ? '今年' : ''; }
  function sortLabel(s) { return { created: '最近添加', purchase: '购买日期', price: '价格', name: '名称' }[s] || '最近添加'; }

  A.itemsListHTML = function () {
    var ui = A.ui, q = (ui.itemsSearch || '').trim().toLowerCase();
    var list = A.db.items.slice();

    list = list.filter(function (i) {
      if (ui.itemsCat !== 'all' && i.categoryId !== ui.itemsCat) return false;
      if (ui.itemsStatus !== 'all' && i.status !== ui.itemsStatus) return false;
      if (ui.itemsLocation !== 'all' && (i.location || '未填写位置') !== ui.itemsLocation) return false;
      if (ui.itemsBuyPeriod && ui.itemsBuyPeriod !== 'all') {
        var d = i.purchaseDate;
        if (!d) return false;
        var lim = ui.itemsBuyPeriod === '30' ? A.addDays(A.today(), -30)
          : ui.itemsBuyPeriod === '180' ? A.addDays(A.today(), -180)
            : A.today().slice(0, 4) + '-01-01';
        if (d < lim) return false;
      }
      if (q) {
        var hay = [i.name, i.note, i.location, i.f && i.f.note, i.f && i.f.brand, i.f && i.f.plate].join(' ').toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
    list.sort(function (x, y) {
      if (ui.itemsSort === 'purchase') return String(y.purchaseDate || '').localeCompare(String(x.purchaseDate || ''));
      if (ui.itemsSort === 'price') return A.itemValue(y) - A.itemValue(x);
      if (ui.itemsSort === 'name') return String(x.name).localeCompare(String(y.name), 'zh');
      return String(y.createdAt || '').localeCompare(String(x.createdAt || '')) || String(y.id).localeCompare(String(x.id));
    });

    var head = '<div class="row between" style="padding:0 16px 8px"><span class="small muted">共 ' + list.length + ' 件' +
      (ui.itemsCat !== 'all' ? ' · ' + A.esc(A.catName(ui.itemsCat)) : '') + '</span>' +
      '<span class="small muted">合计 ' + A.money0(list.reduce(function (s, i) { return s + A.itemValue(i); }, 0)) + '</span></div>';

    if (!list.length) {
      return head + '<div class="empty"><div class="e">📦</div><div class="t">这里还没有物品</div>' +
        '<div class="d">换个筛选条件，或点右下角 ＋ 添加第一件</div>' +
        '<button class="btn" data-action="go" data-href="#/add">添加物品</button></div>';
    }
    return head + '<div class="wrap">' + list.map(function (i) {
      /* v2：类别色收敛到 6 个低饱和大地色，统一线性图标，避免 emoji 字体差异 */
      var pal = ['#5B8C7B', '#C58A5C', '#7B87B0', '#B4706E', '#7E9E6A', '#9A86AE'];
      var ci = 0;
      (A.db.categories || []).some(function (c, n) { if (c.id === i.categoryId) { ci = n; return true; } return false; });
      var thumb = i.photos && i.photos.length
        ? '<img src="' + A.esc(i.photos[0]) + '" alt="">'
        : '<svg class="ic"><use href="#i-box"/></svg>';
      var stCls = i.status === '在用' ? 's1' : (i.status === '收纳闲置' ? 's2' : 's3');
      return '<div class="item-card" data-action="item-open" data-id="' + i.id + '">' +
        '<div class="item-thumb" style="background:' + pal[ci % 6] + ';color:#fff">' + thumb + '</div>' +
        '<div class="grow"><div class="row" style="gap:6px"><span class="nm">' + A.esc(i.name) + '</span><span class="status-pill ' + stCls + '">' + A.esc(i.status) + '</span></div>' +
        '<div class="meta">📍 ' + A.esc(i.location || '未填位置') + ' · ' + A.esc(A.catName(i.categoryId)) + (i.purchaseDate ? ' · ' + i.purchaseDate : '') + '</div></div>' +
        '<div class="pr">' + (i.price ? A.money0(i.price) : '—') + ((i.qty || 1) > 1 ? '<small> ×' + i.qty + '</small>' : '') + '</div></div>';
    }).join('') + '</div>';
  };
  A.refreshItemList = function () { var n = A.$('#item-list'); if (n) n.innerHTML = A.itemsListHTML(); };

  A.actions['item-search'] = A.debounce(function (el) {
    A.ui.itemsSearch = el.value; A.refreshItemList();
  }, 160);
  A.actions['item-cat'] = function (el) { A.ui.itemsCat = el.dataset.v; A.render(); };
  A.actions['filter-status'] = function () {
    var opts = [{ label: '全部状态', v: 'all' }].concat(A.STATUS.map(function (s) { return { label: s, v: s }; }));
    A.pickList('按状态筛选', opts.map(function (o) { return { label: o.label, checked: A.ui.itemsStatus === o.v, v: o.v }; }), function (it) {
      A.ui.itemsStatus = it.v; A.render();
    });
  };
  A.actions['filter-location'] = function () {
    var set = {}; A.db.items.forEach(function (i) { set[i.location || '未填写位置'] = 1; });
    var opts = [{ label: '全部位置', v: 'all' }].concat(Object.keys(set).sort().map(function (s) { return { label: s, v: s }; }));
    A.pickList('按存放位置筛选', opts.map(function (o) { return { label: o.label, checked: A.ui.itemsLocation === o.v, v: o.v }; }), function (it) {
      A.ui.itemsLocation = it.v; A.render();
    });
  };
  A.actions['filter-period'] = function () {
    var opts = [{ label: '全部时间', v: 'all' }, { label: '近 30 天', v: '30' }, { label: '近半年', v: '180' }, { label: '今年', v: 'year' }];
    A.pickList('按购买时间筛选', opts.map(function (o) { return { label: o.label, checked: A.ui.itemsBuyPeriod === o.v, v: o.v }; }), function (it) {
      A.ui.itemsBuyPeriod = it.v; A.render();
    });
  };
  A.actions['filter-sort'] = function () {
    var opts = [{ label: '最近添加', v: 'created' }, { label: '购买日期', v: 'purchase' }, { label: '价格从高到低', v: 'price' }, { label: '名称', v: 'name' }];
    A.pickList('排序方式', opts.map(function (o) { return { label: o.label, checked: A.ui.itemsSort === o.v, v: o.v }; }), function (it) {
      A.ui.itemsSort = it.v; A.render();
    });
  };
  A.actions['item-open'] = function (el) { A.go('#/item/' + el.dataset.id); };

  /* ---------------- 物品详情 ---------------- */
  A.renderItemDetail = function (id) {
    var it = A.getItem(id);
    if (!it) return A.pageHeader('物品不存在', { back: true }) + '<div class="empty"><div class="d">这件物品可能已被删除</div></div>';
    var cat = A.getCategory(it.categoryId), sub = A.getSubtype(cat, it.subtypeId);
    var html = A.pageHeader(it.name, {
      back: true,
      right: '<button class="iconbtn" data-action="item-edit" data-id="' + it.id + '" aria-label="编辑">✎</button>'
    });

    /* 照片轮播 */
    if (it.photos && it.photos.length) {
      html += '<div class="photo-strip">' + it.photos.map(function (p) {
        return '<img src="' + A.esc(p) + '" alt="照片" data-action="photo-view" data-src="' + A.esc(p) + '">';
      }).join('') + '</div>';
    } else {
      html += '<div class="photo-strip"><div class="photo-empty">' + A.catIcon(it.categoryId) + '<span>' + A.esc(A.catName(it.categoryId)) + '</span></div></div>';
    }

    html += '<div class="wrap">';

    /* 基础信息 */
    html += '<div class="card"><div class="group-title">基础信息</div><div class="group-body">' +
      kv('类别', (cat ? cat.icon + ' ' + cat.name : '—') + (sub ? ' · ' + sub.name : '')) +
      kv('状态', '<span class="pill ' + (it.status === '在用' ? 'green' : 'gray') + '">' + A.esc(it.status) + '</span>') +
      kv('购买日期', it.purchaseDate || '—') +
      kv('价格', it.price ? A.money(it.price) : '—') +
      kv('数量', it.qty || 1) +
      kv('存放位置', it.location || '—') +
      kv('备注', (it.f && it.f.note) || it.note || '—') +
      '</div></div>';

    /* 专属字段 */
    var fds = A.getFields(cat, sub).filter(function (f) { return BASE_KEYS.indexOf(f.key) < 0; });
    if (fds.length) {
      html += '<div class="card"><div class="group-title">' + A.esc(sub ? sub.name : '专属信息') + '</div><div class="group-body">' +
        fds.map(function (fd) { return kv(fd.label, displayVal(fd, it.f[fd.key])); }).join('') + '</div></div>';
    }

    /* 剩余保质期进度条 */
    var exp = A.getExpiry(it);
    if (exp) {
      var start = it.f.openDate || it.f.prodDate || it.purchaseDate || '';
      var total = start ? A.diffDays(start, exp) : 0;
      var left = A.daysLeft(exp);
      var ratio = total > 0 ? Math.max(0, Math.min(100, left / total * 100)) : (left > 0 ? 100 : 0);
      var cls = left < 0 ? 'danger' : (left <= (it.subtypeId === 'cosmetic' ? 14 : 7) ? 'warn' : '');
      html += '<div class="card"><div class="group-title">剩余' + (it.categoryId === 'docs' ? '有效期' : '保质期') + '</div>' +
        '<div class="row between"><span class="b ' + (left < 0 ? 'c-red' : (left <= 7 ? 'c-orange' : 'c-green')) + '" style="font-size:20px">' +
        (left < 0 ? '已过期 ' + (-left) + ' 天' : '还剩 ' + left + ' 天') + '</span>' +
        '<span class="small muted">到期 ' + exp + '</span></div>' +
        '<div class="progress-wrap"><div class="progress"><i class="' + cls + '" style="width:' + ratio + '%"></i></div>' +
        '<div class="row between tiny muted mt6"><span>' + (start || '起始日未填') + '</span><span>' + exp + '</span></div></div></div>';
    }

    /* 车类 / 其他子表 */
    var tables = A.getSubTables(sub);
    tables.forEach(function (t) {
      var recs = (it.records && it.records[t.key]) || [];
      html += '<div class="card"><div class="group-title">' + A.esc(t.label) + ' <span class="small muted" style="font-weight:400">(' + recs.length + ')</span></div>';
      if (!recs.length) html += '<div class="small muted" style="padding:8px 0">暂无记录</div>';
      else html += recs.map(function (r) {
        var lines = t.fields.filter(function (fd) { return r[fd.key] !== undefined && r[fd.key] !== '' && r[fd.key] !== null; })
          .map(function (fd) { return A.esc(fd.label) + '：' + A.esc(displayVal(fd, r[fd.key])); }).join('　');
        return '<div class="subcard"><div class="h"><span>' + A.esc(t.fields[0] && r[t.fields[0].key] ? r[t.fields[0].key] : '记录') + '</span>' +
          '<button class="tiny c-red" data-action="rec-del" data-item="' + it.id + '" data-table="' + t.key + '" data-rec="' + r.id + '">删除</button></div>' +
          '<div class="l">' + (lines || '—') + '</div></div>';
      }).join('');
      html += '<button class="rec-add" data-action="rec-add" data-item="' + it.id + '" data-table="' + t.key + '">＋ 添加一条' + A.esc(t.label) + '</button>';
      if (t.kind === 'fuel') html += fuelStatsHTML(recs);
      html += '</div>';
    });

    /* 快捷操作 */
    var qops = [];
    if (it.subtypeId === 'plant') {
      qops.push({ a: 'water-now', t: '💧 今天浇水了', id: it.id });
      if (A.num(it.f.fertilizeCycleDays) > 0) qops.push({ a: 'fertilize-now', t: '🌱 今天施肥了', id: it.id });
      var nw = it.f.lastWatered && A.num(it.f.waterCycleDays) > 0 ? A.addDays(it.f.lastWatered, A.num(it.f.waterCycleDays)) : '';
      qops.push({ a: 'noop', t: '下次浇水：' + (nw || '未设置'), id: it.id });
    }
    if (it.subtypeId === 'filter') {
      qops.push({ a: 'filter-replaced', t: '🔄 今天已更换滤芯', id: it.id });
      qops.push({ a: 'noop', t: '下次更换：' + (it.f.nextReplaceDate || '未设置'), id: it.id });
    }
    if (it.subtypeId === 'pan') qops.push({ a: 'noop', t: '建议更换：' + (it.f.suggestReplaceDate || '未设置'), id: it.id });
    if (qops.length) {
      html += '<div class="card"><div class="group-title">快捷操作</div><div class="quick-ops">' +
        qops.map(function (o) { return '<div class="qop" data-action="' + o.a + '" data-id="' + o.id + '">' + A.esc(o.t) + '</div>'; }).join('') +
        '</div><div class="tiny muted mt10">点一下会把日期更新为今天，下次提醒自动顺延</div></div>';
    }

    html += '</div>';

    /* 底部操作（由框架挂到固定底栏） */
    html += '<div class="actionbar" data-slot="actionbar">' +
      '<button class="btn ghost" data-action="item-edit" data-id="' + it.id + '">✎ 编辑</button>' +
      '<button class="btn soft" data-action="item-status" data-id="' + it.id + '">标记状态</button>' +
      '<button class="btn danger" data-action="item-delete" data-id="' + it.id + '">删除</button></div>';
    return html;
  };
  function kv(k, v) { return '<div class="kv"><span class="k">' + A.esc(k) + '</span><span class="v">' + (v || '—') + '</span></div>'; }
  function displayVal(fd, v) {
    if (v === undefined || v === null || v === '') return '—';
    if (Array.isArray(v)) return A.esc(v.join(' / '));
    if (fd.type === 'select' && fd.options) {
      var lab = v;
      fd.options.forEach(function (o) { if ((typeof o === 'object' ? o.v : o) === String(v)) lab = (typeof o === 'object' ? o.l : o); });
      return A.esc(lab) + (fd.key === 'paoMonths' ? ' 个月' : '');
    }
    if (fd.type === 'number' && String(v) !== '') return A.esc(v) + (fd.unit || '');
    return A.esc(v);
  }

  function fuelStatsHTML(recs) {
    var byMonth = {}, sum = 0;
    recs.forEach(function (r) {
      var amt = A.num(r.amount); sum += amt;
      var k = A.monthKey(r.date);
      if (k) byMonth[k] = (byMonth[k] || 0) + amt;
    });
    var thisMonth = byMonth[A.today().slice(0, 7)] || 0;
    var sorted = recs.filter(function (r) { return A.num(r.mileage) > 0 && A.num(r.unitPrice) > 0 && A.num(r.amount) > 0; })
      .slice().sort(function (a, b) { return A.num(a.mileage) - A.num(b.mileage); });
    var liters = 0, kms = 0;
    for (var i = 1; i < sorted.length; i++) {
      var d = A.num(sorted[i].mileage) - A.num(sorted[i - 1].mileage);
      var l = A.num(sorted[i].amount) / A.num(sorted[i].unitPrice);
      if (d > 0 && l > 0) { kms += d; liters += l; }
    }
    var fuel100 = kms > 0 ? (liters / kms * 100) : 0;
    var months = Object.keys(byMonth).sort().reverse().slice(0, 6);
    return '<div class="divider"></div><div class="group-title" style="margin-bottom:8px">⛽ 加油统计（自动）</div>' +
      '<div class="triple" style="box-shadow:none;background:var(--card-2);margin-bottom:8px">' +
      '<div><div class="n">' + A.money0(thisMonth) + '</div><div class="l">本月油费</div></div>' +
      '<div><div class="n">' + A.money0(sum) + '</div><div class="l">累计油费</div></div>' +
      '<div><div class="n">' + (fuel100 ? fuel100.toFixed(1) + 'L' : '—') + '</div><div class="l">百公里油耗</div></div></div>' +
      '<div class="tiny muted mb8">油耗按相邻两次加油的里程差与加油升数自动估算' + (kms > 0 ? '（已统计 ' + Math.round(kms) + ' km / ' + liters.toFixed(1) + ' L）' : '（需至少 2 条含里程与单价的记录）') + '</div>' +
      (months.length ? months.map(function (k) {
        return '<div class="row between small" style="padding:4px 0;border-bottom:1px solid var(--line-2)"><span class="muted">' + k + '</span><span class="b">' + A.money(byMonth[k]) + '</span></div>';
      }).join('') : '<div class="small muted">暂无加油记录</div>');
  }

  A.actions['photo-view'] = function (el) { A.viewImage(el.dataset.src); };
  A.actions['noop'] = function () { };
  A.actions['item-edit'] = function (el) { A.go('#/edit/' + el.dataset.id); };
  A.actions['item-delete'] = function (el) {
    var id = el.dataset.id, it = A.getItem(id);
    A.confirm('删除物品', '确定删除「' + (it ? it.name : '') + '」吗？删除后不可恢复（也可改为标记「已丢弃」保留历史）。', function () {
      A.deleteItem(id); A.toast('已删除'); A.go('#/items', true);
    }, '确认删除');
  };
  A.actions['item-status'] = function (el) {
    var id = el.dataset.id, it = A.getItem(id);
    if (!it) return;
    A.pickList('标记状态', A.STATUS.map(function (s) { return { label: s, checked: it.status === s, v: s }; }), function (o) {
      it.status = o.v; it.f.status = o.v; A.save(); A.toast('状态已更新为「' + o.v + '」'); A.render();
    });
  };
  A.actions['water-now'] = function (el) {
    var it = A.getItem(el.dataset.id); if (!it) return;
    it.f.lastWatered = A.today(); A.save();
    A.toast('已记录今天浇水，下次自动顺延'); A.render();
  };
  A.actions['fertilize-now'] = function (el) {
    var it = A.getItem(el.dataset.id); if (!it) return;
    it.f.lastFertilized = A.today(); A.save(); A.toast('已记录今天施肥'); A.render();
  };
  A.actions['filter-replaced'] = function (el) {
    var it = A.getItem(el.dataset.id); if (!it) return;
    it.f.installDate = A.today(); it.f.nextReplaceDate = A.addDays(A.today(), A.num(it.f.replaceCycleDays) || 180);
    A.save(); A.toast('已记录更换，下次日期自动顺延'); A.render();
  };

  /* ---------------- 子记录添加 / 删除 ---------------- */
  A.actions['rec-add'] = function (el) {
    var it = A.getItem(el.dataset.item), key = el.dataset.table;
    if (!it) return;
    var sub = A.getSubtype(A.getCategory(it.categoryId), it.subtypeId);
    var t = null;
    A.getSubTables(sub).forEach(function (x) { if (x.key === key) t = x; });
    if (!t) return;
    var body = '<form id="rec-form">' + t.fields.map(function (fd) { return A.fieldHTML(fd, fd.type === 'date' ? A.today() : ''); }).join('') + '</form>';
    A.openSheet({
      title: '添加' + t.label, body: body,
      foot: '<button class="btn ghost" data-sheet-close>取消</button><button class="btn" id="rec-save">保存</button>',
      onMount: function (root, close) {
        A.$('#rec-save', root).onclick = function () {
          var data = A.formData(A.$('#rec-form', root));
          if (!data.date && t.fields[0] && t.fields[0].type === 'date') data.date = A.today();
          var rec = Object.assign({ id: A.uid() }, data);
          it.records = it.records || {};
          it.records[key] = it.records[key] || [];
          it.records[key].unshift(rec);
          it.records[key].sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
          A.save(); close(); A.toast('记录已添加'); A.render();
        };
      }
    });
  };
  A.actions['rec-del'] = function (el) {
    var it = A.getItem(el.dataset.item), key = el.dataset.table, rid = el.dataset.rec;
    if (!it || !it.records || !it.records[key]) return;
    A.confirm('删除记录', '确定删除这条记录吗？', function () {
      it.records[key] = it.records[key].filter(function (r) { return r.id !== rid; });
      A.save(); A.toast('已删除'); A.render();
    }, '删除');
  };

  /* ---------------- 添加 / 编辑表单 ---------------- */
  A.renderItemForm = function (p) {
    var editing = !!p.id;
    var it = editing ? A.getItem(p.id) : null;
    if (editing && !it) return A.pageHeader('物品不存在', { back: true }) + '<div class="empty"><div class="d">可能已被删除</div></div>';

    /* 第一步：选类别（九宫格） */
    if (!editing && (!p.cat || p.step === 'cat')) {
      var html = A.pageHeader('选择类别', { back: true }) +
        '<div class="wrap"><div class="small muted" style="padding:4px 2px 12px">第一步 · 选一个大类，之后表单只需要填名称，其他都可以先跳过</div>' +
        '<div class="cat-grid">' + A.db.categories.map(function (c) {
          return '<div class="cat-tile" data-action="pick-cat" data-cat="' + c.id + '"><div class="e">' + c.icon + '</div><div class="n">' + A.esc(c.name) + '</div></div>';
        }).join('') + '</div>' +
        '<div class="hr-text">类别不够用？去设置里可以自己新增类别和字段</div></div>';
      return html;
    }

    var catId = p.cat || it.categoryId;
    var subId = p.sub || it.subtypeId;
    var cat = A.getCategory(catId);
    if (!cat) { A.toast('类别不存在'); return A.renderItemForm({ step: 'cat' }); }
    var sub = A.getSubtype(cat, subId);
    subId = sub.id;
    if (!A.ui.formPhotos || A.ui.formId !== (p.id || 'new-' + catId + '-' + subId)) {
      A.ui.formPhotos = editing ? A.clone(it.photos || []) : [];
      A.ui.formId = p.id || 'new-' + catId + '-' + subId;
    }

    var vals = editing ? Object.assign({}, it.f, {
      name: it.name, purchaseDate: it.purchaseDate, price: it.price, qty: it.qty,
      location: it.location, status: it.status, note: it.note || it.f.note
    }) : { name: '', status: '在用', qty: 1 };

    var html = A.pageHeader(editing ? '编辑物品' : '添加物品', { back: true });
    html += '<div class="wrap"><form id="item-form" data-cat="' + catId + '" data-sub="' + subId + '" data-id="' + (p.id || '') + '">';

    /* 基础信息分组（可折叠） */
    html += groupHead('基础信息', true);
    html += '<div class="fg-body">' +
      '<div class="field"><label>名称<span class="req">*</span></label><input type="text" name="name" value="' + A.esc(vals.name || '') + '" placeholder="给这件东西起个名字" required></div>' +
      '<div class="field"><label>类别 / 子类型</label><div class="row" style="gap:8px">' +
      '<div class="pill" style="flex:1;padding:9px 11px">' + cat.icon + ' ' + A.esc(cat.name) + ' · ' + A.esc(sub.name) + '</div>' +
      '<button type="button" class="btn sm soft" data-action="form-change-cat" data-id="' + (p.id || '') + '">更换</button></div></div>' +
      photoBoxHTML(A.ui.formPhotos) +
      A.BASE_FIELDS.map(function (fd) { return A.fieldHTML(fd, vals[fd.key]); }).join('') +
      '</div></div>';

    /* 专属字段分组 */
    var fds = A.getFields(cat, sub);
    html += groupHead(sub.name + ' · 专属信息', true);
    html += '<div class="fg-body">' +
      (fds.length ? fds.map(function (fd) { return A.fieldHTML(fd, vals[fd.key]); }).join('')
        : '<div class="small muted" style="padding:4px 0 8px">这一类没有额外字段，填基础信息就够了</div>') +
      '<div class="tiny muted" style="line-height:1.6;padding-top:4px">💡 生产日期 + 保质期、开封日期 + 开封后保质期、安装日期 + 更换周期等，系统会自动算出到期日并提醒。</div>' +
      '</div></div>';

    html += '<div class="form-foot"><button type="submit" class="btn block">' + (editing ? '保存修改' : '保存物品') + '</button>' +
      '<div class="tiny muted center mt10">只有名称必填，其他随时可以回来补</div></div>';
    html += '</form></div><div class="safe-bottom"></div>';
    return html;
  };
  function groupHead(title, open) {
    return '<div class="form-group"><div class="fg-head' + (open ? '' : ' closed') + '" data-action="fg-toggle">' + A.esc(title) + '<span class="arw">▾</span></div>';
  }
  function photoBoxHTML(photos) {
    return '<div class="field"><label>照片（最多 3 张）</label><div class="photo-picker" id="photo-box">' +
      photos.map(function (p, i) {
        return '<div class="ph"><img src="' + A.esc(p) + '" data-action="photo-view" data-src="' + A.esc(p) + '"><button type="button" class="del" data-action="photo-del" data-i="' + i + '">×</button></div>';
      }).join('') +
      (photos.length < 3 ? '<div class="addp" data-action="photo-add">＋</div>' : '') +
      '</div><input type="file" id="photo-file" accept="image/*" multiple style="display:none">' +
      '<div class="hint">照片只存本机，会自动压缩以节省空间</div></div>';
  }
  function refreshPhotoBox() { var n = A.$('#photo-box'); if (n) n.outerHTML = photoBoxHTML(A.ui.formPhotos); }

  A.actions['fg-toggle'] = function (el) {
    var head = el.classList.contains('fg-head') ? el : el.closest('.fg-head');
    var body = head.nextElementSibling;
    head.classList.toggle('closed'); body.classList.toggle('hide');
  };
  A.actions['pick-cat'] = function (el) {
    var cat = A.getCategory(el.dataset.cat);
    if (!cat) return;
    var subs = cat.subs || [];
    if (subs.length <= 1) { A.go('#/add/' + cat.id + '/' + (subs[0] ? subs[0].id : 'misc')); return; }
    A.pickList('选择「' + cat.name + '」下的类型', subs.map(function (s) { return { label: s.name, icon: cat.icon, v: s.id }; }), function (o) {
      A.go('#/add/' + cat.id + '/' + o.v);
    });
  };
  A.actions['form-change-cat'] = function (el) {
    if (!el.dataset.id) { A.go('#/add'); return; }
    var it = A.getItem(el.dataset.id);
    if (!it) return;
    A.confirm('更换类别', '更换类别后，当前表单里还没保存的填写会被重置，已保存的信息不会丢。', function () {
      A.pickList('选择新的大类', A.db.categories.map(function (c) { return { label: c.name, icon: c.icon, v: c.id }; }), function (c) {
        var cat = A.getCategory(c.v), subs = cat ? (cat.subs || []) : [];
        var apply = function (sid) {
          it.categoryId = c.v; it.subtypeId = sid; A.save();
          A.ui.formPhotos = []; A.ui.formId = null;
          A.toast('类别已更换，请补充专属信息'); A.render();
        };
        if (subs.length <= 1) apply(subs[0] ? subs[0].id : 'misc');
        else A.pickList('选择「' + cat.name + '」下的类型', subs.map(function (s) { return { label: s.name, v: s.id }; }), function (s) { apply(s.v); });
      });
    }, '继续');
  };
  A.actions['photo-add'] = function () { var f = A.$('#photo-file'); if (f) f.click(); };
  A.actions['photo-del'] = function (el) {
    A.ui.formPhotos.splice(+el.dataset.i, 1); refreshPhotoBox();
  };
  A.onPhotoChosen = function (input) {
    var files = Array.prototype.slice.call(input.files || []);
    if (!files.length) return;
    var room = 3 - A.ui.formPhotos.length;
    files.slice(0, Math.max(0, room)).forEach(function (file) {
      A.compressImage(file, 900).then(function (data) {
        if (A.ui.formPhotos.length < 3) { A.ui.formPhotos.push(data); refreshPhotoBox(); }
      }).catch(function () { A.toast('这张照片读取失败'); });
    });
    input.value = '';
  };
  A.onItemSubmit = function (form) {
    var data = A.formData(form);
    var name = String(data.name || '').trim();
    if (!name) { A.toast('请先填名称'); return; }
    var catId = form.dataset.cat, subId = form.dataset.sub, id = form.dataset.id;
    var cat = A.getCategory(catId), sub = A.getSubtype(cat, subId);
    var f = {};
    A.BASE_FIELDS.forEach(function (fd) { f[fd.key] = data[fd.key]; });
    A.getFields(cat, sub).forEach(function (fd) { f[fd.key] = data[fd.key]; });
    var old = id ? A.getItem(id) : null;
    var obj = {
      name: name, categoryId: catId, subtypeId: subId, f: f,
      photos: A.clone(A.ui.formPhotos || []),
      records: old ? old.records : {},
      createdAt: old ? old.createdAt : A.today()
    };
    if (id) obj.id = id;
    var saved = A.saveItem(obj);
    A.ui.formPhotos = []; A.ui.formId = null;
    A.toast(id ? '修改已保存' : '已保存，去详情页看看');
    A.go('#/item/' + saved.id, true);
  };

})(window.App);
