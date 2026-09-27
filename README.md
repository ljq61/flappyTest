# flappyTest

A lightweight vertical Flappy-style web game built with Three.js.

## Play

GitHub Pages: https://ljq61.github.io/flappyTest/

## Controls

- Tap / click / Space / Arrow Up to flap upward.
- Pass between the obstacle tips to score.
- Obstacles randomly use a pencil, utility knife, or closed umbrella.
- The upper and lower obstacle tips always face the center gap.
- Best score is stored locally in the browser.

## Character art

The current player is a generated placeholder. When the final transparent character PNG is ready:

1. Add it to `assets/character.png`.
2. In `src/main.js`, change `CHARACTER_IMAGE_URL` to `./assets/character.png`.
3. Adjust `player.scale` and `PLAYER_RADIUS` only if the artwork needs a different visual/collision size.

## Deployment

`.github/workflows/pages.yml` deploys `main` automatically to GitHub Pages after every push.
