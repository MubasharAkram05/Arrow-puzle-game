/**
 * Android release setup (3.25.0): the native project, signing from secrets, the workflow, the privacy policy.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
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

describe('android-release workflow', () => {
  const wf = text('.github/workflows/android-release.yml');

  it('manual trigger and version tags; signed release AAB and debug APK as artifacts', () => {
    expect(wf).toMatch(/workflow_dispatch:/);
    expect(wf).toMatch(/tags: \['v\*'\]/);
    expect(wf).toContain('npm run build:release');
    expect(wf).toContain('grep -q \'content="test-unlock=false"\' dist/index.html');
    expect(wf).toContain('npx cap sync android');
    expect(wf).toContain('./gradlew --no-daemon bundleRelease');
    expect(wf).toContain('./gradlew --no-daemon assembleDebug');
    expect(wf.match(/actions\/upload-artifact@v4/g)).toHaveLength(2);
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

  it('names the app and the publisher, with a contact placeholder', () => {
    expect(page).toContain('Arrow Expert');
    expect(page).toContain('Sussal Productions');
    expect(page).toContain('CONTACT_EMAIL');
  });

  it('matches the app: no account, ads, purchases or analytics; data stays on the device', () => {
    for (const s of ['No account', 'No ads', 'No in-app purchases', 'No analytics', 'only on your device', 'children'])
      expect(page, s).toContain(s);
  });

  it('is linked from the Credits screen', () => {
    expect(text('index.html')).toContain('id="btn-privacy"');
    expect(text('src/ui/modals/credits.js')).toContain("'./privacy.html'");
  });
});
