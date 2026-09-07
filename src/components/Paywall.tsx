import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';
import { buyPremium, getPremiumPackage, restorePremium } from '../services/purchases';
import { useAppState } from '../state/AppContext';
import { palette } from '../theme';
import { Icon } from './Icons';

export function Paywall({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { setPremium } = useAppState();
  const [item, setItem] = useState<PurchasesPackage | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) getPremiumPackage().then(setItem).catch(() => setItem(null));
  }, [visible]);

  const purchase = async () => {
    if (!item) {
      Alert.alert('測試模式', '尚未設定 Google Play / RevenueCat 商品。請依 README 的上架步驟完成設定。');
      return;
    }
    setBusy(true);
    try {
      if (await buyPremium(item)) { setPremium(true); onClose(); }
    } catch (error) {
      const cancelled = typeof error === 'object' && error !== null && 'userCancelled' in error && error.userCancelled;
      if (!cancelled) Alert.alert('購買未完成', '請稍後再試。');
    } finally { setBusy(false); }
  };

  const restore = async () => {
    setBusy(true);
    try {
      const restored = await restorePremium();
      setPremium(restored);
      Alert.alert(restored ? '已恢復購買' : '找不到購買紀錄', restored ? 'Premium 已重新啟用。' : '請確認目前登入的是原購買帳號。');
      if (restored) onClose();
    } finally { setBusy(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <LinearGradient colors={['#073F3A', '#0F766E', '#20A695']} style={styles.page}>
        <Pressable onPress={onClose} style={styles.close}><Icon name="close" color="#FFFFFF" /></Pressable>
        <View style={styles.heroIcon}><Icon name="sparkles" size={33} color="#FFE8A3" /></View>
        <Text style={styles.kicker}>LEXIHARBOR PREMIUM</Text>
        <Text style={styles.title}>把每次好奇，變成真正會用的字</Text>
        <View style={styles.features}>
          <Feature icon="cloud-download-outline" title="完整離線詞庫" copy="沒有網路也能快速搜尋" />
          <Feature icon="albums-outline" title="無限單字卡" copy="依熟悉度安排複習節奏" />
          <Feature icon="ban-outline" title="清爽無廣告" copy="把注意力留給學習" />
        </View>
        <View style={styles.offer}>
          <View><Text style={styles.offerTitle}>{item?.product.title ?? '終身 Premium'}</Text><Text style={styles.offerSub}>一次購買 · 永久使用</Text></View>
          <Text style={styles.price}>{item?.product.priceString ?? 'NT$590'}</Text>
        </View>
        <Pressable disabled={busy} onPress={purchase} style={styles.buy}>{busy ? <ActivityIndicator color={palette.tealDark} /> : <Text style={styles.buyText}>解鎖 Premium</Text>}</Pressable>
        <Pressable disabled={busy} onPress={restore}><Text style={styles.restore}>恢復購買</Text></Pressable>
        <Text style={styles.legal}>實際價格由 Google Play 顯示。購買前會再次確認，付款由 Google Play 安全處理。</Text>
      </LinearGradient>
    </Modal>
  );
}

function Feature({ icon, title, copy }: { icon: 'cloud-download-outline' | 'albums-outline' | 'ban-outline'; title: string; copy: string }) {
  return <View style={styles.feature}><View style={styles.featureIcon}><Icon name={icon} color="#FFE8A3" /></View><View><Text style={styles.featureTitle}>{title}</Text><Text style={styles.featureCopy}>{copy}</Text></View></View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 25, paddingTop: 28, paddingBottom: 25 }, close: { alignSelf: 'flex-end', width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  heroIcon: { width: 72, height: 72, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.13)', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 12 },
  kicker: { color: '#BFF3EB', textAlign: 'center', fontSize: 10, fontWeight: '900', letterSpacing: 2.1, marginTop: 18 }, title: { color: '#FFFFFF', textAlign: 'center', fontSize: 25, lineHeight: 33, fontWeight: '900', marginTop: 9, paddingHorizontal: 10 },
  features: { gap: 17, marginTop: 28, marginHorizontal: 7 }, feature: { flexDirection: 'row', alignItems: 'center', gap: 13 }, featureIcon: { width: 42, height: 42, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.13)', alignItems: 'center', justifyContent: 'center' }, featureTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' }, featureCopy: { color: '#BFEAE4', fontSize: 11, marginTop: 3 },
  offer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', borderRadius: 19, padding: 16, marginTop: 'auto' }, offerTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' }, offerSub: { color: '#BFEAE4', fontSize: 10, marginTop: 3 }, price: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  buy: { height: 55, borderRadius: 18, backgroundColor: '#FFF4C7', alignItems: 'center', justifyContent: 'center', marginTop: 12 }, buyText: { color: palette.tealDark, fontSize: 15, fontWeight: '900' }, restore: { color: '#FFFFFF', textAlign: 'center', fontSize: 12, fontWeight: '700', paddingVertical: 13 }, legal: { color: '#A9D8D2', fontSize: 9, lineHeight: 14, textAlign: 'center', paddingHorizontal: 12 },
});
