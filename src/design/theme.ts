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
      bg: '#101010', card: '#1b1b1b', ink: '#f5f5ef', muted: '#c6c6bd',
      line: '#444444', controlBorder: '#888888', soft: '#292929', primary: '#39ff14', onPrimary: '#0a0a0a',
      accent: '#39ff14', onAccent: '#0a0a0a', accentSoft: '#21351b', blue: '#9fea87',
    } : {
      bg: '#f7f6f2', card: '#FFFFFF', ink: '#0a0a0a', muted: '#575751',
      line: '#e5e3dc', controlBorder: '#817f77', soft: '#efeee9', primary: '#0a0a0a', onPrimary: '#FFFFFF',
      accent: '#39ff14', onAccent: '#0a0a0a', accentSoft: '#ecffe6', blue: '#22610f',
    }),
    shadow: '#000000',
    dark,
    font: web ? webFont : undefined,
  };
}

export const DESKTOP_BREAKPOINT = 1080;
export const SIDEBAR_WIDTH = 224;
