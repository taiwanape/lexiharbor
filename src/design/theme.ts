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
      bg: '#141D2D', card: '#1D2A40', ink: '#F4F5FA', muted: '#BBC6D9',
      line: '#37465F', controlBorder: '#8191AC', soft: '#283751', primary: '#E1E8FF', onPrimary: '#19253C',
      accent: '#F2DC72', onAccent: '#252B37', accentSoft: '#3F3A27', blue: '#AFC2FF',
    } : {
      bg: '#F8F9FC', card: '#FFFFFF', ink: '#202C44', muted: '#5F6D83',
      line: '#E0E5EE', controlBorder: '#8190A5', soft: '#EDF1F9', primary: '#24334F', onPrimary: '#FFFFFF',
      accent: '#F2DC72', onAccent: '#252B37', accentSoft: '#FCF6D9', blue: '#3656CD',
    }),
    shadow: dark ? '#000000' : '#20324F',
    dark,
    font: web ? webFont : undefined,
  };
}

export const DESKTOP_BREAKPOINT = 1080;
export const SIDEBAR_WIDTH = 224;
