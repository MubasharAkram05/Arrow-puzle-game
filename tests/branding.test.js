/**
 * Branding (3.24.0): the app name, package ID, web manifest, icons, splash config and store text.
 */
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url));
const text = (p) => read(p).toString('utf8');
/** Width and height from a PNG header. */
const pngSize = (p) => {
  const b = read(p);
  expect(b.subarray(1, 4).toString()).toBe('PNG');
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
};
/** PNG colour type: 2 = RGB (no alpha), 6 = RGBA. */
const pngColor = (p) => read(p)[25];

describe('app name and package ID', () => {
  it('is Arrow Expert everywhere the player or the store sees it', () => {
    const html = text('index.html');
    expect(html).toContain('<title>Arrow Expert</title>');
    expect(html).toContain('<h1>Arrow Expert</h1>');
    expect(html).not.toMatch(/Arrow Escape/);
    const cap = JSON.parse(text('capacitor.config.json'));
    expect(cap).toMatchObject({ appId: 'com.sussal.arrowexpert', appName: 'Arrow Expert', webDir: 'dist' });
    expect(JSON.parse(text('package.json')).name).toBe('arrow-expert');
    expect(text('README.md').split('\n')[0]).toBe('# Arrow Expert');
    const man = JSON.parse(text('public/manifest.webmanifest'));
    expect(man).toMatchObject({ name: 'Arrow Expert', short_name: 'Arrow Expert' });
    expect(man.short_name.length).toBeLessThanOrEqual(12);
  });

  it('save keys keep the old name, so existing saves load', () => {
    expect(text('src/storage/schema.js')).toContain("'arrowEscape:v7'");
  });
});

describe('icons', () => {
  it('the web manifest and index.html point at icons that exist, at the stated sizes', () => {
    const man = JSON.parse(text('public/manifest.webmanifest'));
    for (const i of man.icons) {
      const [w, h] = pngSize(`public/${i.src}`);
      expect(`${w}x${h}`, i.src).toBe(i.sizes);
    }
    expect(man.icons.some((i) => i.purpose === 'maskable')).toBe(true);
    const html = text('index.html');
    for (const href of [
      './manifest.webmanifest',
      './favicon.ico',
      './icons/apple-touch-icon.png',
      './icons/logo-256.png',
    ])
      expect(html, href).toContain(href);
    expect(pngSize('public/icons/apple-touch-icon.png')).toEqual([180, 180]);
    expect(existsSync(new URL('../public/favicon.ico', import.meta.url))).toBe(true);
  });

  it('Play Store icon: 512 x 512, full square, no transparency, under 1 MB', () => {
    expect(pngSize('store-assets/play/icon-512.png')).toEqual([512, 512]);
    expect(pngColor('store-assets/play/icon-512.png')).toBe(2);
    expect(read('store-assets/play/icon-512.png').length).toBeLessThan(1024 * 1024);
  });

  it('Android adaptive icon layers and launcher icons at every density', () => {
    const k = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
    for (const [d, f] of Object.entries(k)) {
      const dir = `store-assets/android/res/mipmap-${d}`;
      for (const layer of ['foreground', 'background', 'monochrome'])
        expect(pngSize(`${dir}/ic_launcher_${layer}.png`), `${d} ${layer}`).toEqual([108 * f, 108 * f]);
      expect(pngSize(`${dir}/ic_launcher.png`)).toEqual([48 * f, 48 * f]);
      expect(pngSize(`${dir}/ic_launcher_round.png`)).toEqual([48 * f, 48 * f]);
      expect(pngSize(`store-assets/android/res/drawable-${d}/splash_icon.png`)).toEqual([288 * f, 288 * f]);
    }
    const xml = text('store-assets/android/res/mipmap-anydpi-v26/ic_launcher.xml');
    for (const l of ['background', 'foreground', 'monochrome']) expect(xml).toContain(`@mipmap/ic_launcher_${l}`);
  });
});

describe('splash screens', () => {
  it('@capacitor/splash-screen is configured and hidden by the app once Home is ready', () => {
    const cap = JSON.parse(text('capacitor.config.json'));
    expect(cap.plugins.SplashScreen).toMatchObject({ androidSplashResourceName: 'splash', launchAutoHide: false });
    expect(JSON.parse(text('package.json')).dependencies['@capacitor/splash-screen']).toBeTruthy();
    expect(text('src/main.js')).toMatch(/goHome\(\);\s*hideBootSplash\(\);/);
  });

  it('light and dark backgrounds for Android 12+, and light/dark legacy splash images', () => {
    expect(text('store-assets/android/res/values/splash_colors.xml')).toContain('#0250F7');
    expect(text('store-assets/android/res/values-night/splash_colors.xml')).toContain('#0B1020');
    for (const night of ['', '-night'])
      for (const o of ['port', 'land'])
        expect(
          existsSync(new URL(`../store-assets/android/res/drawable${night}-${o}-xxxhdpi/splash.png`, import.meta.url)),
        ).toBe(true);
  });

  it('the web loading screen fades in under 300 ms', () => {
    const html = text('index.html');
    const ms = Number(html.match(/#boot-splash \{[^}]*transition: opacity ([\d.]+)s/)[1]) * 1000;
    expect(ms).toBeLessThan(300);
    expect(text('src/ui/bootSplash.js')).toMatch(/setTimeout\(\(\) => el\.remove\(\), (\d+)\)/);
  });
});

describe('store listing', () => {
  const md = text('store-assets/listing.md');
  const section = (h) => md.match(new RegExp(`## ${h}\\n\\n([\\s\\S]*?)\\n\\n## `))[1].trim();

  it('name up to 30, short description up to 80, full description up to 4000 characters', () => {
    expect(section('App name')).toBe('Arrow Expert');
    expect(section('Short description').length).toBeLessThanOrEqual(80);
    expect(section('Full description').length).toBeLessThanOrEqual(4000);
  });

  it('no ranking claims or keyword stuffing', () => {
    expect(md).not.toMatch(/#1|\bbest\b|number one|top-rated/i);
    expect(section('Tags \\(5\\)').split('\n')).toHaveLength(5);
  });
});
