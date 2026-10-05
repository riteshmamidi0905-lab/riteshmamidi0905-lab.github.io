# Avatar system

The site is hosted by an avatar of Ritesh. All personas are the *same character*; they differ only in pose, expression, props and lighting.

## What exists today
`ritesh-cutout-510.webp` / `ritesh-cutout-1020.webp` — the approved portrait (`linkedin-avatar.webp`) with its background removed and the shoulders faded to transparent (made locally with the open-source `u2net_human_seg` model; the 1020px file is a smooth 2× upscale of the 510px source, not new detail). Every persona currently uses this cut-out, with a persona-coloured rim light applied in CSS.

## Dropping in generated art
1. Generate each asset below (square-ish, **transparent background**, WebP, ≥1400px tall master; export 700px and 1400px).
2. Save as `assets/avatar/<persona>.webp` and `<persona>@2x.webp`.
3. In `manifest.json` set that persona's `file`, `file2x`, `w`, `h`.
4. `npm run build` — pages, scenes, explainers and capture modes pick it up automatically.

## Identity bible (must hold for every persona)
Voluminous, swept-up dark hair with a defined side texture · full mustache with light stubble along the jaw · warm medium-brown skin · small stud earring on the left ear · friendly, confident, mature (late 20s) · premium mature anime × semi-realistic rendering · professional, recruiter-friendly. Avoid chibi, childish proportions, cyberpunk clutter, gamer-streamer styling.

## Prompts (use the approved portrait as the reference image for every one)
Common suffix: *premium mature anime, semi-realistic character design, cinematic rim light in <accent>, transparent background, no text, no logos, no watermark, consistent identity with the reference.*

| file | persona | prompt |
|---|---|---|
| `hero` | Opening host | Head and shoulders, three-quarter turn toward camera, calm confident half-smile, dark charcoal blazer over a white tee, subtle teal rim light. |
| `ai` | AI Ritesh | Waist-up, one hand raised in a precise pointing gesture toward the upper left, attentive expression, thin teal light traces on the blazer shoulder. |
| `data` | Data Ritesh | Waist-up, slight lean forward, one hand sweeping left-to-right as if guiding a stream, blue rim light. |
| `research` | Research Ritesh | Waist-up, chin slightly lowered, thoughtful analytical expression, one hand near the chin, violet rim light. |
| `product` | Product Ritesh | Waist-up, open-handed explaining gesture, warm confident smile, amber rim light. |
| `builder` | Builder Ritesh | Waist-up, sleeves slightly rolled, arms relaxed and crossed loosely, determined friendly expression, teal rim light. |
| `presenter` | Presenter Ritesh | Waist-up, facing camera, both hands open at chest height, welcoming expression. |
| `contact` | Contact Ritesh | Head and shoulders, direct eye contact, warm smile, relaxed posture, teal rim light. |
| LinkedIn master | LinkedIn Profile Ritesh | Square master ≥2048², head and shoulders, face large and centred, direct eye contact, confident and friendly, dark understated background, restrained teal/mint light, nothing else in frame. Designed for LinkedIn's circular crop. **Do not upload automatically — review first.** |

Expression sets for animation (optional, same pose, separate layers or frames): eyes open/blink, mouth closed/speaking, brows neutral/raised.

## Slots (V2)

Drop a transparent PNG/WebP named `<persona>.webp` (or `.png`, optional `<persona>@2x.webp`) into this folder, run `node build.js`,
then `npm run avatar:check`. No code changes: the aspect ratio is read from the file and the layout adapts. Personas: see `manifest.json`.
Until a slot is filled, the portrait cut-out fallback is used. Worlds and flagship scenes are deliberately avatar-free.
