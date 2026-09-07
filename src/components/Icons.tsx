import createIconSet from '@expo/vector-icons/createIconSet';
import glyphMap from '@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json';
import React from 'react';
import font from '../../assets/fonts/Ionicons.ttf';

const Ionicons = createIconSet(glyphMap, 'ionicons', font);

export type IconName = keyof typeof glyphMap;

export function Icon({ name, size = 22, color = '#102A2A' }: { name: IconName; size?: number; color?: string }) {
  return <Ionicons name={name} size={size} color={color} />;
}
