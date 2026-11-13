#!/usr/bin/env bash
# Verify an APK is a real, installable APK (used by .github/workflows/android-release.yml on every built APK).
# Fails (exit 1) when the file is not a valid zip, the signature does not verify with APK Signature Scheme v2,
# aapt2 can't read it, android:testOnly is set, or a component with an intent-filter has no android:exported.
# Usage: scripts/verify-apk.sh app.apk   (needs ANDROID_HOME with build-tools installed)
set -euo pipefail
APK="$1"
TMP="${RUNNER_TEMP:-$(mktemp -d)}"
BT="${BUILD_TOOLS:-$(ls -d "$ANDROID_HOME"/build-tools/* | sort -V | tail -1)}"
echo "== $APK"
echo "size:   $(stat -c %s "$APK") bytes"
echo "sha256: $(sha256sum "$APK" | cut -d' ' -f1)"

echo "== zip integrity"
unzip -tq "$APK"

echo "== apksigner verify (build-tools $(basename "$BT"))"
if ! "$BT/apksigner" verify --verbose --print-certs "$APK" > "$TMP/apksigner.txt" 2>&1; then
  cat "$TMP/apksigner.txt"
  echo "::error::apksigner verify failed for $APK"
  exit 1
fi
grep -Ev '^WARNING: META-INF/' "$TMP/apksigner.txt" || true
# EXPECT_CERT_SHA256: the signer the APK must have (the fixed debug key for debug APKs)
if [ -n "${EXPECT_CERT_SHA256:-}" ]; then
  grep -q "certificate SHA-256 digest: $EXPECT_CERT_SHA256" "$TMP/apksigner.txt" || {
    echo "::error::$APK is not signed with the expected key (certificate SHA-256 $EXPECT_CERT_SHA256)"
    exit 1
  }
  echo "signer: the expected key ($EXPECT_CERT_SHA256)"
fi
grep -q 'Verified using v2 scheme (APK Signature Scheme v2): true' "$TMP/apksigner.txt" || {
  echo "::error::$APK is not signed with APK Signature Scheme v2"
  exit 1
}

echo "== aapt2 dump badging"
"$BT/aapt2" dump badging "$APK" > "$TMP/badging.txt"
grep -E "^(package|sdkVersion|minSdkVersion|targetSdkVersion|application-debuggable|testOnly|native-code)" "$TMP/badging.txt" || true
grep -qE "^(sdkVersion|minSdkVersion):" "$TMP/badging.txt" || {
  echo "::error::aapt2 shows no minSdkVersion for $APK"
  exit 1
}
if grep -q "^testOnly" "$TMP/badging.txt"; then
  echo "::error::$APK is a test-only build (android:testOnly), phones refuse to install it"
  exit 1
fi

echo "== merged manifest (exported / testOnly)"
"$BT/aapt2" dump xmltree --file AndroidManifest.xml "$APK" | python3 "$(dirname "$0")/check-apk-manifest.py"
echo "== $APK: OK"
