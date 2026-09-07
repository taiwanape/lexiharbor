import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { palette } from '../theme';
import { TabId } from '../types';
import { Icon, IconName } from './Icons';

const tabs: { id: TabId; label: string; icon: IconName; active: IconName }[] = [
  { id: 'dictionary', label: '字典', icon: 'search-outline', active: 'search' },
  { id: 'cards', label: '複習', icon: 'albums-outline', active: 'albums' },
  { id: 'phrases', label: '會話', icon: 'chatbubbles-outline', active: 'chatbubbles' },
  { id: 'saved', label: '收藏', icon: 'bookmark-outline', active: 'bookmark' },
  { id: 'profile', label: '我的', icon: 'person-circle-outline', active: 'person-circle' },
];

export function BottomNav({ active, setActive, dark }: { active: TabId; setActive: (tab: TabId) => void; dark: boolean }) {
  return (
    <View style={[styles.bar, { backgroundColor: dark ? '#102221' : palette.paper, borderTopColor: dark ? '#27403E' : palette.line }]}>
      {tabs.map((tab) => {
        const selected = tab.id === active;
        return (
          <Pressable key={tab.id} onPress={() => setActive(tab.id)} accessibilityRole="tab" accessibilityState={{ selected }} style={styles.item}>
            <View style={[styles.iconWrap, selected && styles.activeWrap]}>
              <Icon name={selected ? tab.active : tab.icon} size={21} color={selected ? palette.teal : palette.muted} />
            </View>
            <Text style={[styles.label, { color: selected ? palette.teal : palette.muted }, selected && styles.activeLabel]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: 78, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', paddingHorizontal: 6, paddingTop: 7, paddingBottom: 10 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  iconWrap: { width: 42, height: 29, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  activeWrap: { backgroundColor: palette.mint },
  label: { fontSize: 11, fontWeight: '600' },
  activeLabel: { fontWeight: '800' },
});
