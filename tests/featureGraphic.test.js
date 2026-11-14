import { describe, expect, it } from 'vitest';
import { readFileSync, statSync } from 'node:fs';

const DIR = new URL('../store-assets/play/', import.meta.url);
const MB = 1024 * 1024;

function jpegSize(buf) {
  // walk the markers to the first SOFn frame header: height and width follow the precision byte
  let i = 2;
  while (i < buf.length) {
    const marker = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7), comps: buf[i + 9] };
    }
    i += 2 + len;
  }
  return null;
}

describe('Play Store feature graphic', () => {
  it('PNG is 1024 x 500, 24-bit RGB without alpha, under 1 MB', () => {
    const buf = readFileSync(new URL('feature-graphic.png', DIR));
    expect(buf.subarray(1, 4).toString()).toBe('PNG');
    expect(buf.readUInt32BE(16)).toBe(1024);
    expect(buf.readUInt32BE(20)).toBe(500);
    expect(buf[24]).toBe(8); // 8 bits per channel
    expect(buf[25]).toBe(2); // colour type 2 = RGB, no alpha
    expect(statSync(new URL('feature-graphic.png', DIR)).size).toBeLessThan(MB);
  });

  it('JPG is 1024 x 500, 3 colour channels, under 1 MB', () => {
    const buf = readFileSync(new URL('feature-graphic.jpg', DIR));
    expect(buf.readUInt16BE(0)).toBe(0xffd8);
    expect(jpegSize(buf)).toEqual({ w: 1024, h: 500, comps: 3 });
    expect(statSync(new URL('feature-graphic.jpg', DIR)).size).toBeLessThan(MB);
  });
});
