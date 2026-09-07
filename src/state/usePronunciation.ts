import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import appConfig from '../../app.json';
import { createPronunciationController, type NaturalVoiceClip } from '../domain/pronunciation';

/** Curated AI audio on web; explicit device-voice fallback for all other content. */
export function usePronunciation(clips: readonly NaturalVoiceClip[]) {
  const [status, setStatus] = useState('');
  const latestClips = useRef(clips);
  latestClips.current = clips;
  const controller = useRef<ReturnType<typeof createPronunciationController> | null>(null);

  useEffect(() => {
    const playback = createPronunciationController({
      web: Platform.OS === 'web',
      baseUrl: appConfig.expo.experiments.baseUrl,
      getClips: () => latestClips.current,
      onStatus: setStatus,
      createAudio: (url) => {
        const audio = new Audio(url);
        audio.preload = 'auto';
        return {
          play: () => audio.play(),
          pause: () => audio.pause(),
          release: () => {
            audio.onplaying = null; audio.onended = null; audio.onerror = null;
            audio.removeAttribute('src'); audio.load();
          },
          onPlaying: callback => { audio.onplaying = callback; },
          onEnded: callback => { audio.onended = callback; },
          onError: callback => { audio.onerror = callback; },
        };
      },
      device: {
        speak: (text, callbacks) => Speech.speak(text, { ...callbacks, rate: 0.92 }),
        stop: () => Speech.stop(),
        maxLength: Speech.maxSpeechInputLength,
      },
    });
    controller.current = playback;
    return () => { playback.dispose(); if (controller.current === playback) controller.current = null; };
  }, []);

  const speak = useCallback((text: string, language: string) => controller.current?.speak(text, language), []);
  const stop = useCallback(() => controller.current?.stop(), []);
  return { speak, stop, status };
}
