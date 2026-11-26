package cn.jiadang.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Insets;
import android.Manifest;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.DisplayCutout;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * 家当 Android 安装版 —— 原生 WebView 壳
 *
 * · 所有界面资源打包在 assets/web，通过虚拟 https 域拦截读取（离线、稳定 origin、localStorage 可持久）
 * · 沉浸式状态栏 / 导航栏，实测 WindowInsets 注入 CSS 变量 --sa-* 避开状态栏、挖孔、手势小白条
 * · 主题切换同步系统栏图标深浅色
 * · 桥接：导出文件写入「下载」、<input type=file> 选图/选备份、返回键按页面逻辑回退
 */
public class MainActivity extends Activity {

    private static final String HOST = "jiadang.app";
    private static final String BASE = "https://" + HOST + "/";
    private static final int REQ_FILE = 1001;
    private static final int REQ_PERM = 1002;

    private WebView web;
    private ValueCallback<Uri[]> filePathCallback;
    private long lastBack = 0L;

    /* dp 值，供 CSS 变量使用 */
    private volatile float saTop = 0f, saBottom = 0f, saLeft = 0f, saRight = 0f;
    private volatile String theme = "teal";
    private volatile String currentHash = "#/home";

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        setupWindow();
        measureFallbackInsets();

        web = new WebView(this);
        setContentView(web);
        configureWebView();

        /* 首帧就把安全区值带进 URL，零闪烁、零遮挡；随后由 WindowInsets 精确覆盖 */
        String url = BASE + "index.html?sa=" + saTop + "," + saBottom + "," + saLeft + "," + saRight;
        web.loadUrl(url);

        if (Build.VERSION.SDK_INT < 29 &&
                checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE)
                        != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, REQ_PERM);
        }
    }

    /* ------------------------------------------------------------------ */
    /* 沉浸式 + 安全区                                                      */
    /* ------------------------------------------------------------------ */
    private void setupWindow() {
        Window w = getWindow();
        w.setStatusBarColor(Color.TRANSPARENT);
        w.setNavigationBarColor(Color.TRANSPARENT);

        if (Build.VERSION.SDK_INT >= 28) {
            WindowManager.LayoutParams lp = w.getAttributes();
            lp.layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            w.setAttributes(lp);
        }
        if (Build.VERSION.SDK_INT >= 30) {
            w.setDecorFitsSystemWindows(false);
        } else {
            w.getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        }

        final View decor = w.getDecorView();
        decor.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener() {
            @Override
            public WindowInsets onApplyWindowInsets(View v, WindowInsets in) {
                int t, b, l, r;
                if (Build.VERSION.SDK_INT >= 30) {
                    Insets i = in.getInsets(
                            WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                    t = i.top; b = i.bottom; l = i.left; r = i.right;
                } else {
                    t = in.getSystemWindowInsetTop();
                    b = in.getSystemWindowInsetBottom();
                    l = in.getSystemWindowInsetLeft();
                    r = in.getSystemWindowInsetRight();
                    if (Build.VERSION.SDK_INT >= 28) {
                        DisplayCutout c = in.getDisplayCutout();
                        if (c != null) {
                            t = Math.max(t, c.getSafeInsetTop());
                            b = Math.max(b, c.getSafeInsetBottom());
                            l = Math.max(l, c.getSafeInsetLeft());
                            r = Math.max(r, c.getSafeInsetRight());
                        }
                    }
                }
                float d = getResources().getDisplayMetrics().density;
                saTop = t / d; saBottom = b / d; saLeft = l / d; saRight = r / d;
                pushSafeArea();
                return in;
            }
        });
        applyBars();
    }

    /** 兜底值：某些机型 insets 回调迟于首帧，用系统资源尺寸先顶上 */
    private void measureFallbackInsets() {
        float d = getResources().getDisplayMetrics().density;
        int statusPx = sysDim("status_bar_height", 24);
        int navPx = sysDim("navigation_bar_height", 0);
        if (navPx <= 0) navPx = (int) (14 * d);   // 手势小白条典型值
        saTop = statusPx / d;
        saBottom = navPx / d;
    }

    private int sysDim(String name, int defDp) {
        try {
            int id = getResources().getIdentifier(name, "dimen", "android");
            if (id > 0) return getResources().getDimensionPixelSize(id);
        } catch (Exception ignored) { }
        return (int) (defDp * getResources().getDisplayMetrics().density);
    }

    private void pushSafeArea() {
        final String js = "(function(){var s=document.documentElement.style;"
                + "s.setProperty('--sa-top','" + saTop + "px');"
                + "s.setProperty('--sa-bottom','" + saBottom + "px');"
                + "s.setProperty('--sa-left','" + saLeft + "px');"
                + "s.setProperty('--sa-right','" + saRight + "px');})()";
        runOnUiThread(new Runnable() {
            @Override public void run() {
                if (web != null) web.evaluateJavascript(js, null);
            }
        });
    }

    /** 浅色主题用深色状态栏图标，夜墨主题用浅色图标 */
    private void applyBars() {
        boolean dark = "night".equals(theme);
        int f = View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION;
        if (!dark) {
            f |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            if (Build.VERSION.SDK_INT >= 26) f |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        }
        getWindow().getDecorView().setSystemUiVisibility(f);
    }

    /* ------------------------------------------------------------------ */
    /* WebView                                                             */
    /* ------------------------------------------------------------------ */
    @SuppressLint("SetJavaScriptEnabled")
    private void configureWebView() {
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);              // localStorage 持久化
        s.setDatabaseEnabled(true);
        s.setAllowContentAccess(true);
        s.setAllowFileAccess(false);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setDefaultTextEncodingName("utf-8");
        s.setCacheMode(WebSettings.LOAD_NO_CACHE);
        if (Build.VERSION.SDK_INT >= 21) s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        web.setBackgroundColor(Color.parseColor("#F6F2EA"));
        web.addJavascriptInterface(new Bridge(), "JD");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest req) {
                return serve(req.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
                /* 所有内部导航（含 hash 路由）都留在 WebView 内；外链交给系统浏览器 */
                Uri u = req.getUrl();
                if (u != null && HOST.equals(u.getHost())) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) { }
                return true;
            }

            @Override
            public void onPageFinished(WebView v, String url) {
                pushSafeArea();
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb,
                                             FileChooserParams params) {
                if (filePathCallback != null) filePathCallback.onReceiveValue(null);
                filePathCallback = cb;
                try {
                    Intent i = params.createIntent();
                    i.addCategory(Intent.CATEGORY_OPENABLE);
                    i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                    startActivityForResult(Intent.createChooser(i, "选择文件"), REQ_FILE);
                    return true;
                } catch (Exception e) {
                    filePathCallback = null;
                    return false;
                }
            }
        });
    }

    /** 把虚拟域请求映射到 assets/web，纯离线、origin 固定 */
    private WebResourceResponse serve(Uri u) {
        if (u == null || !HOST.equals(u.getHost())) return null;
        String path = u.getPath();
        if (path == null || path.isEmpty() || path.equals("/")) path = "/index.html";
        if (path.startsWith("/")) path = path.substring(1);
        if (path.contains("..")) return null;

        try {
            InputStream in = getAssets().open("web/" + path);
            Map<String, String> h = new HashMap<String, String>();
            h.put("Access-Control-Allow-Origin", "*");
            h.put("Cache-Control", "no-store");
            return new WebResourceResponse(mime(path), "UTF-8", 200, "OK", h, in);
        } catch (IOException e) {
            if ("sw.js".equals(path)) {
                /* APP 资源全在本地，不需要 Service Worker；让注册失败并被前端 catch 吞掉 */
                return new WebResourceResponse("application/javascript", "UTF-8",
                        404, "Not Found", new HashMap<String, String>(),
                        new ByteArrayInputStream(new byte[0]));
            }
            return new WebResourceResponse("text/plain", "UTF-8",
                    404, "Not Found", new HashMap<String, String>(),
                    new ByteArrayInputStream(new byte[0]));
        }
    }

    private static String mime(String p) {
        p = p.toLowerCase();
        if (p.endsWith(".html") || p.endsWith(".htm")) return "text/html";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".js")) return "application/javascript";
        if (p.endsWith(".json") || p.endsWith(".webmanifest")) return "application/manifest+json";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".woff2")) return "font/woff2";
        if (p.endsWith(".woff")) return "font/woff";
        return "application/octet-stream";
    }

    /* ------------------------------------------------------------------ */
    /* JS 桥接                                                             */
    /* ------------------------------------------------------------------ */
    private final class Bridge {

        @JavascriptInterface
        public void setTheme(String t) {
            theme = (t == null || t.length() == 0) ? "teal" : t;
            runOnUiThread(new Runnable() {
                @Override public void run() { applyBars(); }
            });
        }

        @JavascriptInterface
        public void onHash(String h) {
            currentHash = h == null ? "#/home" : h;
        }

        @JavascriptInterface
        public void onReady() {
            pushSafeArea();
        }

        @JavascriptInterface
        public void saveFile(final String name, final String b64, final String mime) {
            new Thread(new Runnable() {
                @Override public void run() {
                    try {
                        byte[] data = Base64.decode(b64, Base64.DEFAULT);
                        writeDownload(name, data, mime);
                        showToast("已保存到「下载」：" + name);
                    } catch (Exception e) {
                        showToast("保存失败：" + e.getMessage());
                    }
                }
            }).start();
        }
    }

    private void writeDownload(String name, byte[] data, String mimeType) throws IOException {
        String safe = name.replaceAll("[\\\\/:*?\"<>|]", "_");
        String m = (mimeType == null || mimeType.length() == 0)
                ? "application/octet-stream" : mimeType;

        if (Build.VERSION.SDK_INT >= 29) {
            ContentValues cv = new ContentValues();
            cv.put(MediaStore.Downloads.DISPLAY_NAME, safe);
            cv.put(MediaStore.Downloads.MIME_TYPE, m);
            cv.put(MediaStore.Downloads.IS_PENDING, 1);
            Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
            if (uri == null) throw new IOException("无法创建下载文件");
            OutputStream os = getContentResolver().openOutputStream(uri);
            if (os == null) throw new IOException("无法写入下载文件");
            os.write(data);
            os.flush();
            os.close();
            ContentValues done = new ContentValues();
            done.put(MediaStore.Downloads.IS_PENDING, 0);
            getContentResolver().update(uri, done, null, null);
        } else {
            File dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
            if (!dir.exists() && !dir.mkdirs()) dir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
            if (dir == null) throw new IOException("下载目录不可用");
            File f = new File(dir, safe);
            FileOutputStream fos = new FileOutputStream(f);
            fos.write(data);
            fos.flush();
            fos.close();
        }
    }

    private void showToast(final String msg) {
        runOnUiThread(new Runnable() {
            @Override public void run() {
                Toast.makeText(MainActivity.this, msg, Toast.LENGTH_SHORT).show();
            }
        });
    }

    /* ------------------------------------------------------------------ */
    /* 文件选择 / 返回键                                                    */
    /* ------------------------------------------------------------------ */
    @Override
    protected void onActivityResult(int req, int resultCode, Intent data) {
        if (req == REQ_FILE) {
            if (filePathCallback == null) return;
            Uri[] result = null;
            if (resultCode == RESULT_OK && data != null) {
                if (data.getClipData() != null) {
                    int n = data.getClipData().getItemCount();
                    result = new Uri[n];
                    for (int i = 0; i < n; i++) result[i] = data.getClipData().getItemAt(i).getUri();
                } else if (data.getData() != null) {
                    result = new Uri[]{data.getData()};
                }
            }
            filePathCallback.onReceiveValue(result);
            filePathCallback = null;
            return;
        }
        super.onActivityResult(req, resultCode, data);
    }

    @Override
    public void onBackPressed() {
        if (web == null) { super.onBackPressed(); return; }
        web.evaluateJavascript(
                "(function(){return (window.__JD_BACK__ && window.__JD_BACK__()) ? 1 : 0;})()",
                new ValueCallback<String>() {
                    @Override public void onReceiveValue(String value) {
                        if ("1".equals(value)) return;   // 关弹层或回退页面，已消费
                        long now = System.currentTimeMillis();
                        if (now - lastBack < 2000) {
                            finish();
                        } else {
                            lastBack = now;
                            showToast("再按一次退出家当");
                        }
                    }
                });
    }
}
