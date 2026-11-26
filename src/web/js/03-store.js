/* ===== 03 本地存储层：数据模型 / CRUD / 自动计算 / 示例数据 / 备份导出 ===== */
(function (A) {
  'use strict';

  A.DB_KEY = 'jiadang-db-v1';
  A.db = null;

  function defaults() {
    var adv = {};
    A.ADVANCE_DEFS.forEach(function (d) { adv[d.key] = d.def; });
    return {
      version: 1, isDemo: false, createdAt: A.today(),
      categories: A.clone(A.CATEGORIES),
      items: [], bills: [], dismissed: [],
      settings: { theme: 'teal', depreciation: false, reminderOn: true, advance: adv }
    };
  }

  A.load = function () {
    try {
      var raw = localStorage.getItem(A.DB_KEY);
      if (raw) {
        var d = JSON.parse(raw);
        if (d && d.items && d.bills) {
          A.db = d;
          A.db.categories = d.categories || A.clone(A.CATEGORIES);
          A.db.dismissed = d.dismissed || [];
          A.db.settings = Object.assign(defaults().settings, d.settings || {});
          var adv = {};
          A.ADVANCE_DEFS.forEach(function (x) { adv[x.key] = x.def; });
          A.db.settings.advance = Object.assign(adv, A.db.settings.advance || {});
          return A.db;
        }
      }
    } catch (e) { console.warn('读取本地数据失败', e); }
    A.db = demoDB();
    A.save();
    return A.db;
  };
  A.save = function () {
    try { localStorage.setItem(A.DB_KEY, JSON.stringify(A.db)); return true; }
    catch (e) { A.toast('本机存储空间不足，请到设置里导出备份后清理照片'); return false; }
  };
  A.resetDB = function (withDemo) {
    A.db = withDemo ? demoDB() : defaults();
    A.save();
  };

  /* ---------- 自动计算 ---------- */
  A.autoExpiry = function (it) {
    var f = it.f || {}, s = it.subtypeId;
    if (s === 'cosmetic') {
      if (f.openDate && A.num(f.paoMonths) > 0) return A.addMonths(f.openDate, A.num(f.paoMonths));
      if (f.prodDate && A.num(f.shelfLife) > 0) return A.addDays(f.prodDate, A.num(f.shelfLife));
    }
    if (s === 'seasoning') {
      if (f.openDate && A.num(f.paoDays) > 0) return A.addDays(f.openDate, A.num(f.paoDays));
      if (f.prodDate && A.num(f.shelfLife) > 0) return A.addDays(f.prodDate, A.num(f.shelfLife));
    }
    if (s === 'snack' || s === 'grain') {
      if (f.prodDate && A.num(f.shelfLife) > 0) return A.addDays(f.prodDate, A.num(f.shelfLife));
    }
    return '';
  };
  A.getExpiry = function (it) { return (it.f && it.f.expiryDate) || A.autoExpiry(it) || ''; };

  A.applyAutoFields = function (it) {
    var f = it.f = it.f || {};
    var auto = A.autoExpiry(it);
    if (auto) {
      if (f.expiryDate && f.expiryDate === auto) f.expiryDate = '';
      f.expiryDate = f.expiryDate || auto;
    }
    if (it.subtypeId === 'pan' && !f.suggestReplaceDate && it.purchaseDate) {
      f.suggestReplaceDate = A.addDays(it.purchaseDate, 730);
    }
    if (it.subtypeId === 'filter') {
      var autoR = (f.installDate && A.num(f.replaceCycleDays) > 0) ? A.addDays(f.installDate, A.num(f.replaceCycleDays)) : '';
      if (autoR) {
        if (f.nextReplaceDate && f.nextReplaceDate === autoR) f.nextReplaceDate = '';
        f.nextReplaceDate = f.nextReplaceDate || autoR;
      }
    }
    if (it.subtypeId === 'plant' && !f.lastWatered) f.lastWatered = it.purchaseDate || A.today();
    if (it.subtypeId === 'plant' && !f.lastFertilized && A.num(f.fertilizeCycleDays) > 0) {
      f.lastFertilized = it.purchaseDate || A.today();
    }
    return it;
  };
  A.normalizeItem = function (it) {
    it.f = it.f || {};
    ['purchaseDate', 'price', 'qty', 'location', 'status', 'note'].forEach(function (k) {
      if (it.f[k] !== undefined) it[k] = it.f[k];
    });
    it.status = it.status || '在用';
    it.qty = A.num(it.qty) || 1;
    it.price = A.num(it.price);
    it.photos = it.photos || [];
    it.records = it.records || {};
    it.createdAt = it.createdAt || A.today();
    return it;
  };

  /* ---------- 物品 CRUD ---------- */
  A.getItems = function () { return A.db.items; };
  A.getItem = function (id) { for (var i = 0; i < A.db.items.length; i++) if (A.db.items[i].id === id) return A.db.items[i]; return null; };
  A.saveItem = function (data) {
    var it;
    if (data.id && A.getItem(data.id)) {
      it = A.getItem(data.id);
      Object.assign(it, data);
    } else {
      it = Object.assign({ id: A.uid() }, data);
      A.db.items.unshift(it);
    }
    A.applyAutoFields(it);
    A.normalizeItem(it);
    A.save();
    return it;
  };
  A.deleteItem = function (id) {
    A.db.items = A.db.items.filter(function (x) { return x.id !== id; });
    A.save();
  };

  /* ---------- 账目 CRUD ---------- */
  A.CYCLE_DAYS = { monthly: 30, bimonthly: 60, quarterly: 90, halfyear: 182, yearly: 365, custom: 30 };
  A.CYCLE_MONTHS = { monthly: 1, bimonthly: 2, quarterly: 3, halfyear: 6, yearly: 12, custom: 1 };
  A.cycleLabel = function (c) {
    var m = { monthly: '每月', bimonthly: '每两月', quarterly: '每季度', halfyear: '每半年', yearly: '每年', custom: '自定义' };
    return m[c] || '每月';
  };
  A.getBill = function (id) { for (var i = 0; i < A.db.bills.length; i++) if (A.db.bills[i].id === id) return A.db.bills[i]; return null; };
  A.saveBill = function (data) {
    var b;
    if (data.id && A.getBill(data.id)) { b = A.getBill(data.id); Object.assign(b, data); }
    else { b = Object.assign({ id: A.uid(), records: [], createdAt: A.today() }, data); A.db.bills.push(b); }
    b.records = b.records || [];
    b.custom = b.custom || {};
    A.save();
    return b;
  };
  A.deleteBill = function (id) { A.db.bills = A.db.bills.filter(function (x) { return x.id !== id; }); A.save(); };
  A.addRecord = function (billId, rec) {
    var b = A.getBill(billId); if (!b) return null;
    b.records = b.records || [];
    b.records.unshift(Object.assign({ id: A.uid() }, rec));
    b.records.sort(function (x, y) { return String(y.date).localeCompare(String(x.date)); });
    A.save();
    return b;
  };
  A.deleteRecord = function (billId, recId) {
    var b = A.getBill(billId); if (!b) return;
    b.records = (b.records || []).filter(function (r) { return r.id !== recId; });
    A.save();
  };

  /* 下次缴费日 */
  A.nextDueDate = function (b) {
    var t = A.today(), custom = b.custom || {};
    if (b.due === 'dayOfMonth') {
      var day = Math.min(28, Math.max(1, A.num(b.dueDay) || 1));
      var p = t.split('-'), y = +p[0], m = +p[1], d = +p[2];
      var candidate = A.fmtD(new Date(y, m - 1, Math.min(day, A.daysInMonth(y, m))));
      if (A.diffDays(t, candidate) < 0) candidate = A.fmtD(new Date(y, m, Math.min(day, A.daysInMonth(y, m + 1))));
      return candidate;
    }
    if (b.due === 'fixedDate') {
      var fd = custom.expiryDate || '';
      if (!fd) return '';
      if (A.diffDays(t, fd) < -60) {
        var step = A.CYCLE_MONTHS[b.cycle] || 12, x = fd, n = 0;
        while (A.diffDays(t, x) < 0 && n++ < 30) x = A.addMonths(x, step);
        return x;
      }
      return fd;
    }
    /* cycle：按最后一次缴费日期推算 */
    var recs = (b.records || []).slice().sort(function (x, y) { return String(y.date).localeCompare(String(x.date)); });
    var base = recs.length ? recs[0].date : (b.createdAt || t);
    var next = A.addMonths(base, A.CYCLE_MONTHS[b.cycle] || 1);
    return next;
  };

  /* 账目统计 */
  A.allRecords = function () {
    var out = [];
    A.db.bills.forEach(function (b) {
      (b.records || []).forEach(function (r) { out.push(Object.assign({ billId: b.id, billName: b.name, billIcon: b.icon }, r)); });
    });
    return out;
  };
  A.billMonthTotal = function (key) {
    return A.allRecords().reduce(function (s, r) { return s + (A.monthKey(r.date) === key ? A.num(r.amount) : 0); }, 0);
  };
  A.billMonthSeries = function (n) {
    return A.lastMonths(n || 12).map(function (k) { return { key: k, label: A.monthLabel(k), value: A.billMonthTotal(k) }; });
  };
  A.billCategoryData = function (key) {
    var map = {};
    A.allRecords().forEach(function (r) {
      if (key && A.monthKey(r.date) !== key) return;
      map[r.billName] = (map[r.billName] || 0) + A.num(r.amount);
    });
    return Object.keys(map).map(function (k) { return { label: k, value: map[k] }; }).sort(function (a, b) { return b.value - a.value; });
  };

  /* 资产统计 */
  A.activeItems = function () { return A.db.items.filter(function (i) { return i.status === '在用'; }); };
  A.itemValue = function (it) { return A.num(it.price) * A.num(it.qty || 1); };
  A.depreciatedValue = function (it) {
    if (!A.db.settings.depreciation) return A.itemValue(it);
    var rate = (it.categoryId === 'digital') ? 0.10 : (it.categoryId === 'furniture' ? 0.05 : 0);
    if (!rate || !it.purchaseDate) return A.itemValue(it);
    var years = Math.max(0, A.diffDays(it.purchaseDate, A.today()) / 365);
    return A.itemValue(it) * Math.max(0.3, 1 - rate * years);
  };
  A.totalAssets = function () { return A.activeItems().reduce(function (s, i) { return s + A.depreciatedValue(i); }, 0); };
  A.historyValue = function () {
    return A.db.items.filter(function (i) { return i.status === '已丢弃' || i.status === '已送人'; })
      .reduce(function (s, i) { return s + A.itemValue(i); }, 0);
  };
  A.assetByCategory = function () {
    var map = {};
    A.activeItems().forEach(function (i) { var k = A.catName(i.categoryId); map[k] = (map[k] || 0) + A.depreciatedValue(i); });
    return Object.keys(map).map(function (k) { return { label: k, value: map[k] }; }).sort(function (a, b) { return b.value - a.value; });
  };
  A.assetByLocation = function () {
    var map = {};
    A.activeItems().forEach(function (i) { var k = i.location || '未填写位置'; map[k] = (map[k] || 0) + A.depreciatedValue(i); });
    return Object.keys(map).map(function (k) { return { label: k, value: map[k] }; }).sort(function (a, b) { return b.value - a.value; });
  };

  /* 时间段购买统计 */
  A.purchaseStats = function (from, to) {
    var list = A.db.items.filter(function (i) {
      var d = i.purchaseDate;
      return d && (!from || d >= from) && (!to || d <= to);
    });
    var count = 0, amount = 0, byCat = {}, top = [];
    list.forEach(function (i) {
      var v = A.itemValue(i);
      count += A.num(i.qty || 1); amount += v;
      var k = A.catName(i.categoryId);
      if (!byCat[k]) byCat[k] = { label: k, value: 0, count: 0 };
      byCat[k].value += v; byCat[k].count += A.num(i.qty || 1);
      top.push({ label: i.name, value: v });
    });
    top.sort(function (a, b) { return b.value - a.value; });
    var monthly = A.lastMonths(12).map(function (k) {
      return { key: k, label: A.monthLabel(k), value: list.reduce(function (s, i) { return s + (A.monthKey(i.purchaseDate) === k ? A.itemValue(i) : 0); }, 0) };
    });
    return {
      list: list, count: count, amount: amount,
      byCat: Object.keys(byCat).map(function (k) { return byCat[k]; }).sort(function (a, b) { return b.value - a.value; }),
      top: top.slice(0, 5), monthly: monthly
    };
  };

  /* ---------- 备份 / 导出 ---------- */
  A.exportBackup = function () {
    var name = '家当备份_' + A.today() + '.json';
    A.downloadText(name, JSON.stringify(A.db, null, 2), 'application/json;charset=utf-8', false);
    A.toast('备份文件已导出');
  };
  A.importBackup = function (text) {
    var d;
    try { d = JSON.parse(text); } catch (e) { A.toast('文件格式不正确，无法解析'); return false; }
    if (!d || !Array.isArray(d.items) || !Array.isArray(d.bills)) { A.toast('不是有效的家当备份文件'); return false; }
    A.db = d;
    A.db.categories = d.categories || A.clone(A.CATEGORIES);
    A.db.dismissed = d.dismissed || [];
    A.db.settings = Object.assign(defaults().settings, d.settings || {});
    A.save();
    A.toast('数据已恢复');
    return true;
  };
  A.buildExportSheets = function () {
    var items = [['名称', '大类', '子类型', '状态', '购买日期', '单价(元)', '数量', '存放位置', '到期日', '备注']];
    A.db.items.forEach(function (i) {
      var sub = A.getSubtype(A.getCategory(i.categoryId), i.subtypeId);
      items.push([i.name, A.catName(i.categoryId), sub ? sub.name : '', i.status, i.purchaseDate || '',
        A.num(i.price), A.num(i.qty || 1), i.location || '', A.getExpiry(i) || '', (i.f && i.f.note) || i.note || '']);
    });
    var recs = [['项目', '缴费日期', '金额(元)', '覆盖时段', '备注']];
    A.allRecords().forEach(function (r) { recs.push([r.billName, r.date, A.num(r.amount), r.period || '', r.note || '']); });
    var bills = [['项目', '周期金额(元)', '缴费周期', '下次缴费日', '累计缴费(元)', '缴费笔数']];
    A.db.bills.forEach(function (b) {
      bills.push([b.name, A.num(b.amount), A.cycleLabel(b.cycle), A.nextDueDate(b) || '',
        (b.records || []).reduce(function (s, r) { return s + A.num(r.amount); }, 0), (b.records || []).length]);
    });
    var cats = [['大类', '子类型', '字段名', '字段类型']];
    A.db.categories.forEach(function (c) {
      (c.subs || []).forEach(function (s) {
        (s.fields || []).forEach(function (f) { cats.push([c.name, s.name, f.label, f.type]); });
      });
      (c.fields || []).forEach(function (f) { cats.push([c.name, '通用', f.label, f.type]); });
    });
    var rems = [['事项', '关联对象', '到期日', '剩余天数', '紧急程度']];
    A.buildReminders().forEach(function (r) {
      rems.push([r.title, r.target, r.due, r.daysLeft, r.level === 'red' ? '已过期' : (r.level === 'orange' ? '3天内' : '临期')]);
    });
    return [
      { name: '物品清单', rows: items }, { name: '缴费记录', rows: recs },
      { name: '周期支出项目', rows: bills }, { name: '临期提醒', rows: rems },
      { name: '类别与字段', rows: cats }
    ];
  };
  A.exportAllExcel = function () { A.exportExcel('家当_全量数据_' + A.today() + '.xls', A.buildExportSheets()); };

  /* ---------- 示例数据（按当前日期动态生成，打开即有内容可验证） ---------- */
  function demoDB() {
    var d = defaults();
    d.isDemo = true;
    var T = A.today, AD = A.addDays, AM = A.addMonths;
    var no = 0;
    function item(name, cat, sub, fields, extra) {
      no++;
      var base = {
        id: 'demo-' + no, name: name, categoryId: cat, subtypeId: sub,
        f: Object.assign({ status: '在用', qty: 1 }, fields || {}),
        photos: [], records: {}, createdAt: AD(T(), -no)
      };
      Object.assign(base, extra || {});
      A.applyAutoFields(base); A.normalizeItem(base);
      d.items.push(base);
      return base;
    }
    function moneyHist(bill, base, months, jitter) {
      var j = A.num(jitter);
      bill.records = [];
      for (var i = months - 1; i >= 0; i--) {
        var dt = AM(T(), -i);
        var delta = j > 0 ? ((i * 37) % j) - ((i * 13) % Math.min(9, j)) : 0;
        bill.records.push({
          id: A.uid(), date: dt,
          amount: Math.round((base + delta) * 100) / 100,
          period: dt.slice(0, 4) + '年' + (+dt.slice(5, 7)) + '月', note: ''
        });
      }
      bill.records.sort(function (x, y) { return String(y.date).localeCompare(String(x.date)); });
    }
    function bill(tpl, name, amount, cycle, due, custom, months, jitter) {
      var t = null;
      A.BILL_TEMPLATES.forEach(function (x) { if (x.id === tpl) t = x; });
      var b = {
        id: 'demob-' + A.uid(), templateId: tpl, name: name, icon: t ? t.icon : '💰',
        amount: amount, cycle: cycle, due: due, dueDay: custom.dueDay || '',
        remindDays: null, custom: custom || {}, records: [], createdAt: AM(T(), -12)
      };
      moneyHist(b, amount, months || 8, jitter);
      d.bills.push(b);
      return b;
    }

    /* ① 出行工具：汽车 + 完整子记录（验收 1） */
    var car = item('家用轿车 · 示例车', 'travel', 'car', {
      purchaseDate: AD(T(), -900), price: 128000, qty: 1, location: '地下车库 B12',
      plate: '示例车牌', brand: '示例品牌 家用轿车', fuelType: '汽油',
      inspectionDate: AD(T(), 40), insuranceEnd: AD(T(), 120), nextMaintenance: AD(T(), 25),
      note: '家庭唯一用车，保养手册在手套箱'
    });
    car.records = {
      fuel: [
        { id: A.uid(), date: AD(T(), -42), oilNo: '92#', unitPrice: 7.52, amount: 300, mileage: 32800 },
        { id: A.uid(), date: AD(T(), -24), oilNo: '92#', unitPrice: 7.68, amount: 320, mileage: 33260 },
        { id: A.uid(), date: AD(T(), -6), oilNo: '92#', unitPrice: 7.45, amount: 310, mileage: 33710 }
      ],
      maintenance: [{ id: A.uid(), date: AD(T(), -120), mileage: 31000, project: '更换机油机滤 + 空滤', cost: 680, shop: '示例维修店' }],
      insurance: [{ id: A.uid(), company: '示例保险公司', type: '交强险+车损险+三者险', startDate: AD(T(), -245), endDate: AD(T(), 120), premium: 3850 }]
    };
    item('折叠自行车', 'travel', 'bike', { purchaseDate: AD(T(), -400), price: 1180, location: '阳台', brand: '示例品牌 折叠车' });

    /* ② 食品饮品（验收 2） */
    item('每日坚果 30 包', 'food', 'snack', {
      purchaseDate: AD(T(), -25), price: 39.9, qty: 1, location: '零食箱',
      prodDate: AD(T(), -25), shelfLife: 30, storage: '零食箱', note: '生产日期+30 天自动算出到期日'
    });
    item('东北大米 5kg', 'food', 'grain', { purchaseDate: AD(T(), -60), price: 68, qty: 2, location: '厨房吊柜', prodDate: AD(T(), -60), shelfLife: 365 });
    item('生抽酱油', 'food', 'seasoning', { purchaseDate: AD(T(), -100), price: 16.8, location: '灶台下', prodDate: AD(T(), -110), shelfLife: 720, openDate: AD(T(), -100), paoDays: 180 });
    item('复合维生素', 'food', 'supplement', { purchaseDate: AD(T(), -80), price: 158, location: '卧室柜子', expiryDate: AD(T(), 120), dailyDose: '每日 1 粒', remainQty: '约 40 粒' });

    /* ③ 衣物鞋帽 */
    item('轻薄羽绒服', 'clothing', 'apparel', { purchaseDate: AD(T(), -220), price: 899, location: '主卧衣柜', brand: '示例品牌', size: 'L', color: '藏青', seasons: ['秋', '冬'] });
    item('通勤双肩包', 'clothing', 'bag', { purchaseDate: AD(T(), -330), price: 329, location: '玄关', purpose: '通勤' });

    /* ④ 家电数码 */
    item('十字对开门冰箱', 'digital', 'bigAppliance', { purchaseDate: AD(T(), -620), price: 4299, location: '厨房', brand: '示例品牌 十字对开门', warrantyExpiry: AD(T(), 200), cleanCycleDays: 90, lastClean: AD(T(), -88) });
    item('笔记本电脑', 'digital', 'device', { purchaseDate: AD(T(), -500), price: 6999, location: '书房', brand: '示例品牌 笔记本', serial: '示例序列号', warrantyExpiry: AD(T(), 150), accessories: '65W 充电器、扩展坞、鼠标' });
    item('吹风机', 'digital', 'smallAppliance', { purchaseDate: AD(T(), -180), price: 299, location: '卫生间', brand: '示例品牌 吹风机', warrantyExpiry: AD(T(), 545) });

    /* ⑤ 家具家居 */
    item('实木书桌', 'furniture', 'furniture', { purchaseDate: AD(T(), -700), price: 1680, location: '书房', material: '白橡木', room: '书房', warrantyExpiry: AD(T(), 365) });
    item('纯棉四件套', 'furniture', 'bedding', { purchaseDate: AD(T(), -160), price: 399, location: '主卧', material: '全棉', washCycleDays: 14, lastWash: AD(T(), -13) });

    /* ⑥ 厨房用品（不粘锅建议更换） */
    item('不粘炒锅', 'kitchen', 'pan', { purchaseDate: AD(T(), -725), price: 259, location: '灶台下', material: '麦饭石涂层', coated: '是' });
    item('保温杯', 'kitchen', 'tableware', { purchaseDate: AD(T(), -90), price: 129, qty: 2, location: '餐边柜' });

    /* ⑦ 清洁洗护美妆（验收 3） */
    item('修护精华液 30ml', 'cleaning', 'cosmetic', {
      purchaseDate: AD(T(), -200), price: 480, location: '梳妆台',
      prodDate: AD(T(), -200), shelfLife: 1095, paoMonths: '6', openDate: AD(T(), -173),
      note: '开封后 6 个月到期，提前 14 天提醒'
    });
    item('洗发水 500ml', 'cleaning', 'personal', { purchaseDate: AD(T(), -40), price: 69, location: '浴室', openDate: AD(T(), -30), remain: '半' });
    item('84 消毒液', 'cleaning', 'cleaner', { purchaseDate: AD(T(), -70), price: 12.9, location: '阳台储物柜', remain: '满', dangerNote: '切勿与洁厕灵、酸性清洁剂混用' });

    /* ⑧ 药品健康 */
    item('布洛芬缓释胶囊', 'health', 'medicine', { purchaseDate: AD(T(), -400), price: 28, location: '药箱', prodDate: AD(T(), -420), expiryDate: AD(T(), -2), usage: '退热 / 止痛' });
    item('电子血压计', 'health', 'medicalDevice', { purchaseDate: AD(T(), -300), price: 259, location: '药箱', brand: '示例品牌', calibrationCycleDays: 365, lastCalibration: AD(T(), -300) });

    /* ⑨ 日用消耗品（验收 7） */
    item('净水器 RO 滤芯', 'daily', 'filter', { purchaseDate: AD(T(), -175), price: 199, location: '厨房水槽下', filterModel: 'PP+RO 复合滤芯', installDate: AD(T(), -175), replaceCycleDays: 180 });
    item('抽纸整箱', 'daily', 'consumable', { purchaseDate: AD(T(), -20), price: 59, qty: 1, location: '储物间', remain: '半' });

    /* ⑩ 证件文件（提前 30 天） */
    item('机动车驾驶证', 'docs', 'cert', { purchaseDate: AD(T(), -1800), price: 0, location: '证件抽屉', certType: '驾驶证', expiryDate: AD(T(), 20) });
    item('房屋租赁合同', 'docs', 'contract', { purchaseDate: AD(T(), -200), price: 0, location: '文件盒', signDate: AD(T(), -200), expiryDate: AD(T(), 165) });

    /* ⑪ 图书文娱 */
    item('《示例读物》', 'books', 'book', { purchaseDate: AD(T(), -150), price: 68, location: '书房书架', author: '示例作者', readStatus: '已读' });
    item('民谣吉他', 'books', 'collectible', { purchaseDate: AD(T(), -600), price: 1280, location: '客厅角落', kind: '乐器' });

    /* ⑫ 运动户外 */
    item('24 寸行李箱', 'sports', 'luggage', { purchaseDate: AD(T(), -450), price: 499, location: '床下', size: '24 寸', rodNote: '拉杆正常，轮子轻微磨损' });
    item('瑜伽垫', 'sports', 'fitness', { purchaseDate: AD(T(), -120), price: 119, location: '阳台' });

    /* ⑬ 宠物用品 */
    item('猫粮 2kg', 'pet', 'petfood', { purchaseDate: AD(T(), -15), price: 289, location: '阳台储物柜', expiryDate: AD(T(), 45), remain: '充足' });

    /* ⑭ 绿植（验收 4） */
    item('龟背竹', 'plant', 'plant', {
      purchaseDate: AD(T(), -120), price: 89, location: '客厅窗边', variety: '龟背竹',
      waterCycleDays: 3, lastWatered: AD(T(), -2), fertilizeCycleDays: 30, lastFertilized: AD(T(), -20)
    });

    /* ⑮ 工具五金 */
    item('充电电钻', 'tools', 'tool', { purchaseDate: AD(T(), -350), price: 329, location: '工具箱' });

    /* ⑯ 其他杂物 */
    item('塑料收纳箱', 'other', 'misc', { purchaseDate: AD(T(), -60), price: 45, qty: 3, location: '储物间', note: '换季衣物收纳用' });

    /* 一条历史记录，用于「历史价值」 */
    item('旧微波炉', 'digital', 'smallAppliance', { purchaseDate: AD(T(), -1500), price: 599, location: '已处理', status: '已送人' });

    /* 账目项目（验收 5、6） */
    var day = +T().slice(8, 10);
    bill('rent', '房租', 4200, 'monthly', 'dayOfMonth', { dueDay: day + 3 > 28 ? 3 : day + 3, contractStart: AD(T(), -200), contractEnd: AD(T(), 165), deposit: 4200, contact: '示例联系人' }, 12, 0);
    bill('water', '水费', 86, 'monthly', 'cycle', { accountNo: 'W-002188', lastReading: '1286' }, 12, 18);
    bill('electric', '电费', 226, 'monthly', 'cycle', { accountNo: 'E-881203', lastReading: '5621' }, 12, 65);
    bill('gas', '燃气费', 128, 'bimonthly', 'cycle', { accountNo: 'G-30291' }, 6, 24);
    bill('property', '物业费', 1800, 'yearly', 'cycle', { payMonths: '每年 1 月' }, 2, 0);
    bill('internet', '宽带年费', 960, 'yearly', 'fixedDate', { expiryDate: AD(T(), 6) }, 2, 0);
    bill('phone', '手机话费', 59, 'monthly', 'dayOfMonth', { dueDay: 8 }, 12, 0);
    bill('subscription', '视频会员', 25, 'monthly', 'fixedDate', { expiryDate: AD(T(), 2), plan: '年度连续包月' }, 12, 0);
    bill('insurance', '家财险', 380, 'yearly', 'fixedDate', { company: '示例保险公司', expiryDate: AD(T(), 120) }, 2, 0);

    return d;
  }
  A.demoDB = demoDB;

})(window.App);
