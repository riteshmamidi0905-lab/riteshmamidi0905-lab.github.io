# Deliverables

## `linkedin/` — profile image for review
These are derived **only from the approved portrait** (`linkedin-avatar.webp`). Nothing was uploaded to LinkedIn.

| file | what it is |
|---|---|
| `linkedin-profile-master-2048.png` | 2048² square master: the portrait cropped to head and shoulders, smoothly upscaled from the 510 px source with mild sharpening. **It is a 4× upscale, not new detail.** |
| `linkedin-profile-800.jpg` | 800² optimized upload size |
| `linkedin-circle-preview.png` | how LinkedIn's circular crop will frame it |

A true canonical *anime* profile portrait requires an image generator. The prompt and identity notes are in `assets/avatar/README.md` (row "LinkedIn master"). Generate it from the approved portrait, review it, and upload it yourself.

## `film/` — launch film
`ritesh-portfolio-launch-1080x1350.mp4` (4:5, 30 fps), `.srt` / `.vtt` captions, and a poster frame. The film is rendered from the live site (`?capture=film`); captions are burned in and also provided as sidecar files for platforms that accept them. It has no audio track; narration can be added later without re-rendering the visuals.
