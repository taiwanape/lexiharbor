import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, useColorScheme, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { BottomNav } from './src/components/BottomNav';
import { Paywall } from './src/components/Paywall';
import { hasPremiumEntitlement } from './src/services/purchases';
import { DictionaryScreen } from './src/screens/DictionaryScreen';
import { FlashcardsScreen } from './src/screens/FlashcardsScreen';
import { PhrasesScreen } from './src/screens/PhrasesScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { SavedScreen } from './src/screens/SavedScreen';
import { AppProvider, useAppState } from './src/state/AppContext';
import { palette } from './src/theme';
import { TabId } from './src/types';

function Shell() {
  const systemScheme = useColorScheme();
  const [dark, setDark] = useState(systemScheme === 'dark');
  const [tab, setTab] = useState<TabId>('dictionary');
  const [paywall, setPaywall] = useState(false);
  const { setPremium } = useAppState();

  useEffect(() => {
    hasPremiumEntitlement().then((active) => { if (active) setPremium(true); }).catch(() => undefined);
  }, [setPremium]);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safe, { backgroundColor: dark ? palette.night : palette.canvas }]}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <View style={styles.screen}>
        {tab === 'dictionary' && <DictionaryScreen dark={dark} onUpgrade={() => setPaywall(true)} />}
        {tab === 'cards' && <FlashcardsScreen dark={dark} />}
        {tab === 'phrases' && <PhrasesScreen dark={dark} />}
        {tab === 'saved' && <SavedScreen dark={dark} />}
        {tab === 'profile' && <ProfileScreen dark={dark} setDark={setDark} onUpgrade={() => setPaywall(true)} />}
      </View>
      <BottomNav active={tab} setActive={setTab} dark={dark} />
      <Paywall visible={paywall} onClose={() => setPaywall(false)} />
    </SafeAreaView>
  );
}

export default function App() {
  return <SafeAreaProvider><AppProvider><Shell /></AppProvider></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, ...(Platform.OS === 'web' ? { maxWidth: 520, width: '100%', alignSelf: 'center', boxShadow: '0 0 40px rgba(15,118,110,0.12)' } : {}) },
  screen: { flex: 1 },
});
