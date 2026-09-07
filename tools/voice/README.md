# LexiHarbor local neural voice build

This is a **build-time tool**, not an application runtime dependency. It generates actual neural speech using Kokoro on the developer's Windows CPU. Published clients play the resulting WAV files. No synthesis API, API key, system Speech voice, or third-party dictionary audio is used.

## Reproduce

From this directory, using Node 24 and pnpm 11:

```powershell
pnpm install --ignore-workspace --frozen-lockfile --ignore-scripts
pnpm --ignore-workspace exec tsx generate.ts --smoke
pnpm --ignore-workspace exec tsx generate.ts
pnpm --ignore-workspace exec tsx generate.ts --welcome --offline
node verify.mjs
pnpm --ignore-workspace exec tsx coverage.ts
pnpm --ignore-workspace exec tsx check-inputs.ts
node --test verify.test.mjs
```

The separate lockfile fixes `kokoro-js@1.2.1` and `@huggingface/transformers@3.8.1`. The first invocation downloads the fixed ONNX snapshot into `tools/voice/.model-cache`. Later invocations reuse those files and configure model inference as local-only. Do **not** commit `.model-cache` or `node_modules`.

The model revision is `1939ad2a8e416c0acfeecc08a694d14ef25f2231`. The script checks the SHA256 of q8 weights and the `af_heart` voice and confirms that the installed package voice matches that snapshot. It constructs the underlying model and tokenizer from the local snapshot; it does not rely on passing a silently ignored `revision` through the Kokoro wrapper.

`--smoke` first generates the two bank meanings' original example sentences and one original reading sentence. The full run generates all current learning examples, every reading context returned by the application's `extractContext`, three full original sample articles, and the exact greeting `Hello, welcome to LexiHarbor.`. `--welcome` selects only this greeting. `--offline` prohibits network fetches and fails if any required cached file is absent. It skips existing files only when their hash and waveform checks still match. Source text changes produce new content-addressed filenames.

## Output

- `public/audio/af_heart-<hash>.wav`: mono 24 kHz PCM16 neural speech.
- `src/data/naturalVoiceManifest.json`: application text-to-file mapping.
- `public/audio/manifest.json`: full provenance, input text, model revision, runtime, voice, waveform statistics, and SHA256.
- `public/audio/NOTICE.md`, model cards and Apache license: attribution and usage disclosures.

Articles are generated through a **closed** `TextSplitterStream` (the `kokoro-js@1.2.1` string convenience path leaves its stream open). Generated sentence chunks have 100 ms inserted between them. Waveform peaks above 0.95 are attenuated before PCM conversion; no speaker cloning or audio from competitor products is used.

Automated verification rejects missing, corrupt, too short/long, silent, or substantially clipped files. `check-inputs.ts` separately reruns the actual packaged splitter and phonemizer with a no-inference stub, confirming source text preservation and checking untruncated token counts. It does not publish its placeholder waveform. These checks do not verify pronunciation, completeness of the model's spoken output, naturalness, or suitability for teaching. **Human listening review remains pending**, including same-spelling/different-pronunciation words. The upstream author warns that very short utterances can be weak. Do not claim human-recorded, studio-verified, or universal voice coverage.

## Licensing and scope

Kokoro's original and ONNX model cards identify the model as Apache-2.0. `kokoro-js` also uses Apache-2.0. Copies of the upstream notices are retained with the generated files. The model card credits CC BY training sources; these attributions are preserved rather than asserting that all source material has no obligations. These notices are evidence of the author's stated license, not a legal warranty for every possible use or jurisdiction.

The `phonemizer` dependency uses eSpeak NG for text-to-phoneme conversion; the final waveform comes from the Kokoro neural model. eSpeak NG is GPL-3.0, so the generation runtime stays isolated in this build tool and is not bundled into the product frontend. Review all runtime licenses before changing this to on-device/browser synthesis. The generated audio is not automatically GPL just because a GPL tool participated in processing; this is not a substitute for a commercial legal review.

Fixed pre-generated content incurs no per-play synthesis service fee. Hardware, production review, distribution traffic, and storage still have costs. Arbitrary user-entered text is **not** covered by these files.

Sources:

- [Kokoro original model](https://huggingface.co/hexgrad/Kokoro-82M)
- [Pinned ONNX model](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/tree/1939ad2a8e416c0acfeecc08a694d14ef25f2231)
- [Kokoro JavaScript implementation](https://github.com/hexgrad/kokoro/tree/dfb907a02bba8152ca444717ca5d78747ccb4bec/kokoro.js)
- [Voice limitations](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md)
- [ONNX Runtime Node Windows CPU support](https://onnxruntime.ai/docs/get-started/with-javascript/node.html)
- [eSpeak NG license](https://github.com/espeak-ng/espeak-ng/blob/master/COPYING)
