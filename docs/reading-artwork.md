# 閱讀卡片插圖風格統一

2026-09-08：工作、週末閱讀、旅行三張卡片改用同一個紫色書本角色、粗黑線、奶油手套與橘色鞋。各有對應主題道具，共用 4:3 構圖、奶油黃背景與 contain 圖框，避免裁切角色。主頁角色保留。

使用內建 GPT image_gen 生成，並用同一工具修正背景。三張正式資產皆 1448 × 1086；生成的黃底有輕微色差，未做程式繪圖或影像修改。

正式儲存位置：

- [工作溝通](../assets/design/reading-work.png)：`assets/design/reading-work.png`
- [週末閱讀](../assets/design/reading-weekend.png)：`assets/design/reading-weekend.png`
- [旅行實用](../assets/design/reading-travel.png)：`assets/design/reading-travel.png`

以下保留原始生成與背景編輯的完整提示詞；第一批棋盤格版本未用於正式網站。

# Reading card mascot generation prompts

Mode: built-in image_gen. Exactly three generation calls, awaited in one parallel batch; no retries or variants.

Reference image: D:/Data/Codex/Projects/軟件開發/lexiharbor/assets/design/reading-mascot.png

The reference was inspected with view_image before generation and supplied through referenced_image_paths in each call.

## reading-work.png

```text
Use case: illustration-story
Asset type: production transparent PNG illustration for one of three matching English-reading website cards, landscape 4:3 canvas.
Input image: the attached image is the exact character identity and visual style reference. Preserve the same original purple/lavender and blue open-book mascot: creamy pages, blue round glasses, large friendly oval eyes, pink cheeks, smiling face, rubber-hose black limbs, cream gloves, orange shoes, chunky black outlines. Its book cover shape, facial identity, colors, proportions, and outline weight must visibly match the reference.
Style/medium: clean retro rubber-hose editorial cartoon, sophisticated playful neobrutalism, flat solid fills, consistent bold hand-drawn black outlines. Limited palette: lavender, blue, warm cream, orange, sunny yellow, lime accent, black. Do not add gradients or shaded modelling. This is a coherent asset set using the exact same book character.
Composition: a standalone complete composition on a 4:3 horizontal canvas, whole book character fully visible, total figure and props contained in the central 76% of the canvas width and height, leaving approximately 12% transparent padding on ALL FOUR sides. Main character approximately 70% of canvas height. Balance main character and the small theme props as a single compact friendly composition. Every limb, page corner, shoe and prop stays fully inside the frame. The character proportions and illustration scale should be consistent across the set.
Scene/backdrop: truly transparent alpha background, no solid-color backdrop, no room or landscape, no floor, no cast shadow.
Constraints: no written text or numbers anywhere, no letters, no logos, no watermark, no photorealistic elements, no realistic scenery, no oil paint, no 3D, no gradients, no background decoration.
Theme: practical work communication. The SAME full-body purple-blue book character is standing happily and holding an OPEN cream envelope in one gloved hand, with a blank cream letter peeking out. Its other hand gestures toward a small simple sunny-yellow desk calendar beside it. Calendar has only a few clean black square cells, absolutely no letters or numbers. The open envelope is the primary prop. Remove the star bookmark from the reference for this version.
```

## reading-weekend.png

```text
Use case: illustration-story
Asset type: production transparent PNG illustration for one of three matching English-reading website cards, landscape 4:3 canvas.
Input image: the attached image is the exact character identity and visual style reference. Preserve the same original purple/lavender and blue open-book mascot: creamy pages, blue round glasses, large friendly oval eyes, pink cheeks, smiling face, rubber-hose black limbs, cream gloves, orange shoes, chunky black outlines. Its book cover shape, facial identity, colors, proportions, and outline weight must visibly match the reference.
Style/medium: clean retro rubber-hose editorial cartoon, sophisticated playful neobrutalism, flat solid fills, consistent bold hand-drawn black outlines. Limited palette: lavender, blue, warm cream, orange, sunny yellow, lime accent, black. Do not add gradients or shaded modelling. This is a coherent asset set using the exact same book character.
Composition: a standalone complete composition on a 4:3 horizontal canvas, whole book character fully visible, total figure and props contained in the central 76% of the canvas width and height, leaving approximately 12% transparent padding on ALL FOUR sides. Main character approximately 70% of canvas height. Balance main character and the small theme props as a single compact friendly composition. Every limb, page corner, shoe and prop stays fully inside the frame. The character proportions and illustration scale should be consistent across the set.
Scene/backdrop: truly transparent alpha background, no solid-color backdrop, no room or landscape, no floor, no cast shadow.
Constraints: no written text or numbers anywhere, no letters, no logos, no watermark, no photorealistic elements, no realistic scenery, no oil paint, no 3D, no gradients, no background decoration.
Theme: comfortable everyday reading. The SAME full-body purple-blue book character is sitting comfortably with orange-shoed feet visible, happily reading a little open warm-cream and yellow book held in its gloved hands. Place one small orange coffee cup and saucer beside it, drawn in the same simple chunky outline style. The little book is blank with no text. No chair or furniture is needed. Remove the star bookmark from the reference for this version.
```

## reading-travel.png

```text
Use case: illustration-story
Asset type: production transparent PNG illustration for one of three matching English-reading website cards, landscape 4:3 canvas.
Input image: the attached image is the exact character identity and visual style reference. Preserve the same original purple/lavender and blue open-book mascot: creamy pages, blue round glasses, large friendly oval eyes, pink cheeks, smiling face, rubber-hose black limbs, cream gloves, orange shoes, chunky black outlines. Its book cover shape, facial identity, colors, proportions, and outline weight must visibly match the reference.
Style/medium: clean retro rubber-hose editorial cartoon, sophisticated playful neobrutalism, flat solid fills, consistent bold hand-drawn black outlines. Limited palette: lavender, blue, warm cream, orange, sunny yellow, lime accent, black. Do not add gradients or shaded modelling. This is a coherent asset set using the exact same book character.
Composition: a standalone complete composition on a 4:3 horizontal canvas, whole book character fully visible, total figure and props contained in the central 76% of the canvas width and height, leaving approximately 12% transparent padding on ALL FOUR sides. Main character approximately 70% of canvas height. Balance main character and the small theme props as a single compact friendly composition. Every limb, page corner, shoe and prop stays fully inside the frame. The character proportions and illustration scale should be consistent across the set.
Scene/backdrop: truly transparent alpha background, no solid-color backdrop, no room or landscape, no floor, no cast shadow.
Constraints: no written text or numbers anywhere, no letters, no logos, no watermark, no photorealistic elements, no realistic scenery, no oil paint, no 3D, no gradients, no background decoration.
Theme: practical travel reading. The SAME full-body purple-blue book character is walking jauntily, holding a folded-open warm-cream map in one glove and pulling a small sunny-yellow rolling suitcase with the other glove. The map shows only simple blue and green route-like lines and a small location marker, no letters or numbers. The suitcase is compact and unobscured, with two wheels and a handle. Remove the star bookmark from the reference for this version.
```

## Background correction edit

Mode: built-in image_gen, one parallel batch of three background-only edits. The original reading-work.png, reading-weekend.png, and reading-travel.png were individually supplied as edit targets through referenced_image_paths. Outputs saved as sibling *-final.png files. No transparency was requested for these final edits.

```text
Use case: precise-object-edit
Asset type: production website reading-card illustration background correction.
Input image: the supplied PNG is the EDIT TARGET, not a style reference.
Primary request: change ONLY the background. Remove the checkerboard pattern painted in the background and replace it with a completely opaque, perfectly uniform solid cream-yellow color with exact hex value #f9ebaf (RGB 249,235,175). Fill every background region with that same solid color, including all open gaps between the character's arms, legs, shoes, props, and body. Preserve the entire foreground character and every prop precisely as in the supplied image.
Invariants: keep the exact same book mascot, face, glasses, facial expression, page shapes, hands, limbs, shoes, pose, props, outlines, foreground colors, illustration style, foreground scale, position, and complete composition. Preserve original 4:3 canvas aspect ratio. This is strictly background replacement; do not redesign, redraw, move, crop, add, or remove any foreground element.
Background constraints: fully opaque solid #f9ebaf only; no checkerboard, no grid, no pattern, no transparency, no gradient, no shadow, no vignette, no lighting variation, no texture. No added text or logo.
```

