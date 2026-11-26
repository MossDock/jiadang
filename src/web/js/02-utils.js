/* ===== 02 通用工具：日期 / 金额 / 弹层 / 图表 / 导入导出 ===== */
(function (A) {
  'use strict';

  /* --- DOM & 基础 --- */
  A.$ = function (s, r) { return (r || document).querySelector(s); };
  A.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  A.esc = function (s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  A.uid = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); };
  A.num = function (v) { var n = parseFloat(v); return isNaN(n) ? 0 : n; };
  A.clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  A.debounce = function (fn, ms) { var t; return function () { var a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms || 200); }; };

  /* --- 日期（全部按本地时区的 YYYY-MM-DD 字符串处理） --- */
  A.parseD = function (s) {
    if (!s) return null;
    var p = String(s).slice(0, 10).split('-');
    if (p.length < 3) return null;
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return isNaN(d.getTime()) ? null : d;
  };
  A.fmtD = function (d) {
    if (!d) return '';
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  };
  A.today = function () { return A.fmtD(new Date()); };
  A.addDays = function (s, n) { var d = A.parseD(s); if (!d) return ''; d.setDate(d.getDate() + Number(n || 0)); return A.fmtD(d); };
  A.addMonths = function (s, n) {
    var d = A.parseD(s); if (!d) return '';
    var day = d.getDate();
    d.setDate(1); d.setMonth(d.getMonth() + Number(n || 0));
    var last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, last));
    return A.fmtD(d);
  };
  A.diffDays = function (from, to) {
    var a = A.parseD(from), b = A.parseD(to);
    if (!a || !b) return 0;
    return Math.round((b - a) / 86400000);
  };
  A.daysLeft = function (date) { return A.diffDays(A.today(), date); };
  A.monthKey = function (s) { return String(s || '').slice(0, 7); };
  A.monthLabel = function (key) { var p = String(key).split('-'); return (+p[1]) + '月'; };
  A.dateLabel = function (s) {
    if (!s) return '未设置';
    var p = String(s).slice(0, 10).split('-');
    return p.length < 3 ? s : (+p[1]) + '月' + (+p[2]) + '日';
  };
  A.fullDateLabel = function (s) { return s || '未设置'; };
  A.lastMonths = function (n) {
    var out = [], d = new Date(); d.setDate(1);
    for (var i = n - 1; i >= 0; i--) {
      var x = new Date(d.getFullYear(), d.getMonth() - i, 1);
      out.push(A.fmtD(x).slice(0, 7));
    }
    return out;
  };
  A.daysInMonth = function (y, m) { return new Date(y, m, 0).getDate(); };
  A.weekday = function (s) { var d = A.parseD(s); return d ? ['周日','周一','周二','周三','周四','周五','周六'][d.getDay()] : ''; };

  /* --- 金额 --- */
  A.fmtNum = function (n, dec) {
    var v = Number(n) || 0;
    var s = v.toFixed(dec == null ? 2 : dec);
    var p = s.split('.');
    p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return p.join('.');
  };
  A.money = function (n) { return '¥' + A.fmtNum(n); };
  A.money0 = function (n) { var v = Number(n) || 0; return '¥' + A.fmtNum(v, Math.abs(v % 1) > 0.004 ? 2 : 0); };
  A.shortMoney = function (n) {
    var v = Number(n) || 0;
    if (Math.abs(v) >= 10000) return (v / 10000).toFixed(v % 10000 === 0 ? 0 : 1) + '万';
    if (Math.abs(v) >= 1000) return (v / 1000).toFixed(1) + 'k';
    return String(Math.round(v));
  };
  A.pct = function (v, total) { return total > 0 ? Math.round(v / total * 1000) / 10 : 0; };

  /* --- 轻提示 --- */
  A.toast = function (msg, ms) {
    var root = A.$('#toast-root'); if (!root) return;
    var t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg;
    root.appendChild(t);
    setTimeout(function () { t.style.transition = 'opacity .25s'; t.style.opacity = '0'; setTimeout(function () { t.remove(); }, 260); }, ms || 1900);
  };

  /* --- 底部弹层 / 居中弹窗 --- */
  A.openSheet = function (opts) {
    var root = A.$('#modal-root');
    var mask = document.createElement('div');
    mask.className = 'mask' + (opts.center ? ' center' : '');
    var foot = opts.foot ? '<div class="sheet-foot">' + opts.foot + '</div>' : '';
    mask.innerHTML = '<div class="sheet">' +
      '<div class="sheet-head"><b>' + A.esc(opts.title || '') + '</b><button class="x" data-sheet-close>&times;</button></div>' +
      '<div class="sheet-body">' + (opts.body || '') + '</div>' + foot + '</div>';
    root.appendChild(mask);
    requestAnimationFrame(function () { mask.classList.add('show'); });
    var closed = false;
    function close() {
      if (closed) return; closed = true;
      mask.classList.remove('show');
      setTimeout(function () { mask.remove(); }, 230);
      if (opts.onClose) opts.onClose();
    }
    mask.addEventListener('click', function (e) {
      if (e.target === mask) close();
      var c = e.target.closest('[data-sheet-close]');
      if (c) close();
    });
    if (opts.onMount) opts.onMount(mask, close);
    return { el: mask, close: close };
  };
  A.confirm = function (title, msg, onOk, okText, danger) {
    A.openSheet({
      center: true, title: title,
      body: '<div style="font-size:14px;line-height:1.65;color:var(--text-2);padding:4px 0 8px">' + A.esc(msg) + '</div>',
      foot: '<button class="btn ghost" data-sheet-close>取消</button><button class="btn ' + (danger === false ? '' : 'danger') + '" id="cfm-ok">' + A.esc(okText || '确定') + '</button>',
      onMount: function (el, close) {
        A.$('#cfm-ok', el).onclick = function () { close(); if (onOk) onOk(); };
      }
    });
  };
  A.pickList = function (title, items, onPick) {
    var html = '<div class="list-pick">' + items.map(function (it, i) {
      return '<div class="p" data-pick="' + i + '"><span class="e">' + (it.icon || '') + '</span><span class="grow">' + A.esc(it.label) + '</span>' +
        (it.hint ? '<span class="small muted">' + A.esc(it.hint) + '</span>' : '') +
        (it.checked ? '<span class="ck">✓</span>' : '') + '</div>';
    }).join('') + '</div>';
    A.openSheet({
      title: title, body: html,
      onMount: function (el, close) {
        A.$$('[data-pick]', el).forEach(function (n) {
          n.onclick = function () { close(); onPick(items[+n.dataset.pick], +n.dataset.pick); };
        });
      }
    });
  };

  /* --- 图片查看 / 压缩 --- */
  A.viewImage = function (src) {
    var v = A.$('#viewer-root');
    v.innerHTML = '<img src="' + A.esc(src) + '" alt="照片"><div class="vx">&times;</div>';
    v.classList.add('show');
    v.onclick = function () { v.classList.remove('show'); v.innerHTML = ''; };
  };
  A.compressImage = function (file, maxSide) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (e) {
        var img = new Image();
        img.onload = function () {
          var m = maxSide || 900, w = img.width, h = img.height;
          if (w > h && w > m) { h = Math.round(h * m / w); w = m; }
          else if (h >= w && h > m) { w = Math.round(w * m / h); h = m; }
          var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
          cv.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(cv.toDataURL('image/jpeg', 0.72));
        };
        img.onerror = reject; img.src = e.target.result;
      };
      reader.onerror = reject; reader.readAsDataURL(file);
    });
  };
  A.readFileText = function (file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader(); r.onload = function (e) { resolve(e.target.result); };
      r.onerror = reject; r.readAsText(file, 'utf-8');
    });
  };

  /* --- 图表（纯 CSS/SVG，无外部依赖，可离线） --- */
  A.chartBars = function (data, opt) {
    opt = opt || {};
    if (!data.length) return '<div class="empty" style="padding:24px"><div class="d">暂无数据</div></div>';
    var max = 1;
    data.forEach(function (d) { if (d.value > max) max = d.value; });
    var body = data.map(function (d, i) {
      var h = Math.max(2, Math.round(d.value / max * 100));
      var label = opt.showValue === false ? '' : '<span class="bv">' + (opt.format ? opt.format(d.value) : A.shortMoney(d.value)) + '</span>';
      return '<div class="bcol">' + label + '<div class="bar' + (d.alt ? ' alt' : '') + '" style="height:' + h + '%"></div><span class="bl">' + A.esc(d.label) + '</span></div>';
    }).join('');
    return '<div class="bars">' + body + '</div>';
  };
  A.chartDonut = function (data, centerTop, centerBottom) {
    var total = 0; data.forEach(function (d) { total += d.value; });
    if (total <= 0) return '<div class="empty" style="padding:24px"><div class="d">暂无数据</div></div>';
    var acc = 0, seg = [];
    data.forEach(function (d, i) {
      var from = acc / total * 100; acc += d.value;
      var to = acc / total * 100;
      var color = d.color || A.PALETTE[i % A.PALETTE.length];
      seg.push(color + ' ' + from.toFixed(2) + '% ' + to.toFixed(2) + '%');
      d._color = color;
    });
    var legend = data.slice(0, 7).map(function (d) {
      return '<div class="li"><i style="background:' + d._color + '"></i><span class="ln">' + A.esc(d.label) + '</span><span class="lv">' + A.pct(d.value, total) + '%</span></div>';
    }).join('');
    return '<div class="donut-wrap"><div class="donut" style="background:conic-gradient(' + seg.join(',') + ')">' +
      '<div class="dc"><b>' + A.esc(centerTop || A.shortMoney(total)) + '</b><span>' + A.esc(centerBottom || '合计') + '</span></div></div>' +
      '<div class="legend">' + legend + '</div></div>';
  };
  A.inlineBars = function (data, opt) {
    opt = opt || {};
    var total = 0; data.forEach(function (d) { total += d.value; });
    if (!data.length) return '<div class="small muted center" style="padding:16px">暂无数据</div>';
    return '<div class="inline-bars">' + data.map(function (d, i) {
      return '<div class="ib"><div class="ibl"><span>' + A.esc(d.label) + '</span><span class="b">' + (opt.format ? opt.format(d.value) : A.money0(d.value)) + ' · ' + A.pct(d.value, total) + '%</span></div>' +
        '<div class="ibt"><i style="width:' + Math.max(1, A.pct(d.value, total)) + '%;background:' + (d.color || A.PALETTE[i % A.PALETTE.length]) + '"></i></div></div>';
    }).join('') + '</div>';
  };

  /* --- 导出：CSV / Excel / 文件下载 --- */
  A.downloadText = function (filename, text, mime, bom) {
    var content = (bom ? '\ufeff' : '') + text;
    var blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    A.downloadBlob(filename, blob);
  };
  A.downloadBlob = function (filename, blob) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(function () { a.remove(); URL.revokeObjectURL(url); }, 1200);
  };
  A.toCSV = function (rows) {
    return rows.map(function (r) {
      return r.map(function (c) {
        var s = String(c == null ? '' : c);
        return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(',');
    }).join('\r\n');
  };
  A.exportCSV = function (filename, rows) {
    A.downloadText(filename, A.toCSV(rows), 'text/csv;charset=utf-8', true);
    A.toast('CSV 已导出');
  };
  var xmlEsc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  A.exportExcel = function (filename, sheets) {
    var xml = '<?xml version="1.0" encoding="UTF-8"?>\r\n<?mso-application progid="Excel.Sheet"?>\r\n' +
      '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\r\n';
    sheets.forEach(function (sh) {
      xml += '<Worksheet ss:Name="' + xmlEsc(sh.name.slice(0, 30)) + '"><Table>\r\n';
      (sh.rows || []).forEach(function (row) {
        xml += '<Row>';
        row.forEach(function (c) {
          var isNum = typeof c === 'number' && isFinite(c);
          xml += '<Cell><Data ss:Type="' + (isNum ? 'Number' : 'String') + '">' + xmlEsc(c) + '</Data></Cell>';
        });
        xml += '</Row>\r\n';
      });
      xml += '</Table></Worksheet>\r\n';
    });
    xml += '</Workbook>';
    A.downloadText(filename, xml, 'application/vnd.ms-excel;charset=utf-8', false);
    A.toast('Excel 已导出');
  };

  /* --- 表单读取辅助 --- */
  A.formVal = function (root, key) {
    var n = A.$('[name="' + key + '"]', root);
    if (!n) return '';
    if (n.type === 'checkbox') return n.checked;
    return n.value;
  };
  A.formData = function (form) {
    var out = {};
    A.$$('[name]', form).forEach(function (n) {
      if (n.type === 'checkbox') {
        if (!out[n.name]) out[n.name] = [];
        if (n.checked) out[n.name].push(n.value);
      } else if (n.type === 'radio') { if (n.checked) out[n.name] = n.value; }
      else out[n.name] = n.value;
    });
    return out;
  };

  A.fieldHTML = function (fd, value, namePrefix) {
    var name = (namePrefix || '') + fd.key;
    var v = value == null ? (fd.def == null ? '' : fd.def) : value;
    var type = fd.type || 'text';
    var hint = fd.hint ? '<div class="hint">' + A.esc(fd.hint) + '</div>' : '';
    var inner = '';
    if (type === 'textarea') {
      inner = '<textarea name="' + name + '" placeholder="' + A.esc(fd.placeholder || '') + '">' + A.esc(v) + '</textarea>';
    } else if (type === 'select') {
      var opts = (fd.options || []).map(function (o) {
        var val = (typeof o === 'object') ? o.v : o, lab = (typeof o === 'object') ? o.l : o;
        return '<option value="' + A.esc(val) + '"' + (String(v) === String(val) ? ' selected' : '') + '>' + A.esc(lab) + '</option>';
      }).join('');
      inner = '<select name="' + name + '"><option value="">请选择</option>' + opts + '</select>';
    } else if (type === 'multiselect') {
      var arr = Array.isArray(v) ? v : (v ? String(v).split(',') : []);
      inner = '<div class="multi-opts">' + (fd.options || []).map(function (o) {
        var val = (typeof o === 'object') ? o.v : o, lab = (typeof o === 'object') ? o.l : o;
        return '<label><input type="checkbox" name="' + name + '" value="' + A.esc(val) + '"' + (arr.indexOf(String(val)) >= 0 ? ' checked' : '') + '><span>' + A.esc(lab) + '</span></label>';
      }).join('') + '</div>';
    } else if (type === 'number') {
      inner = '<div class="unit"><input type="number" inputmode="decimal" step="any" name="' + name + '" value="' + A.esc(v) + '" placeholder="' + A.esc(fd.placeholder || '') + '">' + (fd.unit ? '<span>' + A.esc(fd.unit) + '</span>' : '') + '</div>';
    } else if (type === 'date') {
      inner = '<input type="date" name="' + name + '" value="' + A.esc(v) + '">';
    } else {
      inner = '<input type="text" name="' + name + '" value="' + A.esc(v) + '" placeholder="' + A.esc(fd.placeholder || '') + '">';
    }
    var req = fd.required ? '<span class="req">*</span>' : '';
    return '<div class="field"><label>' + A.esc(fd.label) + req + '</label>' + inner + hint + '</div>';
  };

})(window.App);
