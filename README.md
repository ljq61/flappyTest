# flappyTest

A lightweight vertical Flappy-style web game built with Three.js.

## Play

GitHub Pages: https://ljq61.github.io/flappyTest/

## Controls

- Tap / click / Space / Arrow Up to flap upward.
- Pass between the obstacle tips to score; best score is stored locally in the browser.
- Obstacles randomly use a pencil, a snap-off utility knife, or a rude hand; the tips always face the gap.
- You start with 3 hearts. Hitting an obstacle or the ceiling costs one heart (with a brief invulnerability window); falling off the bottom ends the run unless you are invincible.
- Obstacles start drifting up and down once you pass score 20.

## Pickups

- Dorayaki: restores one heart.
- Poison bottle: costs one heart.
- Star: 5 seconds of invincibility — rainbow hero, a countdown pill above the head, floor bounces, and a faster pitched-up BGM variant that switches in and out instantly.
- Pity timers (a round is one obstacle pair): a poison is guaranteed within the first 5 rounds, a dorayaki within 10, and a star within 15. Natural spawn chances are unchanged; forced drops bypass the pickup cooldown.

## Versioning & art

- The active game version is selected by the `<script>` tag in `index.html` (currently `src/game-v8.js`; v2–v7 are kept as history).
- The hero sprite comes from `HERO_IMAGE_URL` in `src/hero-data.js` (a base64 WebP data URI). Replace that export — or point it at `./assets/character.png` — to swap the character; adjust `PW`/`PH` in `src/game-v8.js` if the artwork needs a different visual size.

## Audio

- All audio is WebAudio: a synthesized MIDI BGM loop plus short SFX. The SFX are fetched and decoded up front so the first playback never stutters.

## Deployment

`.github/workflows/pages.yml` deploys `main` automatically to GitHub Pages after every push.
