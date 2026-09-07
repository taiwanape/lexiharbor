import assert from 'node:assert/strict';
import test from 'node:test';
import { getAppColors, webFont } from '../src/design/theme';

function luminance(hex: string): number {
  const rgb = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255)
    .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return rgb[0]! * 0.2126 + rgb[1]! * 0.7152 + rgb[2]! * 0.0722;
}
function contrast(a: string, b: string): number {
  const l = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l[0]! + 0.05) / (l[1]! + 0.05);
}

for (const dark of [false, true]) {
  test(`${dark ? 'dark' : 'light'} palette keeps text and controls legible`, () => {
    const c = getAppColors(dark, true);
    for (const background of [c.bg, c.card, c.soft, c.accentSoft]) {
      for (const text of [c.ink, c.muted]) {
        assert.ok(contrast(text, background) >= 4.5, `${text} on ${background}`);
      }
    }
    assert.ok(contrast(c.onPrimary, c.primary) >= 4.5);
    assert.ok(contrast(c.onAccent, c.accent) >= 4.5);
    assert.ok(contrast(c.blue, c.card) >= 4.5);
    assert.ok(contrast(c.controlBorder, c.card) >= 3);
    assert.equal(c.font, webFont);
    assert.equal(getAppColors(dark).font, undefined);
  });
}
