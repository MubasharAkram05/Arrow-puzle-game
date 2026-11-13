/**
 * scripts/check-apk-manifest.py, run by the android workflow on every built APK: Android 12+ refuses an APK whose
 * component has an intent-filter but no android:exported, or whose application is testOnly.
 */
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const NS = 'http://schemas.android.com/apk/res/android:';
const dump = (inner, appAttrs = '') => `N: android=http://schemas.android.com/apk/res/android (line=2)
  E: manifest (line=2)
    A: package="com.sussal.arrowexpert" (Raw: "com.sussal.arrowexpert")
    E: application (line=10)
${appAttrs}${inner}`;
const activity = (exported) => `      E: activity (line=20)
        A: ${NS}name(0x01010003)="com.sussal.arrowexpert.MainActivity" (Raw: "com.sussal.arrowexpert.MainActivity")
${exported === undefined ? '' : `        A: ${NS}exported(0x01010010)=${exported}\n`}        E: intent-filter (line=26)
          E: action (line=27)
            A: ${NS}name(0x01010003)="android.intent.action.MAIN" (Raw: "android.intent.action.MAIN")
`;
const check = (text) =>
  spawnSync('python3', [new URL('../scripts/check-apk-manifest.py', import.meta.url).pathname], {
    input: text,
    encoding: 'utf8',
  });

describe('APK manifest check', () => {
  it('passes when every component with an intent-filter sets android:exported', () => {
    const r = check(dump(activity('true')));
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('manifest: OK');
  });

  it('fails when an intent-filter component has no android:exported', () => {
    const r = check(dump(activity(undefined)));
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('has an intent-filter but no android:exported');
  });

  it('fails on a testOnly application', () => {
    const r = check(dump(activity('true'), `      A: ${NS}testOnly(0x01010272)=true\n`));
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('testOnly');
  });

  it('fails on something that is not a manifest dump', () => {
    expect(check('not a manifest').status).toBe(1);
  });
});
