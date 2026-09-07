import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function Icon({ name, size = 22, color = '#102A2A' }: { name: IconName; size?: number; color?: string }) {
  return <Ionicons name={name} size={size} color={color} />;
}
