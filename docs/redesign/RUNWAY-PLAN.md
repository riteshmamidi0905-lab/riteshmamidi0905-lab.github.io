# Runway assessment and production plan (D-90) — NOTHING PURCHASED OR GENERATED
Status: **research only; no account was created, no credits spent, no asset generated.** Paid use requires your explicit approval.

## What the (secondary, snippet-level) sources say — verify on Runway's own pages before any purchase
* Plans reported for 2026: Free (one-time 125 credits), Standard about $15/month (625 credits), Pro about $35/month (2,250 credits), Max about $95/month (9,500); annual billing cheaper ([lumalabs.ai comparison](https://lumalabs.ai/news/runway-pricing), [creatify.ai](https://creatify.ai/blog/runway-pricing-(2026)-plans-credits-and-what-you-ll-actually-pay), [magichour.ai](https://magichour.ai/blog/runway-gen-45-pricing)).
* Credit burn reported: Gen-4 Turbo about 5 credits/second, Gen-4.5 about 12; one source says some cards show 6 for Turbo ([flexprice.io](https://flexprice.io/pricing-index/runway)). API credits reported at $0.01 each; ProRes/PNG-sequence output and HDR cost extra credits per second.
* **Not found:** output pixel resolution per model, maximum clip length, and whether paid plans grant commercial rights to outputs. These three facts decide whether Runway can be used at all and **must be read from Runway's terms and docs** (not retrievable from this sandbox).

## Does it materially improve this portfolio?
Probably not for the core. The strongest content is *real*: recorded runs, architecture, tests. Generated footage cannot show those and must never be used to imply functionality. It could add value only as **clearly-labelled atmosphere** (e.g., a transition between worlds). The current candidate achieves cinematic feel with a code-drawn canvas (≈ 4 KB) and passes Lighthouse mobile 97–100 with **no video at all**; the reviewed-release validator currently forbids video, so adopting any footage also means changing that guard deliberately.

## Production plan (only if you approve spend)
| Asset | Purpose | Placement | Duration · aspect | Expected output | Est. cost | Iterations | Fallback |
|---|---|---|---|---|---|---|---|
| Ambient "signal field" loop | atmosphere behind the hero canvas, labelled illustrative | hero background, desktop only | 6 s · 16:9, seamless loop | 720p–1080p (unverified) | 6 s × 5 cr = 30 cr per attempt | 4 → ~120 cr | existing canvas (already shipped) |
| World transition ×3 (AI→Data→Systems) | abstract colour/line transitions | between world panels | 4 s · 16:9 | as above | 20 cr per attempt ×3 clips | 3 each → ~180 cr | CSS gradient wipe |
| Flagship intro film | none planned: footage of "the system working" would be fabricated | — | — | — | — | — | the replay player |
**Total if all approved:** about 300 credits ≈ within one Standard month ($15 reported) plus compositing time; AV1/H.264 encode with ffmpeg to ≤ 1.5 MB per clip, poster frame, `prefers-reduced-motion` and `save-data` fallbacks, lazy loading below the fold. Estimates use the reported 5 credits/second and are unverified.
**Recommendation:** do not buy Runway for this release. Revisit after the interactive pages are approved; if desired, start with the free 125-credit tier to test the single ambient loop.
