/* ===== 09 设置：类别字段管理 / 提醒设置 / 主题 / 数据备份 ===== */
(function (A) {
  'use strict';
  A.actions = A.actions || {};

  A.renderSettings = function () {
    var s = A.db.settings, adv = s.advance || {};
    var html = A.pageHeader('设置', { back: false });
    html += '<div class="wrap">';

    /* 外观 */
    html += '<div class="set-group"><div class="gh">外观</div>' +
      '<div class="set-row"><div class="si"><svg class="ic" style="width:16px;height:16px"><use href="#i-sparkle"/></svg></div><div class="grow"><div class="st">配色主题</div><div class="sd">4 套配色 · 含深色模式 · 切换后立即生效</div></div></div>' +
      '<div class="theme-opts">' + [
        { k: 'teal', l: '墨松绿', c: 'linear-gradient(145deg,#2E6A57,#1B4338)' },
        { k: 'orange', l: '陶土橙', c: 'linear-gradient(145deg,#C97B45,#96512A)' },
        { k: 'blue', l: '雾蓝', c: 'linear-gradient(145deg,#4B7FC4,#2F547A)' },
        { k: 'night', l: '夜墨', c: 'linear-gradient(145deg,#1F2926,#0F1513)' }
      ].map(function (t) {
        return '<div class="theme-opt' + (s.theme === t.k ? ' on' : '') + '" data-action="theme-set" data-v="' + t.k + '">' +
          '<div class="sw" style="background:' + t.c + '"></div>' + t.l + (s.theme === t.k ? ' ✓' : '') + '</div>';
      }).join('') + '</div></div>';

    /* 提醒设置 */
    html += '<div class="set-group"><div class="gh">提醒设置</div>' +
      '<div class="set-row"><div class="si">🔔</div><div class="grow"><div class="st">开启提醒</div><div class="sd">关闭后提醒中心不再汇总事项</div></div>' +
      '<span class="switch' + (s.reminderOn ? ' on' : '') + '" data-action="toggle-reminder"><i></i></span></div>' +
      A.ADVANCE_DEFS.map(function (d) {
        return '<div class="set-row"><div class="si">' + d.icon + '</div><div class="grow"><div class="st">' + A.esc(d.label) + '</div>' +
          '<div class="sd">到期前多少天开始提示</div></div>' +
          '<input type="number" min="1" max="365" value="' + A.num(adv[d.key] || d.def) + '" data-action="advance-set" data-k="' + d.key + '"><span class="small muted">天</span></div>';
      }).join('') + '</div>';

    /* 类别与字段管理 */
    html += '<div class="set-group"><div class="gh">类别与字段管理</div>' +
      '<div class="set-row" data-action="go" data-href="#/cat-new"><div class="si">➕</div><div class="grow"><div class="st">新增自定义类别</div>' +
      '<div class="sd">可以给新类别添加自己的专属字段</div></div><span class="ar">›</span></div>' +
      A.db.categories.map(function (c) {
        return '<div class="set-row" data-action="cat-edit" data-id="' + c.id + '"><div class="si">' + c.icon + '</div>' +
          '<div class="grow"><div class="st">' + A.esc(c.name) + '</div><div class="sd">' + (c.subs || []).length + ' 个子类型 · ' + (c.fields || []).length + ' 个自定义字段' +
          (c.builtin ? ' · 内置' : ' · 自定义') + '</div></div><span class="ar">›</span></div>';
      }).join('') + '</div>';

    /* 数据管理 */
    html += '<div class="set-group"><div class="gh">数据管理 · 全部数据只存在本机</div>' +
      row('📊', '导出 Excel', '含物品、缴费、项目、提醒、类别 5 张表', 'export-excel') +
      row('📄', '导出 CSV', '全量数据汇总为一个 CSV 文件', 'export-csv') +
      row('💾', '导出备份（JSON）', '完整备份，可用「导入恢复」还原', 'export-json') +
      row('📥', '导入恢复', '从之前导出的 JSON 备份恢复数据', 'import-json') +
      row('🧪', '重新载入示例数据', '清空当前数据并载入一套演示数据', 'load-demo') +
      row('🗑', '清空全部数据', '删除所有物品与账目，不可撤销', 'clear-data') +
      '</div>' +
      '<input type="file" id="import-file" accept=".json,application/json" style="display:none" data-action="import-file">';

    /* 安装到手机 */
    html += '<div class="set-group"><div class="gh">把「家当」装到手机桌面</div>' +
      '<div class="set-row" data-action="install-app"><div class="si">📲</div><div class="grow"><div class="st">安装到主屏幕</div>' +
      '<div class="sd">安装后有独立图标、全屏运行、可离线打开</div></div><span class="ar">›</span></div>' +
      '<div class="set-row" data-action="install-help"><div class="si">❓</div><div class="grow"><div class="st">安装方法（iPhone / 安卓 / 微信）</div>' +
      '<div class="sd">在微信里打开时，请点右上角「···」用浏览器打开</div></div><span class="ar">›</span></div></div>';

    /* 关于 */
    html += '<div class="set-group"><div class="gh">关于</div>' +
      '<div class="set-row"><div class="si">🏠</div><div class="grow"><div class="st">家当 v1.0</div>' +
      '<div class="sd">16 大类物品 · 家庭账目 · 提醒中心 · 资产与消费统计</div></div></div>' +
      '<div class="set-row"><div class="si">🔒</div><div class="grow"><div class="st">数据只保存在本设备</div>' +
      '<div class="sd">不上传云端、不需要登录；换手机或清缓存前请先导出备份</div></div></div>' +
      '<div class="set-row"><div class="si">📈</div><div class="grow"><div class="st">当前数据量</div>' +
      '<div class="sd">' + A.db.items.length + ' 件物品 · ' + A.db.bills.length + ' 个支出项目 · ' + A.allRecords().length + ' 笔缴费</div></div></div></div>';

    html += '<div class="hr-text">记得全 · 找得到 · 到期能想起来</div></div><div class="safe-bottom"></div>';
    return html;
  };
  function row(icon, title, desc, act) {
    return '<div class="set-row" data-action="' + act + '"><div class="si">' + icon + '</div>' +
      '<div class="grow"><div class="st">' + A.esc(title) + '</div><div class="sd">' + A.esc(desc) + '</div></div><span class="ar">›</span></div>';
  }

  /* ---------------- 主题 / 开关 ---------------- */
  A.actions['theme-set'] = function (el) {
    A.db.settings.theme = el.dataset.v; A.save(); document.body.dataset.theme = el.dataset.v;
    A.toast('配色已切换'); A.render();
  };
  A.actions['toggle-reminder'] = function () {
    A.db.settings.reminderOn = !A.db.settings.reminderOn; A.save();
    A.toast(A.db.settings.reminderOn ? '提醒已开启' : '提醒已关闭'); A.render();
  };
  A.onAdvanceChange = function (el) {
    var v = Math.max(1, Math.min(365, A.num(el.value) || 1));
    A.db.settings.advance[el.dataset.k] = v; A.save();
  };

  /* ---------------- 类别 / 字段管理 ---------------- */
  A.actions['cat-new'] = function () {
    A.ui.newCat = { id: 'cat_' + A.uid(), name: '', icon: '📦', color: '#5AD8A6', builtin: false, fields: [], subs: [{ id: 'misc', name: '通用', fields: [], subs: [] }] };
    A.go('#/cat-new');
  };
  A.actions['cat-edit'] = function (el) { A.go('#/cat/' + el.dataset.id); };

  A.renderCategoryEdit = function (p) {
    var isNew = !!p.isNew;
    var cat = isNew
      ? (A.ui.newCat || (A.ui.newCat = { id: 'cat_' + A.uid(), name: '', icon: '📦', color: '#5AD8A6', builtin: false, fields: [], subs: [{ id: 'misc', name: '通用', fields: [], subs: [] }] }))
      : A.getCategory(p.id);
    if (!cat) return A.pageHeader('类别不存在', { back: true }) + '<div class="empty"><div class="d">可能已被删除</div></div>';

    var html = A.pageHeader(isNew ? '新增类别' : '编辑类别', { back: true });
    html += '<div class="wrap">';
    html += '<div class="card"><div class="group-title">类别信息</div><div class="group-body">' +
      A.fieldHTML({ key: 'catName', label: '类别名称', type: 'text', placeholder: '如：摄影器材', required: true }, cat.name) +
      A.fieldHTML({ key: 'catIcon', label: '图标（一个 emoji）', type: 'text', placeholder: '📷' }, cat.icon) +
      '<div class="tiny muted">自定义类别会出现在物品页的类别标签和添加页九宫格里</div></div></div>';

    html += '<div class="card"><div class="group-title">专属字段 <span class="small muted" style="font-weight:400">(' + (cat.fields || []).length + ')</span></div>';
    if (!(cat.fields || []).length) html += '<div class="small muted" style="padding:6px 0 10px">还没有自定义字段，可以在下面添加</div>';
    else html += cat.fields.map(function (fd, i) {
      return '<div class="field-edit-row"><span class="fn">' + A.esc(fd.label) + '</span><span class="ft">' + typeLabel(fd.type) + '</span>' +
        '<button class="fx" data-action="cat-del-field" data-i="' + i + '">×</button></div>';
    }).join('');

    html += '<div class="divider"></div><div class="small b mb8">添加一个字段</div>' +
      '<div class="field"><input type="text" id="new-f-name" placeholder="字段名，如：镜头型号"></div>' +
      '<div class="row" style="gap:8px"><select id="new-f-type" style="flex:1;border:1px solid var(--line);border-radius:9px;padding:9px;background:var(--card-2);min-height:40px">' +
      ['text', 'number', 'date', 'select', 'textarea'].map(function (t) { return '<option value="' + t + '">' + typeLabel(t) + '</option>'; }).join('') +
      '</select><input type="text" id="new-f-options" placeholder="选项,逗号分隔" style="flex:1;min-width:0;border:1px solid var(--line);border-radius:9px;padding:9px;background:var(--card-2);min-height:40px"></div>' +
      '<div class="tiny muted mt6">「下拉选择」类型才需要填选项，例如：定焦,变焦</div>' +
      '<button class="btn soft sm block mt10" data-action="cat-add-field">＋ 添加字段</button></div>';

    if (!isNew) {
      var used = A.db.items.filter(function (i) { return i.categoryId === cat.id; }).length;
      html += '<div class="card"><div class="group-title">危险操作</div>' +
        '<div class="small muted mb8">该类别下目前有 ' + used + ' 件物品。删除类别不会删除物品，它们会显示为「未分类」。</div>' +
        '<button class="btn danger sm block" data-action="cat-delete" data-id="' + cat.id + '">删除这个类别</button></div>';
    }

    html += '<div class="form-foot"><button class="btn block" data-action="cat-save" data-new="' + (isNew ? 1 : 0) + '" data-id="' + cat.id + '">' +
      (isNew ? '创建类别' : '保存类别信息') + '</button></div>';
    html += '</div><div class="safe-bottom"></div>';
    return html;
  };
  function typeLabel(t) {
    return { text: '文本', number: '数字', date: '日期', select: '下拉选择', multiselect: '多选', textarea: '多行文本' }[t] || '文本';
  }
  function currentCat() {
    var isNew = location.hash.indexOf('#/cat-new') === 0;
    return isNew ? A.ui.newCat : A.getCategory((location.hash.split('/')[2] || '').split('?')[0]);
  }
  A.actions['cat-add-field'] = function () {
    var cat = currentCat(); if (!cat) return;
    var name = (A.$('#new-f-name') || {}).value || '';
    var type = (A.$('#new-f-type') || {}).value || 'text';
    var opts = ((A.$('#new-f-options') || {}).value || '').split(/[,，]/).map(function (x) { return x.trim(); }).filter(Boolean);
    if (!name.trim()) { A.toast('请填写字段名'); return; }
    cat.fields = cat.fields || [];
    cat.fields.push({ key: 'x_' + A.uid(), label: name.trim(), type: type, options: type === 'select' ? opts : undefined });
    if (A.ui.newCat !== cat) A.save();
    A.toast('字段已添加'); A.render();
  };
  A.actions['cat-del-field'] = function (el) {
    var cat = currentCat(); if (!cat) return;
    cat.fields.splice(+el.dataset.i, 1);
    if (A.ui.newCat !== cat) A.save();
    A.toast('字段已删除'); A.render();
  };
  A.actions['cat-save'] = function (el) {
    var isNew = el.dataset.new === '1';
    var cat = isNew ? A.ui.newCat : A.getCategory(el.dataset.id);
    if (!cat) return;
    cat.name = ((A.$('[name="catName"]') || {}).value || '').trim() || cat.name;
    cat.icon = ((A.$('[name="catIcon"]') || {}).value || '').trim() || cat.icon;
    if (!cat.name) { A.toast('请填写类别名称'); return; }
    if (isNew) { A.db.categories.push(cat); A.ui.newCat = null; }
    A.save(); A.toast(isNew ? '类别已创建' : '已保存'); A.go('#/settings', true);
  };
  A.actions['cat-delete'] = function (el) {
    var cat = A.getCategory(el.dataset.id); if (!cat) return;
    A.confirm('删除类别', '确定删除「' + cat.name + '」吗？该类别下的物品不会被删除，但会显示为未分类。', function () {
      A.db.categories = A.db.categories.filter(function (c) { return c.id !== cat.id; });
      A.save(); A.toast('类别已删除'); A.go('#/settings', true);
    }, '确认删除');
  };

  /* ---------------- 数据管理 ---------------- */
  A.actions['export-excel'] = function () { A.exportAllExcel(); };
  A.actions['export-csv'] = function () {
    var sheets = A.buildExportSheets(), rows = [];
    sheets.forEach(function (sh) {
      rows.push(['【' + sh.name + '】']);
      sh.rows.forEach(function (r) { rows.push(r); });
      rows.push([]);
    });
    A.exportCSV('家当_全量数据_' + A.today() + '.csv', rows);
  };
  A.actions['export-json'] = function () { A.exportBackup(); };
  A.actions['import-json'] = function () { var f = A.$('#import-file'); if (f) f.click(); };
  A.onImportChosen = function (input) {
    var file = (input.files || [])[0]; if (!file) return;
    A.readFileText(file).then(function (text) {
      A.confirm('导入恢复', '导入会覆盖当前设备上的全部数据，确定继续吗？建议先导出一次备份。', function () {
        if (A.importBackup(text)) { A.ui.newCat = null; A.go('#/home', true); }
      }, '确认导入');
    }).catch(function () { A.toast('文件读取失败'); });
    input.value = '';
  };
  A.actions['clear-data'] = function () {
    A.confirm('清空全部数据', '将删除所有物品、账目和缴费记录，得到一个空清单。此操作不可撤销，建议先导出备份。', function () {
      A.resetDB(false); A.ui.newCat = null; A.toast('已清空'); A.go('#/home', true);
    }, '确认清空');
  };
  A.actions['load-demo'] = function () {
    A.confirm('载入示例数据', '会覆盖当前全部数据，换成一套可体验的演示数据。', function () {
      A.resetDB(true); A.toast('示例数据已载入'); A.go('#/home', true);
    }, '载入', false);
  };

  /* ---------------- 安装 ---------------- */
  A.actions['install-app'] = function () {
    if (A.deferredPrompt) {
      A.deferredPrompt.prompt();
      A.deferredPrompt.userChoice.then(function (r) {
        A.toast(r.outcome === 'accepted' ? '正在安装到桌面' : '已取消安装');
        A.deferredPrompt = null;
      });
    } else A.actions['install-help']();
  };
  A.actions['install-help'] = function () {
    A.openSheet({
      title: '把「家当」装到手机桌面', center: true,
      body: '<div style="font-size:13.5px;line-height:1.85;color:var(--text-2)">' +
        '<p><b style="color:var(--text)">安卓（Chrome / Edge / 夸克等）</b><br>打开本页 → 浏览器菜单 → 「添加到主屏幕」/「安装应用」→ 确认。</p>' +
        '<p><b style="color:var(--text)">iPhone（Safari）</b><br>用 Safari 打开 → 底部分享按钮 <b>⬆️</b> → 下滑找到「添加到主屏幕」→ 添加。</p>' +
        '<p><b style="color:var(--text)">微信里打开</b><br>点右上角「···」→「在浏览器中打开」，再按上面步骤操作。微信内置浏览器不支持安装。</p>' +
        '<p style="margin-bottom:0">安装后：<b style="color:var(--text)">独立图标、全屏无地址栏、断网也能查看</b>，数据仍只存在这台设备上。</p></div>'
    });
  };

})(window.App);
