# Mobile UX 3.6.0

The objective stays visible, while optional information opens on demand. A collected duplicate
shows only “In collection ×2”; its individual level and stats can be compared from its detail
page. Team and menu screens have no permanent explanatory paragraphs. Icons keep short labels
where their meaning would otherwise be ambiguous.

- Exit arrows are named buttons, above character hit regions. They use the existing travel handler.
- Tapping the objective opens the actual trainer roster with saved victories, destinations and route actions.
  The guardian still requires the island's trainers; the meadow-to-forest exit does not.
- Base access starts after the first catch, consistently in navigation and progression checks.
- Portrait navigation has Map, Team, Base and Menu. On the map, Map becomes Back.
  Secondary destinations move to Menu. Poki's reserved corner remains clear.
- Three party cards share one row, exposing storage without scrolling past giant portraits.
  Available evolution is marked on the card; individual management stays in the detail page.
- Captured-species badges show the current number owned. A historical Codex entry is not counted
  as an owned creature. Separate individuals retain their stats and levels.
- Deferred medal and reward notifications wait for menus, dialogue, zone banners, Pip instructions,
  battles and transitions. They share one visible slot. Immediate error/action feedback is not deferred.

## Verification

Static/data/art, save and battle regressions, rendering lifecycle checks, and web/Poki/CrazyGames
builds pass. Browser scenarios exercise real coordinate clicks on the objective and exit, trainer
routes, direct Base access, storage visibility, comparison, catch confirmation, all nine menu/guide
translations, and notification sequencing.

With `python tools/devserver.py 8792` running:

```bash
CHROME=/usr/bin/chromium CHROME_FLAGS=--no-sandbox VW=390 VH=844 DPR=2 MOBILE=1 \
  node tools/shot.js /tmp/orbling-ux tools/runtime/mobile-ux.json
URL='http://127.0.0.1:8792/index.html?pill=1' \
  CHROME=/usr/bin/chromium CHROME_FLAGS=--no-sandbox VW=360 VH=640 DPR=2 MOBILE=1 \
  node tools/shot.js /tmp/orbling-poki tools/runtime/mobile-ux.json
CHROME=/usr/bin/chromium CHROME_FLAGS=--no-sandbox VW=360 VH=640 DPR=2 MOBILE=1 \
  node tools/shot.js /tmp/orbling-notices tools/runtime/notification-focus.json
```

Additional checks covered the fresh tutorial catch/save and a duplicate catch/wild battle at 360×640.
The main scenario also rotates to 844×390. Tests use isolated Chromium profiles and simulated mobile
viewports. They do not establish real-device Android performance, production Poki SDK acceptance,
or Google Play readiness. Android packaging, lifecycle/back-button integration and device testing
remain separate release checks. No save format or player progress migration was needed.
