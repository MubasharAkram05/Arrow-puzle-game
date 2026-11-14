#!/usr/bin/env bash
# Android emulator smoke test (android-release workflow, "emulator" job), run on a booted emulator:
# install the debug APK, open it, play level 1 through the WebView (scripts/android-smoke.mjs), then save
# logcat and fail on a crash, an ANR or an app error line.
#   scripts/android-smoke.sh <apk> <output dir>
set -uo pipefail
APK="$1"
OUT="${2:-smoke}"
PKG=com.sussal.arrowexpert
mkdir -p "$OUT"

adb wait-for-device
adb logcat -c
adb install -r "$APK" || exit 1
adb shell am start -W -n "$PKG/.MainActivity" || exit 1
echo "Android $(adb shell getprop ro.build.version.release | tr -d '\r'), WebView $(adb shell dumpsys package com.google.android.webview | grep -m1 versionName | tr -d ' \r')"

# the WebView DevTools socket of the app (debug builds only)
SOCK=""
for _ in $(seq 1 60); do
  SOCK=$(adb shell cat /proc/net/unix | grep -o "webview_devtools_remote_[0-9]*" | head -1)
  [ -n "$SOCK" ] && break
  sleep 1
done
[ -n "$SOCK" ] || { echo "::error::no WebView DevTools socket (is WebView debugging on?)"; adb logcat -d > "$OUT/logcat.txt"; exit 1; }
adb forward tcp:9222 "localabstract:$SOCK"
for _ in $(seq 1 30); do curl -sf http://127.0.0.1:9222/json/version > /dev/null && break; sleep 1; done

# a hard limit, so a stuck WebView fails the job quickly instead of running into the job timeout
SMOKE_OUT="$OUT" timeout 900 node scripts/android-smoke.mjs
PLAY=$?

sleep 2
adb exec-out screencap -p > "$OUT/screen.png"
PID=$(adb shell pidof "$PKG" | tr -d '\r')
adb logcat -d > "$OUT/logcat.txt"
echo "app pid: ${PID:-not running}"

# crashes and ANRs anywhere, and error lines from the app's own process
BAD=$(grep -E "FATAL EXCEPTION|ANR in $PKG|Process: $PKG|AndroidRuntime: " "$OUT/logcat.txt")
APPERR=""
[ -n "$PID" ] && APPERR=$(grep -E "^[0-9-]+ [0-9:.]+ +$PID +[0-9]+ E " "$OUT/logcat.txt" | grep -v -E "eglCodecCommon|EGL_emulation|HostConnection|goldfish|gralloc" || true)
echo "--- crash / ANR lines ---"; echo "${BAD:-none}"
echo "--- app error lines (E) ---"; echo "${APPERR:-none}"
[ -z "$PID" ] && { echo "::error::the app is not running after the smoke test (crash?)"; exit 1; }
[ -n "$BAD" ] && { echo "::error::crash or ANR in logcat"; exit 1; }
exit "$PLAY"
