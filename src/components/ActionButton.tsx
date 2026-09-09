import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import { Icon, type IconName } from './Icons';
import type { AppColors } from '../design/theme';

type Props = { label: string; onPress: () => void; colors: AppColors; quiet?: boolean; disabled?: boolean; icon?: IconName };

/** Shared across reading, dictionary, review and settings. */
export function ActionButton({ label, onPress, colors, quiet = false, disabled = false, icon }: Props) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const foreground = quiet ? colors.ink : colors.onPrimary;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => [styles.button, {
      backgroundColor: quiet ? (hovered || pressed ? colors.accentSoft : colors.soft) : colors.primary,
      borderColor: focused ? colors.blue : quiet ? colors.line : colors.primary,
      opacity: disabled ? 0.45 : 1,
      transform: [{ translateY: pressed ? 1 : 0 }],
      ...(Platform.OS === 'web' && focused ? { outlineColor: colors.blue, outlineWidth: 3, outlineStyle: 'solid' as const, outlineOffset: 3 } : {}),
    }]}>
    {icon && <Icon name={icon} size={18} color={foreground} />}
    <Text style={[styles.label, { color: foreground, fontFamily: colors.font }]}>{label}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  button: { minHeight: 46, maxWidth: '100%', minWidth: 0, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  label: { fontSize: 14, lineHeight: 22, fontWeight: '700', flexShrink: 1 },
});
