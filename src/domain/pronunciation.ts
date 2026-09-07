/** A structurally typed subset: generation metadata may be present in the manifest. */
export type NaturalVoiceClip = { text: string; language: string; path: string };

function safeClipPath(path: string): boolean {
  return /^audio\/[A-Za-z0-9_./-]+\.(?:wav|mp3|ogg|m4a|webm)$/i.test(path)
    && path.split('/').every(segment => segment !== '.' && segment !== '..' && segment !== '');
}

/** No case folding, trimming or punctuation substitution: a recording must match exactly. */
export function findNaturalVoiceClip(clips: readonly NaturalVoiceClip[], text: string, language: string): NaturalVoiceClip | undefined {
  return clips.find(clip => clip.text === text && clip.language === language && safeClipPath(clip.path));
}

/** Static assets stay under the configured Expo base URL, never a third-party URL. */
export function naturalVoiceUrl(path: string, baseUrl: string): string {
  if (!safeClipPath(path)) throw new Error('音檔路徑無效。');
  if (baseUrl !== '' && baseUrl !== '/' && !/^\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*\/?$/.test(baseUrl)) throw new Error('應用程式路徑無效。');
  return `${baseUrl.replace(/\/$/, '')}/${path}`;
}

export type PronunciationAudio = {
  play(): Promise<void> | void;
  pause(): void;
  release(): void;
  onPlaying(callback: () => void): void;
  onEnded(callback: () => void): void;
  onError(callback: () => void): void;
};
export type DeviceSpeechCallbacks = {
  language: string; onStart(): void; onDone(): void; onStopped(): void; onError(error?: unknown): void;
};
export type PronunciationDependencies = {
  web: boolean;
  baseUrl: string;
  getClips(): readonly NaturalVoiceClip[];
  createAudio(url: string): PronunciationAudio;
  device: { speak(text: string, callbacks: DeviceSpeechCallbacks): void; stop(): Promise<void> | void; maxLength?: number };
  onStatus(status: string): void;
};

/** Testable lifecycle controller; stale promises/events cannot resurrect stopped playback. */
export function createPronunciationController(deps: PronunciationDependencies) {
  let generation = 0;
  let disposed = false;
  let activeAudio: PronunciationAudio | null = null;
  let deviceActive = false;
  let pendingDeviceStop: Promise<void> | null = null;
  let lastSource = '';

  function status(value: string) { if (!disposed) deps.onStatus(value); }
  function current(request: number) { return !disposed && generation === request; }
  function releaseAudio() {
    const audio = activeAudio;
    activeAudio = null;
    if (!audio) return;
    try { audio.pause(); } catch { /* Cleanup must continue if the platform is shutting down. */ }
    try { audio.release(); } catch { /* Event generation guards also prevent stale callbacks. */ }
  }
  function stopDevice(): Promise<void> | null {
    if (pendingDeviceStop) return pendingDeviceStop;
    if (!deviceActive) return null;
    deviceActive = false;
    let completion: Promise<void>;
    try { completion = Promise.resolve(deps.device.stop()); }
    catch (error) { completion = Promise.reject(error); }
    pendingDeviceStop = completion;
    // A shared stop promise means several rapid requests never race native stop calls.
    void completion.then(
      () => { if (pendingDeviceStop === completion) pendingDeviceStop = null; },
      () => {
        if (pendingDeviceStop === completion) {
          pendingDeviceStop = null;
          // The old utterance may still be audible; retry must attempt cancellation again.
          deviceActive = true;
        }
      },
    );
    return completion;
  }
  function stop() {
    if (disposed) return;
    const request = ++generation;
    releaseAudio();
    const stopping = stopDevice();
    if (lastSource) status(`${lastSource} · 已停止`);
    void stopping?.catch(() => { if (current(request)) status(`${lastSource} · 無法停止裝置語音，請重試`); });
  }

  function speak(text: string, language: string) {
    if (disposed) return;
    const request = ++generation;
    releaseAudio();
    const stopping = stopDevice();
    if (!text.trim()) {
      status('請先選取要播放的文字。');
      void stopping?.catch(() => { if (current(request)) status('無法停止裝置語音，請重試。'); });
      return;
    }
    const clip = deps.web ? findNaturalVoiceClip(deps.getClips(), text, language) : undefined;
    lastSource = clip ? 'AI合成語音（非真人錄音）' : deps.web ? '裝置語音（尚無這段AI音檔）' : '裝置語音（原生版尚未啟用AI音檔）';
    const source = lastSource;
    if (clip) {
      status(`${source} · 正在載入`);
      try {
        const audio = deps.createAudio(naturalVoiceUrl(clip.path, deps.baseUrl));
        activeAudio = audio;
        const isActive = () => current(request) && activeAudio === audio;
        const failed = () => {
          if (!isActive()) return;
          releaseAudio();
          status(`${source} · 音檔無法播放，請檢查連線後再試`);
        };
        audio.onPlaying(() => { if (isActive()) status(`${source} · 播放中`); });
        audio.onEnded(() => {
          if (!isActive()) return;
          releaseAudio();
          status(`${source} · 播放完成`);
        });
        audio.onError(failed);
        // Call in the user's click stack so browser autoplay protection does not block it.
        const playing = audio.play();
        if (playing) void playing.then(() => { if (isActive()) status(`${source} · 播放中`); }, failed);
      } catch {
        releaseAudio();
        status(`${source} · 音檔無法播放，請檢查連線後再試`);
      }
      void stopping?.catch(() => {
        if (!current(request)) return;
        releaseAudio();
        status(`${source} · 無法停止前一段裝置語音，請重試`);
      });
      return;
    }
    if (deps.device.maxLength !== undefined && text.length > deps.device.maxLength) {
      status(`${source} · 文字超過裝置語音上限，請選取較短的段落`);
      void stopping?.catch(() => { if (current(request)) status(`${source} · 無法停止裝置語音，請重試`); });
      return;
    }
    status(`${source} · 準備播放`);
    const startDevice = () => {
      if (!current(request)) return;
      deviceActive = true;
      try {
        deps.device.speak(text, {
          language,
          onStart: () => { if (current(request) && deviceActive) status(`${source} · 播放中`); },
          onDone: () => { if (current(request) && deviceActive) { deviceActive = false; status(`${source} · 播放完成`); } },
          onStopped: () => { if (current(request) && deviceActive) { deviceActive = false; status(`${source} · 已停止`); } },
          onError: () => { if (current(request) && deviceActive) { deviceActive = false; status(`${source} · 發音失敗，請確認裝置已安裝對應語音後再試`); } },
        });
      } catch {
        deviceActive = false;
        status(`${source} · 發音失敗，請稍後再試`);
      }
    };
    if (stopping) void stopping.then(startDevice, () => { if (current(request)) status(`${source} · 無法停止前一段語音，請重試`); });
    else startDevice();
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    generation++;
    releaseAudio();
    void stopDevice()?.catch(() => undefined);
  }
  return { speak, stop, dispose };
}
