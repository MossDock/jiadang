/* ===== 家当 Android 原生桥接层（仅 APK 内加载） =====
   window.JD 由 MainActivity 通过 addJavascriptInterface 注入。
   不改动任何业务代码，只在最外层做能力替换。 */
(function () {
  'use strict';
  var A = window.App;
  if (!A) return;
  var JD = window.JD;

  /* 1) 导出：WebView 不支持 blob: 下载，转成 base64 交给原生写入「下载」目录 */
  if (JD && JD.saveFile) {
    A.downloadBlob = function (filename, blob) {
      try {
        var r = new FileReader();
        r.onload = function () {
          var b64 = String(r.result || '').split(',')[1] || '';
          JD.saveFile(filename, b64, (blob && blob.type) || 'application/octet-stream');
        };
        r.onerror = function () { A.toast('导出失败，请重试'); };
        r.readAsDataURL(blob);
      } catch (e) { A.toast('导出失败，请重试'); }
    };
  }

  /* 2) 主题：同步状态栏 / 导航栏图标深浅色 */
  function reportTheme() {
    if (JD && JD.setTheme) { try { JD.setTheme(document.body.dataset.theme || 'teal'); } catch (e) {} }
  }
  if (window.MutationObserver) {
    new MutationObserver(reportTheme).observe(document.body,
      { attributes: true, attributeFilter: ['data-theme'] });
  }
  reportTheme();

  /* 3) 路由上报：原生返回键据此判断是回退页面还是退出 */
  function reportHash() {
    if (JD && JD.onHash) { try { JD.onHash(location.hash || '#/home'); } catch (e) {} }
  }
  window.addEventListener('hashchange', reportHash);
  reportHash();

  /* 4) 返回键统一入口：先关弹层 → 再回退页面 → 都不行则交原生退出 */
  window.__JD_BACK__ = function () {
    var m = document.querySelector('#modal-root .mask.show');
    if (m) { try { m.click(); } catch (e) { m.classList.remove('show'); } return true; }
    var v = document.querySelector('#viewer-root.show');
    if (v) { v.classList.remove('show'); return true; }
    if (location.hash && location.hash !== '#/home' && location.hash !== '#') {
      A.back(); return true;
    }
    return false;
  };

  /* 5) 页面就绪，通知原生补一次安全区校正（刘海/手势条实测） */
  function ready() { if (JD && JD.onReady) { try { JD.onReady(); } catch (e) {} } }
  if (document.readyState === 'complete') ready();
  else window.addEventListener('load', ready);

  /* 6) 设置页把「安装到主屏幕」换成「关于本机 APP」，避免出现矛盾的 PWA 文案 */
  var oldInstall = A.actions['install-app'];
  A.actions['install-app'] = function () {
    A.openSheet({ title: '已安装为 APP', center: true,
      body: '<div style="padding:8px 2px 16px;line-height:1.85;font-size:14px;color:var(--text-2)">'
        + '你正在使用 <b>家当 Android 安装版</b>。<br><br>'
        + '· 独立图标、全屏运行，不依赖浏览器<br>'
        + '· 数据只保存在本机，完全离线可用<br>'
        + '· 无需登录、不上传云端<br><br>'
        + '换手机或卸载前，请在「数据管理」里导出一次备份。</div>' });
  };
  A.actions['install-help'] = A.actions['install-app'];
})();
