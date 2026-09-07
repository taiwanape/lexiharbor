import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createPronunciationController, findNaturalVoiceClip, naturalVoiceUrl,
  type DeviceSpeechCallbacks, type NaturalVoiceClip, type PronunciationAudio,
} from '../src/domain/pronunciation';

const clips: NaturalVoiceClip[] = [
  { text: 'bank', language: 'en-US', path: 'audio/bank.wav' },
  { text: 'We carry on.', language: 'en-US', path: 'audio/carry-on.wav' },
];
function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
class FakeAudio implements PronunciationAudio {
  playing = () => {};
  ended = () => {};
  error = () => {};
  completion = deferred();
  paused = false;
  released = false;
  started = false;
  play() { this.started = true; return this.completion.promise; }
  pause() { this.paused = true; }
  release() { this.released = true; }
  onPlaying(callback: () => void) { this.playing = callback; }
  onEnded(callback: () => void) { this.ended = callback; }
  onError(callback: () => void) { this.error = callback; }
}
function harness(web = true) {
  const statuses: string[] = [];
  const audios: { url: string; audio: FakeAudio }[] = [];
  const spoken: { text: string; callbacks: DeviceSpeechCallbacks }[] = [];
  const stops: ReturnType<typeof deferred>[] = [];
  const controller = createPronunciationController({
    web, baseUrl: '/lexiharbor', getClips: () => clips,
    createAudio: url => { const audio = new FakeAudio(); audios.push({ url, audio }); return audio; },
    device: {
      speak: (text, callbacks) => { spoken.push({ text, callbacks }); },
      stop: () => { const done = deferred(); stops.push(done); return done.promise; },
      maxLength: 1000,
    },
    onStatus: value => statuses.push(value),
  });
  return { controller, statuses, audios, spoken, stops, latest: () => statuses[statuses.length - 1]! };
}

test('lookup matches exact text, whitespace, punctuation, case and language only', () => {
  assert.deepEqual(findNaturalVoiceClip(clips, 'bank', 'en-US'), clips[0]);
  for (const text of ['Bank', ' bank', 'bank ', 'bank.', 'banks']) assert.equal(findNaturalVoiceClip(clips, text, 'en-US'), undefined);
  assert.equal(findNaturalVoiceClip(clips, 'bank', 'en-GB'), undefined);
  assert.equal(findNaturalVoiceClip(clips, 'We carry on.', 'en-US')?.path, 'audio/carry-on.wav');
});

test('asset URLs respect root and nested Expo base URLs, independent of current page', () => {
  assert.equal(naturalVoiceUrl('audio/bank.wav', '/lexiharbor'), '/lexiharbor/audio/bank.wav');
  assert.equal(naturalVoiceUrl('audio/bank.wav', '/lexiharbor/'), '/lexiharbor/audio/bank.wav');
  assert.equal(naturalVoiceUrl('audio/bank.wav', '/'), '/audio/bank.wav');
  assert.equal(naturalVoiceUrl('audio/bank.wav', ''), '/audio/bank.wav');
  assert.equal(naturalVoiceUrl('audio/bank.wav', '/trial/app'), '/trial/app/audio/bank.wav');
});

test('unsafe paths cannot escape to another directory, protocol or remote hostname', () => {
  for (const path of ['https://example.com/a.wav', '//example.com/a.wav', '/audio/a.wav', 'audio/../a.wav', 'audio/%2e%2e/a.wav', 'audio/a.wav?x=1', 'audio//a.wav', 'audio/./a.wav']) {
    assert.throws(() => naturalVoiceUrl(path, '/lexiharbor'));
    assert.equal(findNaturalVoiceClip([{ text: 'bank', language: 'en-US', path }], 'bank', 'en-US'), undefined);
  }
  for (const base of ['//', '//example.com', 'https://example.com', '/../', '/x//']) assert.throws(() => naturalVoiceUrl('audio/bank.wav', base));
});

test('exact web matches start audio synchronously and transparently identify synthetic speech', async () => {
  const h = harness();
  h.controller.speak('bank', 'en-US');
  assert.equal(h.audios[0]!.url, '/lexiharbor/audio/bank.wav');
  assert.equal(h.audios[0]!.audio.started, true);
  assert.equal(h.spoken.length, 0);
  assert.match(h.latest(), /AI合成語音（非真人錄音）/);
  h.audios[0]!.audio.playing();
  assert.match(h.latest(), /播放中/);
  h.audios[0]!.audio.ended();
  h.audios[0]!.audio.completion.resolve();
  await Promise.resolve();
  assert.match(h.latest(), /播放完成/);
});

test('unmatched text or accent explicitly uses device speech without claiming AI audio', () => {
  const h = harness();
  h.controller.speak('bank', 'en-GB');
  assert.equal(h.audios.length, 0);
  assert.equal(h.spoken[0]!.callbacks.language, 'en-GB');
  assert.match(h.latest(), /裝置語音（尚無這段AI音檔）/);
  h.spoken[0]!.callbacks.onStart();
  assert.match(h.latest(), /播放中/);
  h.spoken[0]!.callbacks.onDone();
  assert.match(h.latest(), /裝置語音（尚無這段AI音檔） · 播放完成/);
});

test('native platforms do not construct HTMLAudio or falsely claim bundled AI playback', () => {
  const h = harness(false);
  h.controller.speak('bank', 'en-US');
  assert.equal(h.audios.length, 0);
  assert.equal(h.spoken.length, 1);
  assert.match(h.latest(), /裝置語音（原生版尚未啟用AI音檔）/);
});

test('audio play rejection shows actionable error and never silently falls back to device voice', async () => {
  const h = harness();
  h.controller.speak('bank', 'en-US');
  h.audios[0]!.audio.completion.reject(new Error('autoplay blocked'));
  await Promise.resolve();
  assert.match(h.latest(), /音檔無法播放.*再試/);
  assert.equal(h.spoken.length, 0);
  assert.equal(h.audios[0]!.audio.released, true);
});

test('media loading errors are reported and release the failed audio', () => {
  const h = harness();
  h.controller.speak('bank', 'en-US');
  h.audios[0]!.audio.error();
  assert.match(h.latest(), /音檔無法播放/);
  assert.equal(h.audios[0]!.audio.paused, true);
  assert.equal(h.spoken.length, 0);
});

test('rapid audio changes cancel old media and ignore all stale completion/error events', async () => {
  const h = harness();
  h.controller.speak('bank', 'en-US');
  const first = h.audios[0]!.audio;
  h.controller.speak('We carry on.', 'en-US');
  assert.equal(first.paused, true);
  assert.equal(first.released, true);
  h.audios[1]!.audio.playing();
  const latest = h.latest();
  first.playing(); first.ended(); first.error(); first.completion.reject(new Error('aborted'));
  await Promise.resolve();
  assert.equal(h.latest(), latest);
});

test('stop keeps last source visible and cannot be undone by late play promises', async () => {
  const h = harness();
  h.controller.speak('bank', 'en-US');
  h.controller.stop();
  assert.match(h.latest(), /AI合成語音.*已停止/);
  h.audios[0]!.audio.completion.resolve();
  await Promise.resolve();
  assert.match(h.latest(), /已停止/);
});

test('several native requests share one asynchronous stop and only latest request starts', async () => {
  const h = harness();
  h.controller.speak('first unmatched', 'en-US');
  h.controller.speak('second unmatched', 'en-US');
  h.controller.speak('latest unmatched', 'en-US');
  assert.equal(h.stops.length, 1);
  assert.equal(h.spoken.length, 1);
  h.stops[0]!.resolve();
  await Promise.resolve();
  assert.deepEqual(h.spoken.map(item => item.text), ['first unmatched', 'latest unmatched']);
  h.spoken[1]!.callbacks.onStart();
  const latest = h.latest();
  h.spoken[0]!.callbacks.onDone(); h.spoken[0]!.callbacks.onError();
  assert.equal(h.latest(), latest);
});

test('stop while native cancellation is pending prevents the queued replacement from speaking', async () => {
  const h = harness();
  h.controller.speak('first unmatched', 'en-US');
  h.controller.speak('second unmatched', 'en-US');
  h.controller.stop();
  h.stops[0]!.resolve();
  await Promise.resolve();
  assert.equal(h.spoken.length, 1);
  assert.match(h.latest(), /裝置語音.*已停止/);
});

test('native stop rejection is visible and does not start overlapping replacement speech', async () => {
  const h = harness();
  h.controller.speak('first unmatched', 'en-US');
  h.controller.speak('second unmatched', 'en-US');
  h.stops[0]!.reject(new Error('native failure'));
  await Promise.resolve();
  assert.equal(h.spoken.length, 1);
  assert.match(h.latest(), /無法停止前一段語音.*重試/);
  h.controller.speak('retry unmatched', 'en-US');
  assert.equal(h.stops.length, 2);
  assert.equal(h.spoken.length, 1);
  h.stops[1]!.resolve();
  await Promise.resolve();
  assert.equal(h.spoken[1]!.text, 'retry unmatched');
});

test('unmount disposal cancels audio and suppresses subsequent callbacks and state changes', async () => {
  const h = harness();
  h.controller.speak('bank', 'en-US');
  const before = h.statuses.length;
  h.controller.dispose();
  assert.equal(h.audios[0]!.audio.paused, true);
  h.audios[0]!.audio.playing(); h.audios[0]!.audio.error(); h.audios[0]!.audio.completion.resolve();
  h.controller.speak('another', 'en-US'); h.controller.stop();
  await Promise.resolve();
  assert.equal(h.statuses.length, before);
  assert.equal(h.spoken.length, 0);
});

test('disposal during pending native cancellation cannot resurrect a queued utterance', async () => {
  const h = harness();
  h.controller.speak('first unmatched', 'en-US');
  h.controller.speak('second unmatched', 'en-US');
  h.controller.dispose();
  const before = h.statuses.length;
  h.stops[0]!.resolve();
  await Promise.resolve();
  assert.equal(h.spoken.length, 1);
  assert.equal(h.statuses.length, before);
});

test('empty or too-long device content yields instructions rather than phantom playback', () => {
  const h = harness();
  h.controller.speak('  ', 'en-US');
  assert.match(h.latest(), /請先選取/);
  h.controller.speak('a'.repeat(1001), 'en-US');
  assert.match(h.latest(), /超過裝置語音上限/);
  assert.equal(h.spoken.length, 0);
  assert.equal(h.audios.length, 0);
});
