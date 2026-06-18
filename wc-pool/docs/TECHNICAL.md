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
      "r16": { "by": "Jason", "at": "..." }
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

**`wc26__analysis`** — Frozen analysis snapshot (single document)
```json
{
  "key": "wc26:analysis",
  "value": {
    "publishedAt": "2026-06-18T15:39:19.415Z",
    "snapshot": {
      "playerPicks": {
        "Jason": { "scores": { "1": { "hg": 2, "ag": 1 }, ... }, "advanced": { "r16": [...], ... } },
        "Gary": { ... }
      },
      "results": {
        "scores": { "1": { "hg": 2, "ag": 0, ... }, ... },
        "advanced": { "r32": [], "r16": [], ... }
      }
    }
  }
}
```

The snapshot freezes all player picks and match results at the time `analytics.mjs` is run. The Analysis tab renders entirely from this frozen data, so analysis cards don't change as new match results come in. Running `analytics.mjs` again overwrites the snapshot with fresh data.

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
// Reads ALL docs in pool collection, filters by prefix, returns matching keys.
// Note: reads entire collection each call — fine for <100 docs.

async function sDelete(key)
// Deletes pool/{docId(key)}.
```

---

## Real-Time Sync

```javascript
const LIVE_ENABLED = true;

function liveSubscribe(onChange) {
  return onSnapshot(collection(db, "pool"), () => onChange());
}
```

- Subscribes to the entire `pool` collection
- Any document change triggers a full refresh of results, players, and standings
- All connected clients see updates within seconds
- Subscription is cleaned up on component unmount

---

## Auto-Feed Pipeline

```
openfootball/worldcup.json (GitHub raw)
    ↓ fetch every 15 min
parseFeedScores(json)
    ↓ normalize team names via FEED_ALIASES
    ↓ look up match ID via matchByTeams index
    ↓ skip if manual entry exists (by !== "openfootball")
    ↓ merge into results.scores
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

**Merge Rules:**
- Feed scores include `by: "openfootball"` metadata
- If a score already exists with `by` set to something other than `"openfootball"`, the feed does not overwrite it (manual entries take priority)
- Feed updates `feedAt` timestamp on each sync

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
| `Analysis` | snapshot | Blog-style analytics page with 4 post cards, rendered from a frozen Firestore snapshot |
| `HBar` | data, maxVal, barColor, height, showPct, total | Horizontal bar chart |
| `DotRow` | label, outcomes, playerNames, total | Dot matrix for match outcome distribution |

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
| `results` | object | Full tournament state (scores, advanced, flags, announcements) |
| `players` | object | Registry mapping player IDs to display names |
| `loading` | boolean | Initial data load state |
| `toast` | string | Flash message text |
| `feedStatus` | string | Auto-feed status: "idle", "ok", or "fail" |
| `standRows` | array | Computed standings (lazy-loaded) |
| `confirmReset` | boolean | Double-tap confirmation for sandbox reset |
| `leagueEntries` | array | All player data for League Picks tab |
| `analysisPosts` | object\|null | Frozen analysis snapshot loaded from Firestore |
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
node analytics.mjs
```

**What it does:**
1. Reads all player picks and match results from Firestore
2. Prints a detailed console report (champion picks, accuracy rankings, consensus analysis, etc.)
3. Saves a frozen snapshot to Firestore containing all player picks and results at the current point in time

**Console output includes:**
- Champion pick distribution
- Finalist and semifinalist pick tallies
- Most agreed-upon and most divided group matches
- Contrarian/lone wolf predictions
- Round of 32 team popularity per group
- Predicted group winners
- Score prediction style (avg goals, home/draw/away tendencies)
- Results so far with accuracy rankings and exact score matches

**Snapshot saved to Firestore:**
- Key: `wc26:analysis`
- Contains `publishedAt` timestamp and `snapshot` with `playerPicks` and `results`
- Running the script again overwrites the previous snapshot with fresh data
- The Analysis tab displays a date stamp from `publishedAt` so users know when the analysis was captured

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
