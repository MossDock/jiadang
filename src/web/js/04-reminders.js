/* ===== 04 提醒引擎：汇总所有临期 / 到期 / 待缴费 / 待更换事项 ===== */
(function (A) {
  'use strict';

  A.daysText = function (left) {
    if (left < 0) return '逾期 ' + (-left) + ' 天';
    if (left === 0) return '就是今天';
    return '还剩 ' + left + ' 天';
  };

  A.buildReminders = function () {
    if (!A.db || !A.db.settings.reminderOn) return [];
    var adv = A.db.settings.advance || {};
    var dismissed = A.db.dismissed || [];
    var out = [];

    function push(o) {
      if (!o.due) return;
      var left = A.daysLeft(o.due);
      var a = A.num(o.advance);
      if (a < 1) a = 1;
      if (left > a) return;
      var level = left < 0 ? 'red' : (left <= 3 ? 'orange' : 'yellow');
      var id = o.key + '|' + o.due;
      if (dismissed.indexOf(id) >= 0) return;
      out.push({
        id: id, key: o.key, level: level, title: o.title, target: o.target,
        due: o.due, daysLeft: left, icon: o.icon || '🔔',
        refType: o.refType, refId: o.refId, source: o.source || '',
        advance: a
      });
    }

    /* ---- 物品类提醒 ---- */
    A.db.items.forEach(function (it) {
      if (it.status === '已丢弃' || it.status === '已送人') return;
      var f = it.f || {}, s = it.subtypeId, cat = it.categoryId;
      var icon = A.catIcon(cat);
      var base = { refType: 'item', refId: it.id, target: it.name };

      /* 1. 到期日：食品 / 药品 / 化妆品 / 宠物粮食 / 证件 / 合同 */
      var expKind = '', expKey = 'food';
      if (['snack', 'grain', 'seasoning', 'supplement'].indexOf(s) >= 0) { expKind = '食品保质期'; expKey = 'food'; }
      else if (s === 'fresh') { expKind = '生鲜建议食用期限'; expKey = 'food'; }
      else if (s === 'medicine') { expKind = '药品有效期'; expKey = 'food'; }
      else if (s === 'petfood') { expKind = '宠物粮食到期'; expKey = 'food'; }
      else if (s === 'cosmetic') { expKind = '化妆品开封到期'; expKey = 'cosmetic'; }
      else if (s === 'cert') { expKind = '证件到期'; expKey = 'cert'; }
      else if (s === 'contract') { expKind = '合同/票据到期'; expKey = 'cert'; }
      if (expKind) {
        var due = (s === 'fresh') ? f.suggestUseBy : A.getExpiry(it);
        push(Object.assign({}, base, {
          key: 'exp-' + it.id, title: expKind, due: due,
          advance: adv[expKey], icon: icon, source: '保质期'
        }));
      }

      /* 2. 车辆：年检 / 保险 / 保养 */
      if (cat === 'travel' && (s === 'car' || s === 'ebike')) {
        push(Object.assign({}, base, { key: 'insp-' + it.id, title: '车辆年检', due: f.inspectionDate, advance: adv.car, icon: '🚗', source: '车辆' }));
        push(Object.assign({}, base, { key: 'insend-' + it.id, title: '车险到期', due: f.insuranceEnd, advance: adv.car, icon: '🛡️', source: '车辆' }));
        push(Object.assign({}, base, { key: 'maint-' + it.id, title: '车辆保养', due: f.nextMaintenance, advance: adv.car, icon: '🔧', source: '车辆' }));
        var ins = (it.records && it.records.insurance) || [];
        ins.forEach(function (r, i) {
          push(Object.assign({}, base, { key: 'insrec-' + it.id + '-' + i, title: '车险到期 · ' + (r.type || r.company || '保单'), due: r.endDate, advance: adv.car, icon: '🛡️', source: '车辆' }));
        });
      }

      /* 3. 不粘锅建议更换 */
      if (s === 'pan') {
        push(Object.assign({}, base, { key: 'pan-' + it.id, title: '不粘锅建议更换', due: f.suggestReplaceDate, advance: adv.other, icon: '🍳', source: '更换' }));
      }

      /* 4. 滤芯更换 */
      if (s === 'filter') {
        var nr = f.nextReplaceDate || (f.installDate && A.num(f.replaceCycleDays) > 0 ? A.addDays(f.installDate, A.num(f.replaceCycleDays)) : '');
        push(Object.assign({}, base, { key: 'filter-' + it.id, title: '滤芯该更换了', due: nr, advance: adv.other, icon: '💧', source: '更换' }));
      }

      /* 5. 绿植浇水 / 施肥 */
      if (s === 'plant') {
        if (f.lastWatered && A.num(f.waterCycleDays) > 0) {
          push(Object.assign({}, base, { key: 'water-' + it.id, title: '绿植该浇水了', due: A.addDays(f.lastWatered, A.num(f.waterCycleDays)), advance: adv.other, icon: '🌿', source: '浇水' }));
        }
        if (A.num(f.fertilizeCycleDays) > 0 && f.lastFertilized) {
          push(Object.assign({}, base, { key: 'fert-' + it.id, title: '绿植该施肥了', due: A.addDays(f.lastFertilized, A.num(f.fertilizeCycleDays)), advance: adv.other, icon: '🌱', source: '施肥' }));
        }
      }

      /* 6. 宠物疫苗 / 驱虫（取最近一条记录的下次时间） */
      if (s === 'vaccine') {
        var vr = (it.records && it.records.vaccineRecords) || [];
        var latest = null;
        vr.forEach(function (r) { if (r.nextDate && (!latest || r.nextDate > latest.nextDate)) latest = r; });
        if (latest) push(Object.assign({}, base, { key: 'vac-' + it.id, title: '宠物' + (latest.type || '疫苗/驱虫'), due: latest.nextDate, advance: adv.other, icon: '🐾', source: '宠物' }));
      }

      /* 7. 周期养护：家电清洗 / 床品换洗 / 器械校准 */
      if (f.cleanCycleDays && A.num(f.cleanCycleDays) > 0 && f.lastClean) {
        push(Object.assign({}, base, { key: 'clean-' + it.id, title: '家电清洗保养', due: A.addDays(f.lastClean, A.num(f.cleanCycleDays)), advance: adv.other, icon: '🧽', source: '养护' }));
      }
      if (f.washCycleDays && A.num(f.washCycleDays) > 0 && f.lastWash) {
        push(Object.assign({}, base, { key: 'wash-' + it.id, title: '床品该换洗了', due: A.addDays(f.lastWash, A.num(f.washCycleDays)), advance: adv.other, icon: '🛏️', source: '养护' }));
      }
      if (f.calibrationCycleDays && A.num(f.calibrationCycleDays) > 0 && f.lastCalibration) {
        push(Object.assign({}, base, { key: 'cal-' + it.id, title: '器械校准/换电池', due: A.addDays(f.lastCalibration, A.num(f.calibrationCycleDays)), advance: adv.other, icon: '🩺', source: '养护' }));
      }

      /* 8. 保修到期 */
      if (f.warrantyExpiry) {
        push(Object.assign({}, base, { key: 'war-' + it.id, title: '保修即将到期', due: f.warrantyExpiry, advance: adv.other, icon: '🧾', source: '保修' }));
      }
    });

    /* ---- 账目类提醒 ---- */
    A.db.bills.forEach(function (b) {
      var due = A.nextDueDate(b);
      if (!due) return;
      var a = (b.remindDays === null || b.remindDays === undefined || b.remindDays === '') ? adv.bill : A.num(b.remindDays);
      push({
        key: 'bill-' + b.id, title: '缴费 / 续费', target: b.name, due: due,
        advance: a, icon: b.icon || '💰', refType: 'bill', refId: b.id, source: '账目'
      });
    });

    var order = { red: 0, orange: 1, yellow: 2 };
    out.sort(function (x, y) { return (order[x.level] - order[y.level]) || (x.daysLeft - y.daysLeft); });
    return out;
  };

  A.dismissReminder = function (id) {
    if (A.db.dismissed.indexOf(id) < 0) { A.db.dismissed.push(id); A.save(); }
  };
  A.reminderCounts = function () {
    var r = A.buildReminders(), c = { total: r.length, red: 0, orange: 0, yellow: 0 };
    r.forEach(function (x) { c[x.level]++; });
    return c;
  };

})(window.App);
