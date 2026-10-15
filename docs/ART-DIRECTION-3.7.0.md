# Atmosphere and creature personality — 3.7.0

## Direction

A cozy expedition across sky islands, with traces of old star magic. Warm foreground characters
and paths remain readable against quieter, cooler distance. The important moment owns the visual
focus; spectacle should not compete with navigation or add explanatory paragraphs.

This release establishes that direction in one representative location, two species, and guardian
entrances. It is not a claim that every island, creature, effect or screen has been redesigned.

- Whisperwood gains cool teal depth and a weathered, broken star dial in its background. The dial
  is scenery, with no collectible glow, interaction or moving layer. Existing background cache
  limits and raster dimensions are unchanged.
- Sunkit pauses, gathers itself and lifts its chest. Breezle tilts its head, then makes two light
  hops. Their timing and silhouettes differ; gestures use existing sprite frames and transforms,
  with no new sprite atlas entries. Each also has a distinct short synthesized call.
- Whisperwood gets a slower 76 BPM theme with space between notes, soft wood-like tones and sparse
  chimes. It schedules 38 note events per loop versus 164 in the meadow theme; this is a composition
  count, not a measured CPU saving. Low-level environmental sounds occur every 10–18 seconds of
  active exploration, through the existing update loop and shared audio graph.
- Each guardian enters with their existing island seal, name, character and first partner. A
  single short presentation replaces the previous generic sequence. It lasts 1.8 seconds, or
  0.7 with fast battles, rematches or reduced motion, and can be skipped immediately. It calls
  the existing platform gameplay stop/start hooks. Changing enemies does not repeat it.
- Forest ambient decoration drops from 16 particles to 8; other locations use 12, lite mode 6.
  System reduced-motion preference removes exploration ambient particles and shooting stars,
  idle bobbing/loops and personality gestures, guardian entrance motion, battle idle loops,
  screen shake and flash. It does not yet replace every combat/movement animation.

## Evidence behind the choices

These sources informed the design; the visual direction and compositions are project decisions:

- [Poki quality requirements](https://developers.poki.com/guide/requirements-quality): fast entry,
  skippable cinematic sequences, intuitive interaction, mobile and lifecycle considerations.
- [web.dev animation guide](https://web.dev/articles/animations-guide): prefer transform/opacity
  for runtime motion and avoid unnecessary layout/paint work. New gestures reuse that path.
- [GDC: 2D Animation overview](https://gdcvault.com/play/1027041/Game-Career-Seminar-2D-Animation):
  anticipation, timing and reaction are useful tools for character animation. Only the publicly
  available session overview was reviewed, not the full talk.
- [Android game optimization](https://developer.android.com/games/optimize/overview): performance,
  memory and thermal behavior ultimately require profiling on target devices.

## Reproducible validation

`node tools/atmospherecheck.js` checks gesture bounds, termination, unchanged world coordinates,
Breezle sprite/pose synchronization, reduced-motion resting state, music structure and muted SFX.
It runs in CI with the existing data, art, save, battle, resource lifecycle and build checks.

With `python tools/devserver.py 8792` running:

```bash
CHROME=/usr/bin/chromium CHROME_FLAGS=--no-sandbox VW=320 VH=640 DPR=2 MOBILE=1 \
  node tools/shot.js /tmp/orbling-atmosphere tools/runtime/atmosphere.json
```

The browser scenario checks all six guardians in nine languages; skip geometry and a real click;
player fighter identity, energy and status across an enemy replacement; leaving during a reveal;
fast/reduced entrances; live OS motion preference changes; lite particle limits; and the forest
at four times of day. Offline Web Audio renders the forest composition and cancelled cue sources,
checking finite samples, no clipping in that isolated mix and completed oscillator cleanup.

Validated layouts: 320×640 portrait and 640×360 landscape, all 54 guardian/language
combinations in each. A 360×640 Poki-corner check under 4× CPU throttling found no reserved-area
UI collisions and a 50.7 px skip target; 40 synchronous gestures left the art caches unchanged.
The isolated forest audio render peaked at 0.0544 full scale and left zero
oscillators connected. These figures describe this test mix, not the combined game audio.

These are isolated Chromium tests, not measurements from the player's Android phone. The capture
runner disables GPU and mutes output; offline audio checks do not replace listening on phone
speakers/headphones. The forest has no new persistent animation timer or background audio loop.
Existing music/environment note tails can finish after a scene change (up to a few seconds);
they disconnect on completion. The guardian cue is explicitly cancelled on skip/scene exit.

Before store release: actual Android/Poki device profiling, perceptual audio balancing, and player
observation of the atmosphere and navigation remain necessary. No save schema changes are made.
