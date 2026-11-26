#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把 /workspace 的 v2 PWA 前端改造成 APK 专用副本。
线上 PWA 文件一个字不动；所有 APP 化改动只作用在 assets/web/ 副本里。
"""
import os, re, shutil, urllib.request
import icons

SRC = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'web')
BUILD = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.join(BUILD, 'assets', 'web')

os.makedirs(os.path.join(WEB, 'js'), exist_ok=True)
os.makedirs(os.path.join(WEB, 'icons'), exist_ok=True)
os.makedirs(os.path.join(WEB, 'fonts'), exist_ok=True)

# ---------- 1. 复制前端资源 ----------
for f in ['index.html', 'app.css', 'manifest.webmanifest', 'sw.js']:
    shutil.copy(os.path.join(SRC, f), os.path.join(WEB, f))
for f in sorted(os.listdir(os.path.join(SRC, 'js'))):
    if f.endswith('.js'):
        shutil.copy(os.path.join(SRC, 'js', f), os.path.join(WEB, 'js', f))
for f in sorted(os.listdir(os.path.join(SRC, 'icons'))):
    if f.endswith('.png'):
        shutil.copy(os.path.join(SRC, 'icons', f), os.path.join(WEB, 'icons', f))

# ---------- 2. 尝试本地化 DM Sans（数字字体），失败则用系统字体 ----------
font_ok = False
try:
    req = urllib.request.Request(
        'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap',
        headers={'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 '
                               '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'})
    css = urllib.request.urlopen(req, timeout=8).read().decode('utf-8')
    urls = re.findall(r'url\((https://fonts\.gstatic\.com/[^)]+\.woff2)\)', css)
    # latin 子集通常是最后一个 @font-face 块
    if urls:
        data = urllib.request.urlopen(urllib.request.Request(
            urls[-1], headers={'User-Agent': 'Mozilla/5.0'}), timeout=8).read()
        if len(data) > 2000:
            open(os.path.join(WEB, 'fonts', 'dm-sans-latin.woff2'), 'wb').write(data)
            font_ok = True
except Exception as e:
    print('[font] skip:', e)

# ---------- 3. app.css：安全区变量回退 + APK 专用补丁 ----------
css = open(os.path.join(WEB, 'app.css'), encoding='utf-8').read()
# 关键：把 env(safe-area-inset-*) 改成 var(--sa-*, env(...))，
# 原生精确注入时优先用测量值，浏览器里变量未定义则回退 env()。
css = css.replace('env(safe-area-inset-top)', 'var(--sa-top, env(safe-area-inset-top))')
css = css.replace('env(safe-area-inset-bottom)', 'var(--sa-bottom, env(safe-area-inset-bottom))')

face = ''
if font_ok:
    face = ("@font-face{font-family:'DM Sans';src:url('fonts/dm-sans-latin.woff2') format('woff2');"
            "font-weight:400 700;font-style:normal;font-display:swap}\n")

css += """

/* ====================================================================
   家当 Android APP 原生适配层（仅 APK 副本）
   --sa-* 由原生层按状态栏 / 挖孔 / 手势小白条实测值在首帧注入
   ==================================================================== */
""" + face + """
html{--sa-top:0px;--sa-bottom:0px;--sa-left:0px;--sa-right:0px}
html,body{overscroll-behavior:none;-webkit-tap-highlight-color:transparent}
.app-shell{height:100vh;height:100dvh;padding-left:var(--sa-left);padding-right:var(--sa-right)}
/* 灵动岛 / 挖孔横屏时，顶部内容整体再让一点 */
.app-main{padding-top:0}
/* 底部小白条区域与页签同色，视觉连成一体 */
body[data-theme="teal"] .tabbar,
body[data-theme="orange"] .tabbar,
body[data-theme="blue"] .tabbar{background:var(--card)}
"""
open(os.path.join(WEB, 'app.css'), 'w', encoding='utf-8').write(css)

# ---------- 4. index.html：去外部字体、注入安全区首帧脚本、挂桥接 ----------
html = open(os.path.join(WEB, 'index.html'), encoding='utf-8').read()
# 去掉所有 Google Fonts 外链（APP 内纯离线，零网络请求）
html = re.sub(r'<link[^>]*fonts\.googleapis\.com[^>]*>\s*', '', html)
html = re.sub(r'<link[^>]*fonts\.gstatic\.com[^>]*>\s*', '', html)

# 首帧安全区：从 URL 参数读原生测量的 dp 值，零闪烁
safe_script = """<script>
(function(){
  try{
    var m=location.search.match(/[?&]sa=([^&]+)/);
    if(!m)return;
    var p=decodeURIComponent(m[1]).split(',');
    var s=document.documentElement.style;
    s.setProperty('--sa-top',(parseFloat(p[0])||0)+'px');
    s.setProperty('--sa-bottom',(parseFloat(p[1])||0)+'px');
    s.setProperty('--sa-left',(parseFloat(p[2])||0)+'px');
    s.setProperty('--sa-right',(parseFloat(p[3])||0)+'px');
  }catch(e){}
})();
</script>
"""
html = html.replace('<title>', safe_script + '<title>', 1)

# 桥接脚本放在 10-app.js 之后（defer 保证顺序）
html = html.replace('<script defer src="js/10-app.js"></script>',
                    '<script defer src="js/10-app.js"></script>\n'
                    '<script defer src="native-bridge.js"></script>')
open(os.path.join(WEB, 'index.html'), 'w', encoding='utf-8').write(html)

# ---------- 5. native-bridge.js：导出 / 主题 / 路由 / 返回 ----------
bridge = r"""/* ===== 家当 Android 原生桥接层（仅 APK 内加载） =====
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
"""
open(os.path.join(WEB, 'native-bridge.js'), 'w', encoding='utf-8').write(bridge)

# ---------- 6. 生成全套图标（统一由 icons.py 纯几何自绘） ----------
icons.make_pwa_icons(os.path.join(SRC, 'icons'))
if os.path.isdir(os.path.join(SRC, 'app-preview')):
    icons.make_pwa_icons(os.path.join(SRC, 'app-preview', 'icons'))
icons.make_android_icons(os.path.join(BUILD, 'res'))

res = os.path.join(BUILD, 'res')
val = os.path.join(res, 'values')
os.makedirs(val, exist_ok=True)
open(os.path.join(val, 'strings.xml'), 'w', encoding='utf-8').write(
    '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
    '  <string name="app_name">家当</string>\n'
    '</resources>\n')
open(os.path.join(val, 'colors.xml'), 'w').write(
    '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
    '  <color name="ic_bg">#F6F2EA</color>\n'
    '  <color name="bg_warm">#F6F2EA</color>\n'
    '</resources>\n')
open(os.path.join(val, 'styles.xml'), 'w').write(
    '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
    '  <style name="AppTheme" parent="@android:style/Theme.Material.Light.NoActionBar">\n'
    '    <item name="android:windowNoTitle">true</item>\n'
    '    <item name="android:windowActionBar">false</item>\n'
    '    <item name="android:windowBackground">@color/bg_warm</item>\n'
    '    <item name="android:statusBarColor">@android:color/transparent</item>\n'
    '    <item name="android:navigationBarColor">@android:color/transparent</item>\n'
    '    <item name="android:windowLightStatusBar">true</item>\n'
    '    <item name="android:windowTranslucentStatus">false</item>\n'
    '    <item name="android:windowTranslucentNavigation">false</item>\n'
    '    <item name="android:windowDrawsSystemBarBackgrounds">true</item>\n'
    '    <item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>\n'
    '    <item name="android:enforceStatusBarContrast">false</item>\n'
    '    <item name="android:enforceNavigationBarContrast">false</item>\n'
    '  </style>\n'
    '</resources>\n')

# ---------- 7. AndroidManifest.xml ----------
open(os.path.join(BUILD, 'AndroidManifest.xml'), 'w', encoding='utf-8').write(
    '<?xml version="1.0" encoding="utf-8"?>\n'
    '<manifest xmlns:android="http://schemas.android.com/apk/res/android"\n'
    '    package="cn.jiadang.app"\n'
    '    android:versionCode="1"\n'
    '    android:versionName="1.0">\n'
    '  <uses-sdk android:minSdkVersion="24" android:targetSdkVersion="34"/>\n'
    '  <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"\n'
    '      android:maxSdkVersion="28"/>\n'
    '  <application\n'
    '      android:label="@string/app_name"\n'
    '      android:icon="@mipmap/ic_launcher"\n'
    '      android:roundIcon="@mipmap/ic_launcher_round"\n'
    '      android:theme="@style/AppTheme"\n'
    '      android:allowBackup="true"\n'
    '      android:hardwareAccelerated="true"\n'
    '      android:supportsRtl="true"\n'
    '      android:resizeableActivity="false">\n'
    '    <activity\n'
    '        android:name=".MainActivity"\n'
    '        android:exported="true"\n'
    '        android:label="@string/app_name"\n'
    '        android:screenOrientation="portrait"\n'
    '        android:launchMode="singleTask"\n'
    '        android:windowSoftInputMode="adjustResize"\n'
    '        android:configChanges="orientation|screenSize|screenLayout|keyboardHidden|smallestScreenSize|uiMode|density">\n'
    '      <intent-filter>\n'
    '        <action android:name="android.intent.action.MAIN"/>\n'
    '        <category android:name="android.intent.category.LAUNCHER"/>\n'
    '      </intent-filter>\n'
    '    </activity>\n'
    '  </application>\n'
    '</manifest>\n')

print('prepare OK')
print('  font_localized =', font_ok)
print('  web files      =', len([x for x in os.listdir(WEB) if os.path.isfile(os.path.join(WEB, x))]))
print('  js files       =', len(os.listdir(os.path.join(WEB, 'js'))))
print('  css sa-top     =', css.count('var(--sa-top'))
print('  css sa-bottom  =', css.count('var(--sa-bottom'))
print('  manifest bytes =', os.path.getsize(os.path.join(BUILD, 'AndroidManifest.xml')))
