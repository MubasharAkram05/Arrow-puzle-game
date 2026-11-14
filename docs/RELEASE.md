# Releasing Arrow Expert on Google Play

Step-by-step for Kali Linux. The app is built by the **android-release** GitHub Actions workflow; your
computer only needs Java's `keytool` (to make the signing key once) and a browser.

| Thing             | Value                                                   |
| ----------------- | ------------------------------------------------------- |
| Package ID        | `com.sussal.arrowexpert`                                |
| versionName       | `version` in `package.json` (e.g. `3.25.0`)             |
| versionCode       | `androidVersionCode` in `package.json` (starts at `1`)  |
| Target SDK        | 36 (`android/variables.gradle`)                         |
| Privacy policy    | https://mubasharakram05.github.io/arrow-expert/privacy/ |
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
- Never put the `.jks` file in the repo. `.gitignore` blocks `*.jks` and `*.keystore` to help. The only
  exception is `android/app/debug.keystore`, the public debug key (see section 4).

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

**Debug key.** Every debug APK (from the workflow or from Android Studio) is signed with the same fixed debug
key, `android/app/debug.keystore`, so a new debug APK installs **over** the old one and keeps your progress
(levels, coins, settings). The workflow checks it: the "Verify the APK" step fails if a debug APK is signed with
any other certificate than SHA-256 `872feba347c32ef53557e464b65829cddbf46d37eb60e43c7715d535e049dd84`.

- That key is only for test phones. Its passwords are Android's public defaults (`android` / `androiddebugkey`),
  so it is fine in the repo. Never use it for Google Play.
- The release AAB is still signed with your upload key from GitHub Secrets (section 2), never with the debug key.
- Debug APKs built before the fixed key was added (13 Nov 2026, PR #24) were signed with a random key per
  build: uninstall that one once, then every later debug APK updates in place.
- The debug APK and the Play version have different signatures: uninstall one before installing the other
  (uninstalling clears the progress saved on the phone).

**Check the APK before installing.** The run's summary (and the "Verify the APK" step log) shows the APK's
size and SHA-256, and the zip also has an `arrow-expert-<version>-debug.apk.sha256` file. A file of a different
size is an incomplete download and gives "There was a problem parsing the package" on the phone. Compare:

```bash
sha256sum -c arrow-expert-3.26.0-debug.apk.sha256      # Linux / macOS (shasum -a 256 -c on macOS)
certutil -hashfile arrow-expert-3.26.0-debug.apk SHA256  # Windows
```

On a phone, download the zip with the browser while signed in to GitHub, wait until the download is complete,
unzip it with the Files app, then open the `.apk` (not the `.zip`, not the `.sha256`). Every APK the workflow
builds is checked with `apksigner verify` (v2 signature), `aapt2 dump badging` (not testOnly) and the
Android 12 `android:exported` rule (`scripts/verify-apk.sh`), and the `artifact-check` job downloads the
artifact again and compares the SHA-256, so a failed check stops the run instead of producing a broken APK.

## 5. Upload to Google Play (first time)

1. Play Console > **Create app**: name "Arrow Expert", game, free.
2. **Setup > App integrity**: keep **Play App Signing** on (Google manages the app signing key; your
   upload key from step 1 signs the uploads).
3. **Testing > Internal testing > Create new release**: upload the `.aab`, add release notes, save, roll out
   to your testers.
4. **Store listing**: text from `store-assets/listing.md`, icon `store-assets/play/icon-512.png`,
   screenshots from `store-assets/screenshots/`, feature graphic `store-assets/play/feature-graphic.png`.
5. **App content**: privacy policy URL https://mubasharakram05.github.io/arrow-expert/privacy/, ads: **yes**,
   Advertising ID: **yes** (section 7),
   content rating questionnaire (notes in `store-assets/listing.md`), target audience, data safety: no data
   collected or shared.
6. When internal testing looks good, promote the release to Closed or Production.

## 6. The next release

Every upload to Google Play needs a **higher versionCode** than the one before.

1. In `package.json`, raise `androidVersionCode` by 1 (1 -> 2 -> 3 ...) and set `version` to the new
   version name (e.g. `3.26.0`). Add a CHANGELOG entry.
2. Commit, open a PR, merge it into `main`.
3. Tag and push: `git tag v3.26.0 && git push origin v3.26.0` (or run the workflow by hand).
4. Download the new AAB and upload it as a new release in the Play Console.

## 7. Ads (Google AdMob)

The app has Google AdMob (3.26.0, `src/ads/`). It ships with **test ads only**: `releaseAds` is `false` in
`src/ads.config.json`, so every build uses Google's official test IDs. Test ads show a "Test Ad" label and earn
nothing; you can click them safely.

| Build                               | Ad IDs                                                      |
| ----------------------------------- | ----------------------------------------------------------- |
| dev server (`npm run dev`)          | simulated ads drawn in the page (to try the flows)          |
| Vercel preview and production (web) | no ads                                                      |
| debug APK (workflow)                | Google test IDs, always                                     |
| release AAB, `releaseAds: false`    | Google test IDs                                             |
| release AAB, `releaseAds: true`     | your real IDs (no ads at all while one is still `REAL_...`) |

### Switch to real ads (when you are ready)

1. **AdMob account** at https://admob.google.com (use the same Google account as the Play Console if you can).
2. **Add the app:** Apps > Add app > Android. If the app is not on Google Play yet, choose "No" for now and
   link it to the store listing later. You get an **App ID** like `ca-app-pub-1234567890123456~1234567890`.
3. **Create 2 ad units** in that app: **Interstitial** and **Rewarded** (the game shows no banners,
   `BANNER_ENABLED = false` in `src/config.js`). Each has an ID like
   `ca-app-pub-1234567890123456/1234567890`.
4. **Consent message (EEA/UK):** Privacy & messaging > European regulations (GDPR) > create a message for the app
   and **publish** it. Without a published message, Google's consent form cannot show, and EEA/UK players get
   no personalised ads. Also check "US state regulations" if you want that message.
5. **Content rating:** Blocking controls > Content rating: set the maximum ad content rating (G or PG fits this
   game).
6. **Put your IDs in `src/ads.config.json`**: replace `REAL_APP_ID`,
   `REAL_INTERSTITIAL_ID` and `REAL_REWARDED_ID`, and set `"releaseAds": true`. Commit, merge, then build the
   release AAB (section 3). The debug APK keeps the test IDs.
7. **Never click your own real ads.** To see real ads on your phone without risk, add the phone as a test device
   in AdMob (Settings > Test devices); the advertising ID is in Android Settings > Google > Ads.

### Play Console settings for ads

- **App content > Ads:** "Yes, my app contains ads".
- **App content > Advertising ID:** "Yes", used for **Advertising or marketing** (and Analytics / Fraud prevention).
  The app declares the `com.google.android.gms.permission.AD_ID` permission in `AndroidManifest.xml`; Google Play
  requires it for apps that target Android 13+ and use the advertising ID.
- **App content > Data safety:** declare that the app collects and shares **Device or other IDs** (advertising ID),
  plus what Google's AdMob guide lists (approximate location, app interactions, diagnostics), for advertising,
  analytics and fraud prevention. The notes are in `store-assets/listing.md`.
- **Privacy policy:** https://mubasharakram05.github.io/arrow-expert/privacy/ (Sussal Productions website). It
  describes AdMob, UMP consent, local-only progress, no account, no data sold, and that the game is not directed
  at children under 13. The same text stays at https://arrow-puzle-game.vercel.app/privacy.html (and inside the
  app, Credits > Privacy policy) as a backup.
- **Target audience:** if you select ages under 13, Google's Families policy applies (certified ad SDKs,
  child-directed ad settings). Choosing 13+ keeps the current setup simple.

### app-ads.txt (once real ads are on)

`app-ads.txt` tells ad buyers that your AdMob account may sell ads in your app. Without it, ads still work but can
earn less.

1. In AdMob: Apps > View all apps > app-ads.txt, copy your line. It looks like:
   `google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0`
2. Put that line in a file `public/app-ads.txt` (Vite copies it to the site root), commit and merge, so it is
   served at https://arrow-puzle-game.vercel.app/app-ads.txt.
3. In the Play Console store listing, set **Website** (developer contact) to `https://arrow-puzle-game.vercel.app`.
   AdMob looks for `app-ads.txt` at the root of that website. A custom domain of your own works the same way and is
   more reliable long term.
4. AdMob checks it within about 24 hours (Apps > app-ads.txt shows the status).

### Checking test ads on a phone (debug APK)

- **Ad debug panel:** Settings, tap the version line ("Version 3.26.0") 7 times. It shows the SDK start, the
  consent status, and for interstitial / rewarded: loading, loaded or failed with Google's error code and
  message, plus the next retry. "Retry failed loads now" tries again at once. Only in debug builds.
- **Logcat:** with USB debugging on, `adb logcat -s ArrowAds` shows the same lines (for example
  `consent NOT_REQUIRED canRequest=true npa=false`, `rewarded loaded`, `interstitial failed code=3 "No fill."`).
  Google's own SDK messages: `adb logcat -s Ads`.
- **Consent:** the panel shows Google UMP's answer (status, form available, canRequestAds, the error if the
  request failed or did not answer within 8 s) and what the game decided. Test builds never let a failed or
  UNKNOWN consent check block ads (non-personalised test ads); release builds try 3 times, then fall back to
  non-personalised ads. A REQUIRED consent that was not given always blocks ads.
- **Testing the consent form (EEA):** UMP applies a debug geography only on a test device. Run
  `adb logcat -s UserMessagingPlatform`, open the app, and copy the ID from the line
  `Use new ConsentDebugSettings.Builder().addTestDeviceHashedId("…")`. In the panel, paste it into
  "Test device ID", pick **EEA**, then tap **Reset consent & show form**: the consent form should appear. Pick
  **Not EEA** (or Off) and reset again to go back.
- Common error codes: 0 internal error, 1 invalid request (wrong ad unit ID), 2 network error, 3 no fill (no ad
  to show right now, normal now and then).
- Test ads say "Test Ad". There are no banner ads (`BANNER_ENABLED = false`).

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
