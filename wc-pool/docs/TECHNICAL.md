# WC2026 Pool — Technical Document

## Architecture Overview

The app is a single-page React application with a Firestore backend. All application logic, components, and styling live in a single file (`src/App.jsx`, ~1750 lines). There is no router, no CSS files, and no server-side code.

```
Browser (React SPA)
    ↓ reads/writes
Firestore (collection: "pool")
    ↑ onSnapshot (real-time sync)
Browser (all connected clients)
```

**Hosting:** Firebase Hosting (static files served from `dist/`)  
**Database:** Cloud Firestore (single collection, document-per-key)  
**Live URL:** https://wc2026game.web.app  
**Firebase Project:** `wc2026game`

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| UI Framework | React | 19.2.6 |
| Build Tool | Vite | 8.0.12 |
| Database | Firebase/Firestore | 12.14.0 |
| Hosting | Firebase Hosting | — |
| Fonts | Google Fonts (Anton, DM Sans, DM Mono) | CDN |

No additional libraries — no state management, no CSS framework, no router.

---

## Project File Structure

```
wc-pool/
├── src/
│   ├── App.jsx          # All components, logic, and styling (single file)
│   ├── firebase.js       # Firebase initialization and config
│   └── main.jsx          # React entry point
├── public/               # Static assets (empty)
├── index.html            # HTML shell with root div
├── package.json          # Dependencies and scripts
├── vite.config.js        # Vite configuration
├── firebase.json         # Firebase Hosting config (SPA rewrite, dist/)
├── firestore.rules       # Firestore security rules
├── .firebaserc           # Firebase project binding
├── analytics.mjs         # Standalone Node.js script for data export/analysis
└── docs/
    ├── FUNCTIONAL-DESIGN.md
    └── TECHNICAL.md
```

---

## Firestore Data Model

All data lives in a single Firestore collection called `pool`. Each document stores a `value` field containing the actual data and a `key` field for reference.

### Namespace Isolation

```javascript
const SANDBOX = import.meta.env.DEV;      // true in dev, false in production build
const NS = SANDBOX ? "wc26test:" : "wc26:";
```

Production and sandbox share the same Firestore instance but use different key prefixes, so they never interfere with each other.

### Document ID Encoding

Firestore document IDs cannot contain colons, so they are converted:

```javascript
const docId = (key) => key.replaceAll(":", "__");
// "wc26:results" → "wc26__results"
// "wc26:player:john-smith" → "wc26__player__john-smith"
```

### Documents

**`wc26__results`** — Tournament state (single document)
```json
{
  "key": "wc26:results",
  "value": {
    "scores": {
      "1": { "hg": 2, "ag": 0, "by": "openfootball", "at": "2026-06-11T20:00:00Z" },
      "2": { "hg": 1, "ag": 1, "by": "Jason", "at": "2026-06-11T21:30:00Z" }
    },
    "advanced": {
      "r32": [],
      "r16": ["France", "Spain", ...],
      "qf": [],
      "sf": [],
      "final": [],
      "champ": []
    },
    "advancedMeta": {
      "r16": { "by": "openfootball", "at": "..." }
    },
    "koScores": {
      "73": { "a": "South Africa", "b": "Canada", "ft": [2, 0], "et": null, "pen": null, "winner": "South Africa", "by": "openfootball", "at": "..." },
      "75": { "a": "Netherlands", "b": "Morocco", "ft": [1, 1], "et": [1, 1], "pen": [4, 2], "winner": "Netherlands", "by": "openfootball", "at": "..." }
    },
    "manualOrder": {
      "A": ["Mexico", "South Korea", "Czechia", "South Africa"]
    },
    "manualThird": ["Scotland", "Egypt", ...],
    "revealed": true,
    "editingOpen": false,
    "feedAt": "2026-06-17T12:00:00Z",
    "announcements": [
      { "text": "Welcome to the pool!", "by": "Jason", "at": "2026-06-10T..." }
    ]
  }
}
```

**`wc26__players`** — Player registry
```json
{
  "key": "wc26:players",
  "value": {
    "jason": "Jason",
    "gary": "Gary",
    "daaaaaaaave": "Daaaaaaaave"
  }
}
```

**`wc26__player__jason`** — Individual player data (one per player)
```json
{
  "key": "wc26:player:jason",
  "value": {
    "name": "Jason",
    "locked": true,
    "picks": {
      "scores": {
        "1": { "hg": 2, "ag": 1 },
        "2": { "hg": 0, "ag": 0 }
      },
      "advanced": {
        "r16": ["France", "Spain", ...],
        "qf": ["France", ...],
        "sf": ["Spain", "France", "Argentina", "Portugal"],
        "final": ["Spain", "France"],
        "champ": ["Spain"]
      }
    }
  }
}
```

**`wc26__analysis`** — Frozen analysis editions (array of snapshots)
```json
{
  "key": "wc26:analysis",
  "value": [
    {
      "id": "round2",
      "title": "Round 2 — The Plot Thickens",
      "headline": "THE PLOT THICKENS",
      "publishedAt": "2026-06-24T04:02:47.017Z",
      "roundLabel": "Second round",
      "tagLabel": "MATCHDAY 3-4",
      "matchRange": [25, 48],
      "previewRange": [49, 72],
      "previewLabel": "Round 3",
      "previewTagLabel": "MATCHDAY 5-6",
      "cards": ["matchday", "standings-movement", "consensus", "preview"],
      "snapshot": {
        "playerPicks": { "Jason": { "scores": {...}, "advanced": {...} }, ... },
        "results": { "scores": {...}, "advanced": {...} }
      }
    },
    {
      "id": "round1",
      "title": "Round 1 — Opening Salvo",
      "headline": "THE CRYSTAL BALL IS CRACKED",
      "publishedAt": "2026-06-24T04:02:37.610Z",
      "roundLabel": "First round",
      "tagLabel": "MATCHDAY 1-2",
      "matchRange": [1, 24],
      "previewRange": [25, 48],
      "previewLabel": "Round 2",
      "previewTagLabel": "MATCHDAY 3-4",
      "cards": ["matchday", "knockout-vision", "consensus", "preview"],
      "snapshot": { ... }
    }
  ]
}
```

Each edition freezes all player picks and match results at the time `analytics.mjs` is run. The Analysis tab renders cards from each edition's frozen data, so analysis doesn't change as new match results come in. Editions are stored newest-first; the latest edition renders fully expanded while older editions are collapsed behind a clickable chevron.

**Edition fields:**
- `id` — Unique identifier (e.g., "round1", "ko-r16")
- `title` — Display title shown in the edition header
- `headline` — Large heading for the matchday report card (unique per edition)
- `matchRange` — `[first, last]` match numbers for this edition's analysis
- `previewRange` — `[first, last]` match numbers for the look-ahead preview card
- `cards` — Array of card types to render: `"matchday"`, `"standings-movement"`, `"knockout-vision"`, `"consensus"`, `"preview"`, `"survivors"`, `"broken-brackets"`, `"collisions"`, `"question"`, `"title-race"`, `"odds-ends"`, `"scenarios"`, `"chaos"`
- `stage` — (knockout editions) descriptor driving the generic knockout cards: `wonKey`/`wonLabel` (round the survivors reached), `nextKey`/`nextLabel`/`nextTitle`/`nextShort`/`nextPlace` (round they play toward), `gamesTag`, `lockedLabel`. Omitted editions fall back to `DEFAULT_STAGE` (post-Round-of-32 semantics).
- `scenarioTeams` — (scenarios card) array of champion teams to build "Road to Glory" cards for
- `collisionNote` / `customTidbits` — optional editorial content for the collisions / odds-ends cards

### Firestore Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /pool/{doc} {
      allow read, write: if true;
    }
  }
}
```

Fully open — any client can read or write any document. Appropriate for a trusted friend group; would need authentication for a public-facing app.

---

## Storage Abstraction Layer

Four async functions abstract all Firestore operations, maintaining the same signatures as the original localStorage-based version:

```javascript
async function sGet(key)
// Reads pool/{docId(key)}.value. Returns null if not found.

async function sSet(key, val)
// Writes {value: val, key: key} to pool/{docId(key)}.

async function sList(prefix)
// Firestore document-ID range query (orderBy(documentId()) + startAt(pfx)/endAt(pfx+"")).
// Fetches ONLY docs whose ID begins with the prefix — not the whole collection — so the large
// analysis doc and the other namespace's docs are never downloaded. No custom index needed.

async function sDelete(key)
// Deletes pool/{docId(key)}.
```

---

## Real-Time Sync

```javascript
const LIVE_ENABLED = true;

function liveSubscribe(onChange) {
  const unsubs = [
    onSnapshot(doc(db, "pool", docId(K_RESULTS)), () => onChange()),
    onSnapshot(doc(db, "pool", docId(K_PLAYERS)), () => onChange()),
  ];
  return () => unsubs.forEach((u) => u && u());
}
```

- Subscribes to just the two documents that change live during the tournament — `results` (scores, advancement, announcements) and the `players` registry — **not** the whole collection.
- A change to either triggers a refresh of results, players, and standings; standings recompute from the results-doc listener.
- Cleaned up on component unmount.

**Why targeted listeners (cold-load performance):** a collection-wide `onSnapshot`/`getDocs` downloads *every* document on first load, including the analysis document — which grows ~35 KB per published edition and had reached ~136 KB. Combined with `sList`'s document-ID range query, cold load dropped from ~319 KB to ~40 KB and no longer grows each round. The analysis document is fetched lazily (`sGet(K_ANALYSIS)`) only when the Analysis tab is opened. Trade-off: other clients no longer live-update on a *player pick* edit (moot post-deadline, since picks are locked).

---

## Auto-Feed Pipeline

The same feed drives both the group stage (matches 1–72) and the knockout stage (matches 73–104).

```
openfootball/worldcup.json (GitHub raw)
    ↓ fetch every 15 min
    ├─ parseFeedScores(json)        → group matches 1–72
    │     ↓ normalize team names via FEED_ALIASES
    │     ↓ look up match ID via matchByTeams index
    │     ↓ skip if manual entry exists (by !== "openfootball")
    │     ↓ merge into results.scores
    └─ parseFeedKnockout(json)      → knockout matches 73–104
          ↓ normalize team names; skip unresolved placeholder slots
          ↓ determine winner: penalties → extra time → full time
          ↓ store match result in results.koScores[num]
          ↓ deriveAdvancedFromKO() → results.advanced (R16…Champion)
          ↓ skip any round a human edited (advancedMeta.by !== "openfootball")
sSet(K_RESULTS, updatedResults)
```

**Feed URL:** `https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json`  
**Interval:** 15 minutes (`FETCH_INTERVAL_MS = 15 * 60 * 1000`)

**Team Name Aliases:**
```javascript
const FEED_ALIASES = {
  "United States": "USA",
  "Côte d'Ivoire": "Ivory Coast",
  "Curaçao": "Curacao",
  "Korea Republic": "South Korea",
  "IR Iran": "Iran",
  "Turkey": "Türkiye",
  "Czech Republic": "Czechia",
  "Congo DR": "DR Congo",
  "Bosnia-Herzegovina": "Bosnia and Herzegovina",
  "Bosnia & Herzegovina": "Bosnia and Herzegovina",
};
```

**Merge Rules (group stage):**
- Feed scores include `by: "openfootball"` metadata
- If a score already exists with `by` set to something other than `"openfootball"`, the feed does not overwrite it (manual entries take priority)
- Feed updates `feedAt` timestamp on each sync

**Knockout Rules (matches 73–104):**
- `parseFeedKnockout` reads only matches numbered 73–104 that have a final-time score and two resolved team names (placeholder slots like `3A/B/C/D/F` or `W74` are skipped until the feed fills them in)
- Winner is decided by `koWinnerFromScore`: penalty shootout (`score.p`) → after extra time (`score.et`) → full time (`score.ft`)
- Each result is stored in `results.koScores[num]` as `{ a, b, ft, et, pen, winner, by, at }`
- `deriveAdvancedFromKO(koScores)` walks the `KNOCKOUT` bracket and collects winners into `results.advanced` (R32 winners → `r16`, R16 winners → `qf`, … Final winner → `champ`), which drives live scoring and the Bracket/Standings tabs
- **Manual override per round:** if a round's `advancedMeta[round].by` is a human (not `"openfootball"`), the feed leaves that round untouched, so a hand correction is never clobbered
- R32 *qualification* is still computed from group standings (`computeQualifiers`), independent of `koScores`; the knockout feed only governs R16 onward

---

## Scoring Engine

### Group Table Computation

`computeGroupTable(g, scores, manualOrder)` → `{ group, table, complete, ties, unresolved }`

- Iterates matches for group `g`, applies standard 3/1/0 point system
- Sorts by: points → goal difference → goals for
- Detects ties (teams with identical pts/gd/gf)
- If `manualOrder[g]` is set, uses it to break ties

### Qualifier Computation

`computeQualifiers(scores, manualOrder, manualThird)` → `{ tables, allComplete, r32, top2, best8, pendingTies, thirdTies }`

- Computes all 12 group tables
- Extracts top 2 from each group (24 teams)
- Ranks all 12 third-place teams, selects best 8
- Handles manual overrides for tied third-place teams at the cutoff
- Returns the full 32-team R32 field

### Player R32 Derivation

`playerR32(picks)` → `{ r32: [...teams], complete: boolean }`

- Same algorithm as `computeQualifiers` but applied to the player's predicted scores
- Only produces results if the player has predicted all 72 matches

### Scoring

`scorePlayer(picks, results)` → `{ total, breakdown: { group, r32, r16, qf, sf, final, champ } }`

- **Group:** Compare predicted vs actual outcome for each match (+1 per correct)
- **R32:** Compare player's derived R32 vs actual R32 (+2 per matching team)
- **R16–Champion:** Compare player's advanced picks vs actual advanced lists (+pts per matching team)

### Outcome Comparison

```javascript
function predOutcome(score) {
  if (!score || score.hg == null || score.ag == null) return null;
  return score.hg > score.ag ? "H" : score.hg < score.ag ? "A" : "D";
}
```

Only the outcome matters (H/D/A), not the exact score.

---

## Component Inventory

### Layout Components
| Component | Props | Role |
|-----------|-------|------|
| `Shell` | children | Max-width wrapper, font imports, global styles |
| `Header` | tab, setTab, pastDeadline, deadline, now, feedStatus, feedAt, onReset, confirmReset, editingOpen | Nav bar, tabs, deadline counter, feed status |
| `Footer` | — | Scoring rules explanation |
| `Eyebrow` | children | Uppercase label styling |

### Page Components
| Component | Props | Role |
|-----------|-------|------|
| `Join` | nameInput, setNameInput, onJoin, players, announcements, pastDeadline | Entry screen (pre/post deadline variants) |
| `PlayTab` | playerName, picks, editable, locked, pastDeadline, setScorePick, toggleAdvance, onSave, onLock, onUnlock, onSwitch | Player's pick management hub |
| `GroupPicks` | picks, editable, setScorePick, myR32info | 72-match score prediction grid |
| `KnockoutPicks` | picks, editable, toggleAdvance, myR32info | Knockout round team picker |
| `Tables` | qual | Live group standings display |
| `Bracket` | advanced, koScores | March Madness–style knockout bracket (R32 locked from group tables; later rounds + scores auto-fill from the feed) |
| `Standings` | rows, autoReady | Player leaderboard |
| `LeaguePicks` | entries, revealed | All players' brackets viewer |
| `Updates` | announcements, onPost, onDelete, isCommissioner | Announcement board |
| `Results` | results, setScore, toggleResultAdvance, qual, setManualOrder, setManualThird, feedStatus, feedAt, onToggleReveal, confirmReveal, setConfirmReveal, onToggleEditing | Commissioner scoring interface |

### Utility Components
| Component | Props | Role |
|-----------|-------|------|
| `ScoreBox` | value, onChange, disabled | Number input for match scores |
| `SegBtn` | options, value, onChange | Segmented button group |
| `TieResolver` | label, teams, current, onSet | Interactive tiebreaker UI |

### Analysis Components
| Component | Props | Role |
|-----------|-------|------|
| `Analysis` | editions | Blog-style analytics page with multiple collapsible editions, each rendered from a frozen Firestore snapshot |
| `HBar` | data, maxVal, barColor, height, showPct, total | Horizontal bar chart |
| `DotRow` | label, outcomes, playerNames, total | Dot matrix for match outcome distribution |

The Analysis component uses internal render functions for each card type. Group/pre-knockout cards: `renderMatchdayReport`, `renderStandingsMovement`, `renderKnockoutVision`, `renderConsensusCard`, `renderPreviewCard`, `renderKnockoutPreview`. Knockout cards: `renderSurvivors`, `renderBrokenBrackets`, `renderCollisions`, `renderQuestion`, `renderTitleRace`, `renderOddsEnds`, `renderScenarios`, `renderChaos`. Each edition's `cards` array determines which render functions are called.

**Stage-driven knockout cards.** The knockout cards are generic — driven by the edition's `stage` descriptor rather than hardcoded round keys — so the same code serves each knockout edition (post-R32 = "Round of 32 — The Cull", post-R16 = "Round of 16 — The Elite Eight", and future rounds). `stage.wonKey` is the round the survivors reached; `stage.nextKey` is the round they play toward. Editions without a `stage` fall back to `DEFAULT_STAGE` (post-R32 semantics), so the frozen R32 edition still renders identically. Card ids `"collisions"`/`"question"` are the generic forms; `"r16-collisions"`/`"qf-question"` remain as aliases for the frozen R32 edition.

These cards share a helper, `computeKO(playerPicks, results, names, stage)`, which resolves the actual R32 field (`computeQualifiers`), the survivor set (`results.advanced[stage.wonKey]`), the upcoming matchups (`KNOCKOUT` round `stage.wonKey` + `results.koScores` winners), the bracket-filling players, `countIn`/`whoIn` popularity helpers, and `elimWhere(team)` (where a team was eliminated).

**`renderScenarios`** enumerates every remaining bracket outcome (4 QF × 2 SF × 1 Final = **128 scenarios**) from the snapshot. For each champion team in the edition's `scenarioTeams`, it renders a "Road to Glory" card listing that team's backers with the count of the 128 outcomes that make them the sole pool winner, plus each one's best-case path. Fully deterministic from the frozen snapshot.

**`renderChaos`** runs the same 128-outcome enumeration but focuses on the **dark horses** — the surviving teams that were *no* player's champion pick (auto-derived). For each, it shows who wins the pool if that team lifts the trophy, with each beneficiary's win count, best-case score, and the full "last four" (so scenarios sharing a final are distinguished), plus an overall "chaos king". Of the 128 outcomes, exactly half (64 = 16 per dark horse) have a dark-horse champion.

- `survivors` — R16 field vs pool R16 picks: chalk, the zero-bracket "gatecrasher" callout, and the sharp few (with names).
- `broken-brackets` — champion/finalist/semifinalist picks already eliminated (distinguishing "out in the groups" vs "lost in the R32"), plus still-perfect Final Fours.
- `r16-collisions` — the 8 concrete R16 ties, flagging any that pit two commonly-picked teams and naming the affected players; an editorial `collisionNote` renders as a highlighted callout.
- `qf-question` — consensus vs contrarian quarterfinal picks among survivors, plus a "Riding the Longshots" roll-call naming who backs each lightly-owned survivor (≤ half the pool) into the QF.
- `title-race` — current locked score (`scorePlayer`) plus each player's remaining ceiling (points × still-alive picks over the rounds after `stage.wonKey`); kindly flags anyone whose max can't reach the leader's current score.
- `odds-ends` — computed tidbits (maverick, people's champion) plus editorial `customTidbits` (array of `{h, p}`).
- `scenarios` — the 128-outcome "Road to Glory" analysis, one card per team in `scenarioTeams`.
- `chaos` — the "Chaos Bracket": pool outcomes if a dark horse (no player's champion) wins it all.

Other flags:
- `includeR32` (on `standings-movement`): rank by **total points** (group ×1 + Round-of-32 ×2) instead of raw group-outcome counts, so it matches the Standings tab once the R32 field is known.
- `knockout-preview` (`renderKnockoutPreview`): a group-stage-complete preview of champion/semifinal survival and R32 collisions.
- `stage.raceLead` / `stage.raceTail` (on `title-race`): optional overrides for the opening / closing sentence of the title-race narrative (the R16 edition uses these to drop the "nobody is out" claim and point at the scenario cards).

---

## State Management

All state lives in the root `App` component via `useState`. No external state library.

| Variable | Type | Purpose |
|----------|------|---------|
| `tab` | string | Active tab key |
| `playerId` | string | Current player's hashed ID |
| `playerName` | string | Current player's display name |
| `nameInput` | string | Join form input |
| `picks` | object | Current player's predictions |
| `locked` | boolean | Whether current player's picks are locked |
| `results` | object | Full tournament state (group scores, knockout `koScores`, derived `advanced`, flags, announcements) |
| `players` | object | Registry mapping player IDs to display names |
| `loading` | boolean | Initial data load state |
| `toast` | string | Flash message text |
| `feedStatus` | string | Auto-feed status: "idle", "ok", or "fail" |
| `standRows` | array | Computed standings (lazy-loaded) |
| `confirmReset` | boolean | Double-tap confirmation for sandbox reset |
| `leagueEntries` | array | All player data for League Picks tab |
| `analysisPosts` | array | Array of frozen analysis editions loaded from Firestore |
| `confirmReveal` | boolean | Double-tap confirmation for reveal toggle |

**Derived (useMemo):**
- `qual` — Full qualifier computation from current results
- `autoR32` — Automatic Round of 32 when all groups complete

---

## Build & Deployment

### Local Development
```bash
cd wc-pool
npm install
npm run dev          # Starts Vite dev server (SANDBOX mode)
```

Dev server runs on `localhost:5173`. Uses `wc26test:` namespace in Firestore.

### Production Build
```bash
npm run build        # Outputs to dist/
```

### Deploy to Firebase
```bash
firebase deploy --only hosting
```

Serves `dist/` directory. SPA rewrite rule sends all routes to `index.html`.

### Firebase Configuration

**firebase.json:**
```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  },
  "firestore": { "rules": "firestore.rules" }
}
```

---

## Analytics Script

`analytics.mjs` is a standalone Node.js script that connects directly to Firestore. It reads all player picks and match results, generates a console report, and **saves a frozen snapshot** to Firestore under the `wc26:analysis` key. The Analysis tab in the app renders entirely from this saved snapshot.

**Usage:**
```bash
cd wc-pool
node analytics.mjs round1    # Save/update Round 1 edition (matches 1–24)
node analytics.mjs round2    # Save/update Round 2 edition (matches 25–48)
node analytics.mjs round3    # Save/update Round 3 edition (matches 49–72, group stage complete)
node analytics.mjs r32       # Save/update the post–Round-of-32 edition ("The Cull")
node analytics.mjs r16       # Save/update the post–Round-of-16 edition ("The Elite Eight")
node analytics.mjs            # Defaults to round1
```

**What it does:**
1. Reads all player picks and match results from Firestore
2. Prints a detailed console report (champion picks, accuracy rankings, consensus analysis, etc.)
3. Saves a frozen edition to Firestore, preserving existing editions in the array

Each edition freezes exactly the data its cards need. `round3` freezes knockout advancement empty (so its standings-movement is group + R32 only), while the `r32` edition captures the live `advanced` (R16 field) **and** `koScores` (R32 results) so the survivor/collision/title-race cards can compute. The `r32` edition also carries editorial `collisionNote` and `customTidbits`.

**Console output includes:**
- Champion pick distribution
- Finalist and semifinalist pick tallies
- Most agreed-upon and most divided group matches
- Contrarian/lone wolf predictions
- Round of 32 team popularity per group
- Predicted group winners
- Score prediction style (avg goals, home/draw/away tendencies)
- Results so far with accuracy rankings and exact score matches

**Editions saved to Firestore:**
- Key: `wc26:analysis`
- Value is an array of edition objects, newest first
- Each edition contains metadata (title, headline, card types, match ranges) and a `snapshot` with `playerPicks` and `results`
- Running the script with a round argument replaces that edition's entry while preserving others
- The Analysis tab displays each edition's `publishedAt` date stamp

---

## Constants & Data

### Groups
12 groups (A–L), 4 teams each, 48 teams total. Defined in `GROUPS` object.

### Matches
72 matches defined in `MATCHES` array. Each entry:
```javascript
{ m: 1, g: "A", d: "Jun 11", h: "Mexico", a: "South Africa" }
```

### Rounds
```javascript
const ROUNDS = [
  { key: "r32", label: "Round of 32", count: 32, pts: 2 },
  { key: "r16", label: "Round of 16", count: 16, pts: 3 },
  { key: "qf",  label: "Quarterfinals", count: 8,  pts: 5 },
  { key: "sf",  label: "Semifinals",    count: 4,  pts: 8 },
  { key: "final", label: "Final",       count: 2,  pts: 13 },
  { key: "champ", label: "Champion",    count: 1,  pts: 21 },
];
```

### Knockout Bracket
`KNOCKOUT` is a 32-entry array (matches 73–104) defining the bracket tree, locked once the groups completed. Round-of-32 entries carry real teams and group-seed labels; later rounds carry feeder match numbers, resolved to real teams as results arrive. Times are pre-converted to US Eastern.
```javascript
// R32 — real teams + seed labels (1E = Group E winner, 3D = Group D third place)
{ n: 74, r: "r32", et: "Mon Jun 29, 4:30 PM ET", v: "Boston", a: "Germany", as: "1E", b: "Paraguay", bs: "3D" }
// later rounds — feeder match numbers (winners of f1 / f2)
{ n: 89, r: "r16", et: "Sat Jul 4, 5:00 PM ET", v: "Philadelphia", f1: 74, f2: 77 }
{ n: 103, r: "third", ..., l1: 101, l2: 102 }   // losers of the two semifinals
```
Helpers: `KO_NEXT` maps each round to the round its winners reach (`r32→r16`, … `final→champ`); `KO_BY_NUM` indexes `KNOCKOUT` by match number.

### Deadline
```javascript
const DEADLINE_ISO = "2026-06-11T19:00:00Z";
```

### Color Palette
```javascript
const C = {
  ink: "#0B1F3A",    // Dark navy
  paper: "#F7F4EC",  // Off-white
  line: "#D9D2C2",   // Beige border
  sun: "#E8B23A",    // Gold accent
  pitch: "#1F7A4D",  // Green positive
  red: "#C0392B",    // Red warning
  mute: "#6B6353",   // Taupe secondary
  chalk: "#FFFFFF"   // White
};
```
