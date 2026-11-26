#!/usr/bin/env bash
# 家当 Android APK 手工构建（纯 AOSP 工具链，无 Gradle / 无 AndroidX / 无网络依赖）
set -e

BUILD="$(cd "$(dirname "$0")" && pwd)"
SDK="${ANDROID_HOME:-/opt/android-sdk}"
BT=$SDK/build-tools/34.0.0
JAR=$SDK/platforms/android-34/android.jar
OUT="$(cd "$BUILD/.." && pwd)/家当-v1.0.apk"

cd "$BUILD"
rm -rf compiled classes dex gen unsigned.apk aligned.apk "$OUT"
mkdir -p compiled classes dex gen

echo "== 1) aapt2 compile 资源 =="
"$BT/aapt2" compile --dir res -o compiled/ 2>&1 | tail -5

echo "== 2) aapt2 link 生成基础 APK =="
FLATS=$(find compiled -name '*.flat' | sort | tr '\n' ' ')
"$BT/aapt2" link \
  -o unsigned.apk \
  -I "$JAR" \
  --manifest AndroidManifest.xml \
  --java gen \
  --min-sdk-version 24 --target-sdk-version 34 \
  --version-code 1 --version-name "1.0" \
  -A assets \
  --auto-add-overlay \
  $FLATS 2>&1 | tail -20

echo "== 3) javac 编译 Activity =="
javac -source 8 -target 8 -encoding UTF-8 \
  -bootclasspath "$JAR" \
  -cp "$JAR" \
  -d classes \
  src/cn/jiadang/app/MainActivity.java 2>&1 | grep -v 'bootstrap class path' | grep -v '^warning' || true

echo "== 4) d8 生成 classes.dex =="
CLASSES=$(find classes -name '*.class' | sort | tr '\n' ' ')
"$BT/d8" --lib "$JAR" --min-api 24 --output dex $CLASSES 2>&1 | tail -20
ls -la dex/classes.dex

echo "== 5) 把 dex 加入 APK =="
cd dex && zip -q -X ../unsigned.apk classes.dex && cd ..
echo "APK 内容："
unzip -l unsigned.apk | grep -E 'classes.dex|resources.arsc|AndroidManifest.xml|assets/web/index.html|assets/web/app.css' 

echo "== 6) zipalign 对齐 =="
"$BT/zipalign" -f -p 4 unsigned.apk aligned.apk
"$BT/zipalign" -c -v 4 aligned.apk | tail -3

echo "== 7) 生成签名密钥并签名 =="
if [ ! -f app.keystore ]; then
  keytool -genkeypair -v -keystore app.keystore \
    -alias jiadang -keyalg RSA -keysize 2048 -validity 10950 \
    -storepass jiadang2026 -keypass jiadang2026 \
    -dname "CN=Jiadang, OU=Personal, O=Jiadang, L=China, ST=China, C=CN" 2>&1 | tail -3
fi
"$BT/apksigner" sign \
  --ks app.keystore --ks-pass pass:jiadang2026 --key-pass pass:jiadang2026 \
  --min-sdk-version 24 \
  --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true \
  --out "$OUT" aligned.apk

echo "== 8) 校验签名 =="
"$BT/apksigner" verify --verbose "$OUT" 2>&1 | head -20

echo "== 完成 =="
ls -lh "$OUT"
echo "--- badging ---"
"$BT/aapt" dump badging "$OUT" 2>/dev/null | head -12
