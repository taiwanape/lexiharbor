/** Shared visual tokens. All learning, reading and modal surfaces use one palette. */
export type AppColors = {
  bg: string;
  card: string;
  ink: string;
  muted: string;
  line: string;
  controlBorder: string;
  soft: string;
  primary: string;
  onPrimary: string;
  accent: string;
  onAccent: string;
  accentSoft: string;
  blue: string;
  shadow: string;
  dark: boolean;
  font: string | undefined;
};

export const webFont = "'Segoe UI', 'PingFang TC', 'Microsoft JhengHei', sans-serif";

export function getAppColors(dark: boolean, web = false): AppColors {
  return {
    ...(dark ? {
      bg: '#201c2b', card: '#2c253a', ink: '#fff8e9', muted: '#d1c4df',
      line: '#7b698f', controlBorder: '#a895ba', soft: '#3d324e', primary: '#d3ed89', onPrimary: '#222125',
      accent: '#f8da69', onAccent: '#282428', accentSoft: '#494026', blue: '#cbb5ff',
    } : {
      bg: '#fffaf0', card: '#FFFFFF', ink: '#272329', muted: '#716778',
      line: '#302a34', controlBorder: '#81718a', soft: '#eadff7', primary: '#2c2631', onPrimary: '#FFFFFF',
      accent: '#f8da69', onAccent: '#282428', accentSoft: '#f9ebaf', blue: '#7152a0',
    }),
    shadow: dark ? '#000000' : '#302637',
    dark,
    font: web ? webFont : undefined,
  };
}

export const DESKTOP_BREAKPOINT = 1080;
export const SIDEBAR_WIDTH = 224;
