# Releasing Arrow Expert on Google Play

Step-by-step for Kali Linux. The app is built by the **android-release** GitHub Actions workflow; your
computer only needs Java's `keytool` (to make the signing key once) and a browser.

| Thing             | Value                                                   |
| ----------------- | ------------------------------------------------------- |
| Package ID        | `com.sussal.arrowexpert`                                |
| versionName       | `version` in `package.json` (e.g. `3.25.0`)             |
| versionCode       | `androidVersionCode` in `package.json` (starts at `1`)  |
| Target SDK        | 36 (`android/variables.gradle`)                         |
| Privacy policy    | https://arrow-puzle-game.vercel.app/privacy.html        |
| Release web build | `npm run build:release` (TEST_UNLOCK_ALL is always off) |

## 1. Make the upload keystore (once)

Google Play signs the app for users with its own key (Play App Signing). You sign each upload with an
**upload key** that only you have. Make it once and keep it safe.

```bash
sudo apt update && sudo apt install -y openjdk-21-jdk-headless   # gives you keytool
mkdir -p ~/keys && cd ~/keys
keytool -genkeypair -v \
  -keystore arrow-expert-upload.jks \
  -alias upload \
  -keyalg RSA -keysize 2048 -validity 10000
```

- `keytool` asks for a **keystore password**, then your name and organisation (e.g. "Sussal Productions"),
  then a **key password** (pressing Enter reuses the keystore password).
- Write both passwords and the alias (`upload`) in a password manager.
- **Back up `arrow-expert-upload.jks`** (password manager, encrypted USB drive). If you lose it, Google can
  reset the upload key, but only after a support request and a waiting period.
- Never put the `.jks` file in the repo. `.gitignore` blocks `*.jks` and `*.keystore` to help.

Check it:

```bash
keytool -list -v -keystore ~/keys/arrow-expert-upload.jks -alias upload
```

## 2. Add the 4 GitHub Secrets (once)

Turn the keystore into one line of text:

```bash
base64 -w0 ~/keys/arrow-expert-upload.jks > ~/keys/keystore.b64
cat ~/keys/keystore.b64    # copy all of it
```

On GitHub: the repository, **Settings > Secrets and variables > Actions > New repository secret**. Add:

| Secret name                 | Value                               |
| --------------------------- | ----------------------------------- |
| `ANDROID_KEYSTORE_BASE64`   | the whole content of `keystore.b64` |
| `ANDROID_KEYSTORE_PASSWORD` | the keystore password               |
| `ANDROID_KEY_ALIAS`         | `upload`                            |
| `ANDROID_KEY_PASSWORD`      | the key password                    |

(With the GitHub CLI instead: `gh secret set ANDROID_KEYSTORE_BASE64 < ~/keys/keystore.b64`, and
`gh secret set ANDROID_KEYSTORE_PASSWORD` etc., which ask for the value.)

Then delete the text copy: `rm ~/keys/keystore.b64`.

## 3. Build the app

**Option A: from the Actions tab.** On GitHub: **Actions > android-release > Run workflow**, choose the
branch (`main`), then:

- `build`: `both` (release AAB + debug APK), `release-aab` or `debug-apk`
- `debug_test_mode`: tick it only if you want the debug APK to unlock every level (TEST MODE badge)

**Option B: with a version tag** (builds both):

```bash
git checkout main && git pull
git tag v3.25.0
git push origin v3.25.0
```

The run takes about 5-10 minutes. If a secret is missing, the run stops at "Check the signing secrets" and
names it.

## 4. Download the AAB (and the APK)

Open the finished run (**Actions > android-release > the run**). At the bottom, under **Artifacts**:

- `arrow-expert-3.25.0-1-release-aab`: a zip with `arrow-expert-3.25.0-1.aab`, the file for Google Play
- `arrow-expert-3.25.0-debug-apk`: a zip with the debug APK for your phone

Unzip with `unzip <file>.zip`.

**Install the debug APK on your phone:** copy it to the phone and open it (allow "Install unknown apps"
for your file manager), or with USB debugging on:

```bash
sudo apt install -y adb
adb install -r arrow-expert-3.25.0-debug.apk
```

The debug APK has a different signature than the Play version: uninstall one before installing the other.

## 5. Upload to Google Play (first time)

1. Play Console > **Create app**: name "Arrow Expert", game, free.
2. **Setup > App integrity**: keep **Play App Signing** on (Google manages the app signing key; your
   upload key from step 1 signs the uploads).
3. **Testing > Internal testing > Create new release**: upload the `.aab`, add release notes, save, roll out
   to your testers.
4. **Store listing**: text from `store-assets/listing.md`, icon `store-assets/play/icon-512.png`,
   screenshots from `store-assets/screenshots/` (feature graphic still to make).
5. **App content**: privacy policy URL https://arrow-puzle-game.vercel.app/privacy.html, ads: no,
   content rating questionnaire (notes in `store-assets/listing.md`), target audience, data safety: no data
   collected or shared.
6. When internal testing looks good, promote the release to Closed or Production.

Before the first upload, replace `CONTACT_EMAIL` in `public/privacy.html` with your real email and merge it,
so the live privacy page shows it.

## 6. The next release

Every upload to Google Play needs a **higher versionCode** than the one before.

1. In `package.json`, raise `androidVersionCode` by 1 (1 -> 2 -> 3 ...) and set `version` to the new
   version name (e.g. `3.26.0`). Add a CHANGELOG entry.
2. Commit, open a PR, merge it into `main`.
3. Tag and push: `git tag v3.26.0 && git push origin v3.26.0` (or run the workflow by hand).
4. Download the new AAB and upload it as a new release in the Play Console.

## Notes

- **Release build:** the web app is built with `npm run build:release`. TEST_UNLOCK_ALL is always off
  there, so the TEST MODE badge never shows. The workflow checks `dist/index.html` for
  `test-unlock=false`.
- **Where TEST_UNLOCK_ALL is on:** only the dev server, the tests and Vercel preview deployments
  (`scripts/build-flags.mjs`). It is off on the live web game (Vercel production).
- **Android project:** the native project is in `android/` (generated by `npx cap add android`). App icons
  and splash images come from `npm run assets`, which copies `store-assets/android/res` into it.
- **Screen and controls:** the app is locked to portrait, and keeps the screen on only during a level.
  The Android back button works as in the web app.
- **Large screens:** Android 16 (SDK 36) ignores the portrait lock on large screens (tablets, foldables
  over 600 dp). The game layout already works in any shape there.
