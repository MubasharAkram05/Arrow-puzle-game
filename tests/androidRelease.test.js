/**
 * Android release setup (3.25.0): the native project, signing from secrets, the workflow, the privacy policy.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const text = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const exists = (p) => existsSync(new URL(`../${p}`, import.meta.url));
const pkg = JSON.parse(text('package.json'));

describe('Android project', () => {
  it('package ID, SDK 36, versions from package.json, portrait', () => {
    const gradle = text('android/app/build.gradle');
    expect(gradle).toContain('applicationId "com.sussal.arrowexpert"');
    expect(gradle).toContain('versionCode pkg.androidVersionCode as int');
    expect(gradle).toContain('versionName pkg.version');
    expect(pkg.androidVersionCode).toBe(1);
    expect(text('android/variables.gradle')).toMatch(/targetSdkVersion = 36/);
    expect(text('android/app/src/main/AndroidManifest.xml')).toContain('android:screenOrientation="portrait"');
    expect(statSync(new URL('../android/gradlew', import.meta.url)).mode & 0o111).toBeTruthy();
  });

  it('release signing reads the keystore from environment variables only', () => {
    const gradle = text('android/app/build.gradle');
    for (const v of ['ANDROID_KEYSTORE_PATH', 'ANDROID_KEYSTORE_PASSWORD', 'ANDROID_KEY_ALIAS', 'ANDROID_KEY_PASSWORD'])
      expect(gradle).toContain(`System.getenv('${v}')`);
    const ignore = text('.gitignore');
    expect(ignore).toMatch(/^\*\.jks$/m);
    expect(ignore).toMatch(/^\*\.keystore$/m);
    expect(ignore).not.toMatch(/^\/?android\/$/m); // the native project is committed
  });

  it('debug builds use the one fixed debug key from the repo; release never does', () => {
    const gradle = text('android/app/build.gradle');
    const debugType = gradle.slice(
      gradle.indexOf('buildTypes {'),
      gradle.indexOf('release {', gradle.indexOf('buildTypes {')),
    );
    expect(debugType).toContain('signingConfig signingConfigs.debug');
    expect(gradle).toContain("storeFile file('debug.keystore')");
    const releaseType = gradle.slice(gradle.indexOf('release {', gradle.indexOf('buildTypes {')));
    expect(releaseType).toContain('signingConfig signingConfigs.release');
    expect(releaseType).not.toContain('signingConfigs.debug');
    expect(exists('android/app/debug.keystore')).toBe(true);
    // only that file is allowed past the *.keystore rule
    const exceptions = text('.gitignore').match(/^!.*(keystore|jks).*$/gm);
    expect(exceptions).toEqual(['!android/app/debug.keystore']);
  });

  // keytool starts a JVM: give it more than the 5 s default on a busy CI runner
  it('the workflow expects the certificate that is in android/app/debug.keystore', { timeout: 30_000 }, () => {
    const wf = text('.github/workflows/android-release.yml');
    const expected = wf.match(/EXPECT_CERT_SHA256: ([0-9a-f]{64})/)[1];
    const r = spawnSync(
      'keytool',
      ['-list', '-v', '-keystore', 'android/app/debug.keystore', '-storepass', 'android', '-alias', 'androiddebugkey'],
      { cwd: new URL('..', import.meta.url).pathname, encoding: 'utf8' },
    );
    expect(r.status, r.stderr).toBe(0);
    const sha = r.stdout
      .match(/SHA256: ([0-9A-F:]+)/)[1]
      .replaceAll(':', '')
      .toLowerCase();
    expect(sha).toBe(expected);
  });

  it('uses the generated icons and splash, with the splash theme merged', () => {
    const res = 'android/app/src/main/res';
    for (const d of ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'])
      for (const f of ['ic_launcher', 'ic_launcher_round', 'ic_launcher_foreground', 'ic_launcher_monochrome'])
        expect(exists(`${res}/mipmap-${d}/${f}.png`), `${d}/${f}`).toBe(true);
    expect(text(`${res}/mipmap-anydpi-v26/ic_launcher.xml`)).toContain('@mipmap/ic_launcher_monochrome');
    const styles = text(`${res}/values/styles.xml`);
    expect(styles).toContain('<item name="windowSplashScreenBackground">@color/splash_background</item>');
    expect(styles).toContain('<item name="windowSplashScreenAnimatedIcon">@drawable/splash_icon</item>');
    expect(styles).toContain('<item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>');
    expect(text(`${res}/values-night/splash_colors.xml`)).toContain('#0B1020');
    expect(text(`${res}/values/strings.xml`)).toContain('<string name="app_name">Arrow Expert</string>');
  });
});

describe('Android resource folders', () => {
  // the qualifiers we use, in the order Android requires (orientation, night mode, density, API version);
  // a wrong order (e.g. drawable-night-land-xxxhdpi) fails the Gradle build
  const ORDER = [
    /^(port|land)$/,
    /^(night|notnight)$/,
    /^(ldpi|mdpi|hdpi|xhdpi|xxhdpi|xxxhdpi|nodpi|anydpi)$/,
    /^v\d+$/,
  ];
  const valid = (dir) => {
    const [, ...qualifiers] = dir.split('-');
    let last = -1;
    for (const q of qualifiers) {
      const i = ORDER.findIndex((re) => re.test(q));
      if (i <= last) return false;
      last = i;
    }
    return true;
  };

  it('every res/ folder name has its qualifiers in Android order', () => {
    expect(valid('drawable-land-night-xxxhdpi')).toBe(true);
    expect(valid('drawable-night-land-xxxhdpi')).toBe(false);
    expect(valid('mipmap-anydpi-v26')).toBe(true);
    for (const root of ['store-assets/android/res', 'android/app/src/main/res'])
      for (const dir of readdirSync(new URL(`../${root}`, import.meta.url)))
        expect(valid(dir), `${root}/${dir}`).toBe(true);
  });
});

describe('android-release workflow', () => {
  const wf = text('.github/workflows/android-release.yml');

  it('manual trigger and version tags; signed release AAB and debug APK as artifacts', () => {
    expect(wf).toMatch(/workflow_dispatch:/);
    expect(wf).toMatch(/tags: \['v\*'\]/);
    expect(wf).toContain('npm run build:release');
    expect(wf).toContain("grep -q 'test-unlock=false' dist/index.html");
    expect(wf).toContain('npx cap sync android');
    expect(wf).toContain('./gradlew --no-daemon bundleRelease');
    expect(wf).toContain('./gradlew --no-daemon assembleDebug');
    // the AAB, the APK, and the emulator smoke test's logcat and screenshots
    expect(wf.match(/actions\/upload-artifact@v4/g)).toHaveLength(3);
    expect(wf).toContain('name: emulator-smoke-api${{ matrix.api-level }}');
    expect(wf).toMatch(/api-level: \[34, 36\]/);
  });

  it('emulator job: installs the debug APK, plays level 1 and checks logcat (not on version tags)', () => {
    const job = wf.slice(wf.indexOf('\n  emulator:'));
    expect(job).toContain("github.event_name != 'push'");
    expect(job).toContain('reactivecircus/android-emulator-runner@v2');
    expect(job).toContain('bash scripts/android-smoke.sh');
    // a setup failure (no smoke/started marker) is retried once; a failed test is never retried
    expect(job).toContain('continue-on-error: true');
    expect(job).toContain('if [ -f smoke/started ]; then');
    expect(job).toContain("if: steps.smoke1.outcome == 'failure' && steps.setupfail.outcome == 'success'");
    expect(text('scripts/android-smoke.sh')).toContain('touch "$OUT/started"');
    // the game's page is picked by its address, not as the first page (AdMob's ad WebViews share the process)
    const smoke = text('scripts/android-smoke.mjs');
    expect(smoke).toContain('APP_URL.test(t.url)');
    // taps carry a real finger's times (touchEnd 40 ms after touchStart), however late the page handles them
    expect(smoke).toContain("type: 'touchEnd', touchPoints: [], timestamp: down + 0.04");
    expect(smoke).not.toContain("targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);");
    const sh = text('scripts/android-smoke.sh');
    expect(sh).toContain('adb install -r');
    expect(sh).toContain('ANR in $PKG|Process: $PKG, PID'); // this app's crashes only, not the emulator's system apps
    expect(text('scripts/android-smoke.mjs')).toContain('#modal-victory.open');
  });

  it('reads the four signing secrets and never writes the keystore into the repo', () => {
    for (const s of [
      'ANDROID_KEYSTORE_BASE64',
      'ANDROID_KEYSTORE_PASSWORD',
      'ANDROID_KEY_ALIAS',
      'ANDROID_KEY_PASSWORD',
    ])
      expect(wf).toContain(`secrets.${s}`);
    expect(wf).toContain('ANDROID_KEYSTORE_PATH="$RUNNER_TEMP/upload.jks"');
    expect(exists('docs/RELEASE.md')).toBe(true);
  });
});

describe('privacy policy', () => {
  const page = text('public/privacy.html');

  it('names the app, the publisher and a contact email', () => {
    expect(page).toContain('Arrow Expert');
    expect(page).toContain('Sussal Productions');
    expect(page).toMatch(/<a href="mailto:([^"]+)">\1<\/a>/); // the address shown is the one linked
    expect(page).not.toContain('CONTACT_EMAIL');
  });

  it('matches the app: no account or purchases, progress on the device, ads by Google AdMob (3.26.0)', () => {
    for (const s of ['No account', 'No in-app purchases', 'only on your device', 'children', 'Google AdMob'])
      expect(page, s).toContain(s);
    expect(page).toContain('advertising ID');
    expect(page).toContain('https://policies.google.com/technologies/partner-sites');
    expect(page).toContain('Privacy options');
    expect(page).not.toContain('No ads');
  });

  it('covers the store needs: package, UMP consent, no data sold, not for children under 13, Google links', () => {
    expect(page).toContain('com.sussal.arrowexpert');
    expect(page).toContain('mailto:sussalproductions@gmail.com');
    expect(page).toContain('User Messaging Platform, UMP');
    expect(page).toContain('We do not sell, rent or trade any information about you.');
    expect(page).toContain('not directed at children under 13');
    expect(page).toContain('https://policies.google.com/privacy');
  });

  it('the Play docs use the Sussal Productions website URL; Vercel stays as the backup', () => {
    const url = 'https://mubasharakram05.github.io/arrow-expert/privacy/';
    expect(text('docs/RELEASE.md')).toContain(`| Privacy policy    | ${url} |`);
    expect(text('docs/RELEASE.md')).toContain(`privacy policy URL ${url}`);
    expect(text('store-assets/listing.md')).toContain(`## Privacy policy URL\n\n${url}\n`);
    expect(exists('public/privacy.html')).toBe(true);
  });

  it('is linked from the Credits screen', () => {
    expect(text('index.html')).toContain('id="btn-privacy"');
    expect(text('src/ui/modals/credits.js')).toContain("'./privacy.html'");
  });
});
