# CC-CEDICT data attribution

LexiHarbor includes a development subset of **CC-CEDICT**, maintained by the CC-CEDICT contributors and published by MDBG. CC-CEDICT continues the CEDICT project started by Paul Denisowski in 1997.

- Source and officially published downloads: <https://www.mdbg.net/chinese/dictionary?page=cedict>
- Project and release policy: <https://cc-cedict.org/editor/editor.php?handler=Download>
- Full source-version metadata, original release date and SHA-256 checksums: [cedict-source.json](../data/cedict-source.json)
- Retained upstream copyright/license header: [cedict-original-header.txt](../data/cedict-original-header.txt)

The CC-CEDICT data and LexiHarbor's selection, arrangement and transformed data are distributed under **Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)**. The complete license text is bundled in [CC-BY-SA-4.0.txt](CC-BY-SA-4.0.txt); its official text is <https://creativecommons.org/licenses/by-sa/4.0/legalcode.en>.

Changes made by the LexiHarbor project: selected a small set of Traditional Chinese headwords; retained the original Traditional/Simplified forms, numbered pinyin and English definitions; split definition separators into an array; added stable entry identifiers and provenance metadata. No English definition has been editorially rewritten. Selection is not a claim that all senses have received human editorial review.

You can obtain and reuse the exact distributed JSON data from [cedict-sample.json](../data/cedict-sample.json), and every selected record in its original format from [cedict-sample-source.txt](../data/cedict-sample-source.txt). These files are provided without an account, fee, or technical copying restriction. Redistribution and adaptations must comply with CC BY-SA 4.0, including applicable attribution and ShareAlike conditions. A proprietary software notice does not override the permissions granted for these data files.

The full upstream archive is retained in the developer's ignored `.corpus-cache` with a pinned hash. The upstream URL is a moving release download; if it changes, the build rejects the new hash. The public subset source is sufficient to recreate the distributed sample records, but is not a mirror of the complete upstream release.

The licensed material is supplied **as-is and as-available, without warranties**, subject to the disclaimer and limitation of liability in Section 5 of the license. No endorsement or affiliation by CC-CEDICT, MDBG, or Creative Commons is claimed.

This notice applies to CC-CEDICT-derived data, including derivative excerpts in the evaluation results. Independently authored software, sample-headword choices and query strings are separate contributions; this separation does not remove any obligations applicable to an adapted database or dataset.

繁體中文說明：本資料是 CC-CEDICT 的漢英研究小樣，可用英文反查相關中文詞，並非完整英漢學習字典。來源、版號、改動與完整授權如上；本小樣及其衍生資料依 CC BY-SA 4.0 分享，任何程式的專有授權聲明不會取消這些資料本身授予的權利。
