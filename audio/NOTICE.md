# LexiHarbor AI-generated speech

These WAV files contain **AI-generated neural speech**, not human narration. They were generated locally for LexiHarbor using original project reading texts and learning examples, not extracted from Erudite, What'Sub, or any competitor.

Model: Kokoro-82M by hexgrad and its contributors, ONNX conversion by ONNX Community / Xenova. License identified by the publishers: Apache License 2.0.

- Original: <https://huggingface.co/hexgrad/Kokoro-82M>
- Exact converted-model snapshot: <https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/tree/1939ad2a8e416c0acfeecc08a694d14ef25f2231>
- Generator: `kokoro-js@1.2.1`, `@huggingface/transformers@3.8.1`; Node CPU inference.
- Voice: `af_heart`, American English; no custom voice clone.
- Model license: [Apache-2.0.txt](Apache-2.0.txt).
- Source metadata, original training-data attributions and disclaimers: [Kokoro-model-card.md](Kokoro-model-card.md), [Kokoro-ONNX-model-card.md](Kokoro-ONNX-model-card.md).
- Exact input text, voice, content hashes, source versions and waveform checks: [manifest.json](manifest.json).

The original model card credits CC BY training audio from Koniwa `tnc` (CC BY 3.0) and SIWIS (CC BY 4.0). These acknowledgements are preserved in the copied model card. They do not imply those contributors endorse LexiHarbor.

Processing: split text into speech chunks, insert 100 ms between chunks, attenuate only peaks exceeding 0.95, and convert the neural output to mono 24 kHz PCM16 WAV. No competitor audio or dictionary definition text is used as audio input.

Automated file and signal checks have been performed. **Human listening and pronunciation review has not yet been completed.** Naturalness and educational correctness are not guaranteed. The model and upstream code are supplied without warranty; the Apache license does not provide trademark or endorsement rights.

Only included text has pre-generated speech. This does not provide real-time neural speech for arbitrary pasted content. Playing these files does not call a paid speech API; hosting, storage, production, and distribution can still incur costs.
