/* ===== 10 应用入口：路由 / 导航 / 事件委托 / PWA 初始化 ===== */
(function (A) {
  'use strict';
  A.actions = A.actions || {};
  A.ui = {
    itemsCat: 'all', itemsStatus: 'all', itemsLocation: 'all', itemsBuyPeriod: 'all',
    itemsSort: 'created', itemsSearch: '',
    formPhotos: [], formId: null,
    pPreset: 'month', pFrom: '', pTo: '', recPhoto: '', newCat: null
  };
  A.deferredPrompt = null;

  var BACK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>';
  A.pageHeader = function (title, opts) {
    opts = opts || {};
    return '<div class="topbar plain"><div class="topbar-row">' +
      (opts.back ? '<button class="backbtn" data-action="back">' + BACK_SVG + '返回</button>' : '') +
      '<h1>' + A.esc(title) + '</h1>' + (opts.right || '') + '</div>' +
      (opts.sub ? '<div class="sub">' + A.esc(opts.sub) + '</div>' : '') + '</div>';
  };

  /* ---------- 路由 ---------- */
  function segments() {
    return (location.hash || '').replace(/^#\/?/, '').split('/').filter(Boolean);
  }
  A.go = function (hash, replace) {
    if (location.hash === hash) { A.render({ keepScroll: false }); return; }
    if (replace) location.replace(hash);
    else location.hash = hash;
  };
  A.back = function () {
    if (history.length > 1) history.back();
    else A.go('#/home');
  };

  function route() {
    var s = segments(), a = s[0] || 'home', b = s[1], c = s[2];
    var tab = 'home', fab = true, html = '';
    switch (a) {
      case 'home': html = A.renderHome(); tab = 'home'; break;
      case 'items': html = A.renderItems(); tab = 'items'; break;
      case 'item': html = A.renderItemDetail(b); tab = 'items'; fab = false; break;
      case 'add':
        if (b && c) html = A.renderItemForm({ cat: b, sub: c });
        else if (b) html = A.renderItemForm({ cat: b });
        else html = A.renderItemForm({ step: 'cat' });
        tab = 'items'; fab = false; break;
      case 'edit': html = A.renderItemForm({ id: b }); tab = 'items'; fab = false; break;
      case 'bills': html = A.renderBills({ tab: 'bills' }); tab = 'bills'; break;
      case 'stats': html = A.renderBills({ tab: b === 'assets' ? 'assets' : (b === 'purchases' ? 'purchases' : 'stats') }); tab = 'bills'; break;
      case 'bill': html = A.renderBillDetail(b); tab = 'bills'; fab = false; break;
      case 'billform':
        html = (b === 'edit' && c) ? A.renderBillForm({ id: c }) : A.renderBillForm({ tpl: b });
        tab = 'bills'; fab = false; break;
      case 'reminders': html = A.renderReminders(); tab = 'reminders'; break;
      case 'settings': html = A.renderSettings(); tab = 'settings'; break;
      case 'cat': html = A.renderCategoryEdit({ id: b }); tab = 'settings'; fab = false; break;
      case 'cat-new': html = A.renderCategoryEdit({ isNew: true }); tab = 'settings'; fab = false; break;
      default: html = A.renderHome(); tab = 'home';
    }
    return { html: html, tab: tab, fab: fab };
  }

  A.render = function (opts) {
    var keep = !(opts && opts.keepScroll === false);
    var main = A.$('#app-main');
    var sc = main ? main.scrollTop : 0;
    var r;
    try { r = route(); }
    catch (e) {
      console.error('页面渲染出错', e);
      r = { html: '<div class="empty"><div class="e">⚠️</div><div class="t">页面出了点问题</div><div class="d">' + A.esc(e.message) + '</div>' +
        '<button class="btn" data-action="go" data-href="#/home">回到首页</button></div>', tab: 'home', fab: false };
    }
    A.$('#page').innerHTML = r.html;
    /* 详情页固定底部操作栏：移到 shell 层，始终贴在页签上方 */
    var abRoot = A.$('#actionbar-root');
    if (abRoot) {
      var slot = A.$('#page [data-slot="actionbar"]');
      if (slot) { abRoot.innerHTML = slot.innerHTML; abRoot.style.display = 'flex'; slot.remove(); }
      else { abRoot.innerHTML = ''; abRoot.style.display = 'none'; }
    }
    renderTabbar(r.tab);
    var fab = A.$('#fab');
    if (fab) fab.classList.toggle('hide', !r.fab);
    if (main) main.scrollTop = keep ? sc : 0;
    document.body.dataset.theme = A.db.settings.theme || 'teal';
  };

  function renderTabbar(active) {
    var counts = A.reminderCounts();
    var tabs = [
      { k: 'home', i: 'home', l: '首页' }, { k: 'items', i: 'box', l: '物品' },
      { k: 'bills', i: 'receipt', l: '账目' }, { k: 'reminders', i: 'bell', l: '提醒' },
      { k: 'settings', i: 'gear', l: '设置' }
    ];
    A.$('#tabbar').innerHTML = tabs.map(function (t) {
      return '<div class="tab' + (active === t.k ? ' on' : '') + '" data-action="tab" data-tab="' + t.k + '">' +
        '<span class="ico"><svg class="ic"><use href="#i-' + t.i + '"/></svg></span><span>' + t.l + '</span>' +
        (t.k === 'reminders' && (counts.red + counts.orange) > 0 ? '<span class="dot"></span>' : '') + '</div>';
    }).join('');
  }

  /* ---------- 全局动作 ---------- */
  A.actions['go'] = function (el) { A.go(el.dataset.href); };
  A.actions['back'] = function () { A.back(); };
  A.actions['tab'] = function (el) {
    var map = { home: '#/home', items: '#/items', bills: '#/bills', reminders: '#/reminders', settings: '#/settings' };
    A.go(map[el.dataset.tab] || '#/home');
  };
  A.actions['quick-add'] = function () { A.go('#/add'); };
  A.actions['photo-view'] = function (el) { A.viewImage(el.dataset.src); };

  /* ---------- 事件委托 ---------- */
  document.addEventListener('click', function (e) {
    var n = e.target.closest && e.target.closest('[data-action]');
    if (!n) return;
    var fn = A.actions[n.dataset.action];
    if (!fn) return;
    e.preventDefault();
    fn(n, e);
  });
  document.addEventListener('change', function (e) {
    var el = e.target;
    if (el.id === 'photo-file') { A.onPhotoChosen(el); return; }
    if (el.id === 'rec-photo-file') { A.onRecPhotoChosen(el); return; }
    if (el.id === 'import-file') { A.onImportChosen(el); return; }
    if (el.id === 'p-from' || el.id === 'p-to') { A.onPurchaseDateChange(); return; }
    if (el.dataset.action === 'advance-set') { A.onAdvanceChange(el); return; }
  });
  document.addEventListener('input', function (e) {
    if (e.target.dataset.action === 'item-search') A.actions['item-search'](e.target, e);
  });
  document.addEventListener('submit', function (e) {
    var f = e.target;
    e.preventDefault();
    if (f.id === 'item-form') A.onItemSubmit(f);
    else if (f.id === 'bill-form') A.onBillSubmit(f);
  });

  window.addEventListener('hashchange', function () { A.render({ keepScroll: false }); });

  /* ---------- PWA ---------- */
  function initPWA() {
    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      navigator.serviceWorker.register('sw.js').catch(function () { /* 离线能力在 HTTPS 下生效 */ });
    }
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault(); A.deferredPrompt = e;
    });
    window.addEventListener('appinstalled', function () { A.deferredPrompt = null; A.toast('已安装到桌面'); });
  }

  /* ---------- 启动 ---------- */
  function init() {
    A.load();
    document.body.dataset.theme = A.db.settings.theme || 'teal';
    if (!location.hash) history.replaceState(null, '', '#/home');
    A.render({ keepScroll: false });
    initPWA();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})(window.App);
