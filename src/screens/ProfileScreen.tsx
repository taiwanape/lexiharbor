import React from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Icon, IconName } from '../components/Icons';
import { useAppState } from '../state/AppContext';
import { palette } from '../theme';

export function ProfileScreen({ dark, setDark, onUpgrade }: { dark: boolean; setDark: (value: boolean) => void; onUpgrade: () => void }) {
  const { savedWords, knownWords, reviewCount, streak, isPremium } = useAppState();
  const ink = dark ? '#F4FFFD' : palette.ink;
  const muted = dark ? '#A2B8B5' : palette.muted;
  const card = dark ? palette.nightCard : palette.paper;
  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <Text style={[styles.title, { color: ink }]}>我的學習</Text>
      <Text style={[styles.subtitle, { color: muted }]}>看見每一天的累積</Text>
      <View style={styles.stats}>
        <Stat value={`${streak}`} label="連續天數" icon="flame" color={palette.coral} card={card} ink={ink} />
        <Stat value={`${knownWords.length}`} label="已學會" icon="checkmark-circle" color={palette.teal} card={card} ink={ink} />
        <Stat value={`${reviewCount}`} label="複習次數" icon="refresh-circle" color={palette.amber} card={card} ink={ink} />
      </View>

      {!isPremium ? (
        <Pressable onPress={onUpgrade} style={styles.premium}>
          <View style={styles.premiumIcon}><Icon name="sparkles" color="#FFF5C2" /></View>
          <View style={styles.premiumCopy}><Text style={styles.premiumTitle}>LexiHarbor Premium</Text><Text style={styles.premiumText}>完整離線詞庫、無廣告、無限複習</Text></View>
          <Icon name="chevron-forward" color="#FFFFFF" />
        </Pressable>
      ) : (
        <View style={styles.premium}><View style={styles.premiumIcon}><Icon name="checkmark" color="#FFF5C2" /></View><View style={styles.premiumCopy}><Text style={styles.premiumTitle}>Premium 已啟用</Text><Text style={styles.premiumText}>感謝支持你的每日學習</Text></View></View>
      )}

      <Text style={[styles.groupTitle, { color: muted }]}>偏好設定</Text>
      <View style={[styles.group, { backgroundColor: card }]}>
        <SettingRow icon="moon-outline" title="深色模式" color="#5865D8" ink={ink} end={<Switch value={dark} onValueChange={setDark} trackColor={{ true: palette.teal }} />} />
        <Divider dark={dark} />
        <SettingRow icon="language-outline" title="學習語言" subtitle="English ⇄ 繁體中文" color={palette.teal} ink={ink} />
        <Divider dark={dark} />
        <SettingRow icon="notifications-outline" title="每日提醒" subtitle="晚上 8:00" color={palette.amber} ink={ink} />
      </View>

      <Text style={[styles.groupTitle, { color: muted }]}>資料與支援</Text>
      <View style={[styles.group, { backgroundColor: card }]}>
        <SettingRow icon="download-outline" title="離線詞庫" subtitle="示範資料 · 待匯入正式詞庫" color={palette.teal} ink={ink} />
        <Divider dark={dark} />
        <SettingRow icon="shield-checkmark-outline" title="隱私權政策" color="#3478C8" ink={ink} />
        <Divider dark={dark} />
        <SettingRow icon="information-circle-outline" title="授權與出處" color={palette.coral} ink={ink} />
      </View>
      <Text style={[styles.version, { color: muted }]}>LexiHarbor 1.0.0 · 商用 MVP</Text>
      <Text style={[styles.saved, { color: muted }]}>已收藏 {savedWords.length} 個單字</Text>
    </ScrollView>
  );
}

function Stat({ value, label, icon, color, card, ink }: { value: string; label: string; icon: IconName; color: string; card: string; ink: string }) {
  return <View style={[styles.stat, { backgroundColor: card }]}><Icon name={icon} size={19} color={color} /><Text style={[styles.statValue, { color: ink }]}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

function Divider({ dark }: { dark: boolean }) { return <View style={[styles.divider, { backgroundColor: dark ? '#29413F' : palette.line }]} />; }

function SettingRow({ icon, title, subtitle, color, ink, end }: { icon: IconName; title: string; subtitle?: string; color: string; ink: string; end?: React.ReactNode }) {
  return <Pressable style={styles.row}><View style={[styles.rowIcon, { backgroundColor: `${color}18` }]}><Icon name={icon} size={19} color={color} /></View><View style={styles.rowCopy}><Text style={[styles.rowTitle, { color: ink }]}>{title}</Text>{subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}</View>{end ?? <Icon name="chevron-forward" size={18} color="#9BADAA" />}</Pressable>;
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 35 }, title: { fontSize: 27, fontWeight: '900', marginTop: 8 }, subtitle: { fontSize: 13, marginTop: 4 },
  stats: { flexDirection: 'row', gap: 9, marginTop: 20 }, stat: { flex: 1, alignItems: 'center', paddingVertical: 15, borderRadius: 18 }, statValue: { fontSize: 21, fontWeight: '900', marginTop: 5 }, statLabel: { color: palette.muted, fontSize: 10, marginTop: 2 },
  premium: { flexDirection: 'row', alignItems: 'center', borderRadius: 22, padding: 17, marginTop: 17, backgroundColor: '#0F766E' }, premiumIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' }, premiumCopy: { flex: 1, marginLeft: 12 }, premiumTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' }, premiumText: { color: '#C8F1EA', fontSize: 11, marginTop: 4 },
  groupTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 1.3, marginTop: 24, marginBottom: 8, marginLeft: 4 }, group: { borderRadius: 20, paddingHorizontal: 15 },
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center' }, rowIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }, rowCopy: { flex: 1, marginLeft: 12 }, rowTitle: { fontSize: 14, fontWeight: '700' }, rowSubtitle: { color: palette.muted, fontSize: 11, marginTop: 3 }, divider: { height: StyleSheet.hairlineWidth, marginLeft: 48 },
  version: { textAlign: 'center', fontSize: 10, marginTop: 24 }, saved: { textAlign: 'center', fontSize: 10, marginTop: 4 },
});
