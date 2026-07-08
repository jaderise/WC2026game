# WC2026 Pool — Functional Design Document

## Product Overview

The WC2026 Pool is a prediction league app for the FIFA World Cup 2026. It allows a group of friends (~17 players) to compete by predicting the outcomes of all 72 group stage matches and picking which teams will advance through each knockout round. A live leaderboard tracks scores in real time as the tournament progresses.

**Live URL:** https://wc2026game.web.app

---

## User Roles

### Player
- Enters the pool by typing (or tapping) their name
- Predicts scores for all 72 group stage matches
- Picks teams to advance through each knockout round (R16 through Champion)
- Locks picks before the tournament deadline
- Views group tables, standings, league-wide picks, and announcements

### Commissioner
- Any logged-in player can act as commissioner (honor system)
- Enters actual match results (supplemented by auto-feed)
- Manages tiebreakers when the app can't resolve group standings automatically
- Controls pick visibility and editing windows
- Posts announcements to communicate with the pool
- Sets knockout round advancement results

There is no authentication system. The app runs entirely on an honor system — players are trusted to only access their own picks.

---

## Feature Walkthrough

### Tab 1: My Picks

The primary tab where players enter and manage their predictions.

**Group Stage Picks**
- All 72 matches are organized by group (A through L), with 6 matches per group
- For each match, the player enters a predicted home score and away score
- A computed group table appears below each group's matches, showing how the player's predicted scores would produce standings (points, goal difference, goals for)
- The player's predicted Round of 32 qualifiers are automatically derived from their group picks (top 2 per group + best 8 third-place teams)

**Knockout Picks**
- Players select which teams they believe will reach each round. Each round shows clear instructions: "Pick X teams you think will reach [round]" with a red "— N more needed" indicator when the selection is incomplete:
  - Round of 16: Pick 16 teams (from their auto-calculated R32)
  - Quarterfinals: Pick 8 teams (from their R16 picks)
  - Semifinals: Pick 4 teams (from their QF picks)
  - Final: Pick 2 teams (from their SF picks)
  - Champion: Pick 1 team (from their Final picks)
- Each round cascades from the previous — removing a team from an earlier round automatically removes it from all later rounds

**Save & Lock Controls**
- "Save Progress" — saves current picks without locking
- "Save & go to Knockouts" — saves and switches to knockout view (visible on group stage)
- "Lock Picks" — permanently locks picks (can be unlocked by the player before deadline, or by commissioner override after deadline)
- "Unlock" — appears when picks are locked, allowing the player to edit again

**Switch Player**
- A "Switch" button in the header lets the current player exit and return to the join screen

### Tab 2: Group Tables

Displays the current actual group standings computed from entered match results.

- 12 groups (A–L), each showing a standard football table: Played, Won, Drawn, Lost, Goals For, Goals Against, Goal Difference, Points
- Teams qualifying for the Round of 32 are highlighted in green (top 2 per group)
- Third-place teams in contention for the best-8 spots are highlighted in amber
- When all group matches are complete, the full Round of 32 field is displayed

### Tab 3: Bracket

A March Madness–style visual of the entire knockout stage, available once the group stage is complete.

- **Round of 32** is locked from the final group tables — all 16 matchups show real teams with their **group-seed label** (e.g., `1E` = Group E winner, `3D` = Group D third place), the **date and kickoff time in US Eastern**, and the **venue**
- **R16 → Final** render as a horizontally-scrollable bracket tree; each slot shows a "Winner of M—" placeholder until that match is decided, then fills in the actual team
- As knockout results arrive (via the auto-feed or a manual override), each match card shows the **score and the winner** (highlighted), including annotations for **extra time** ("after extra time") and **penalty shootouts** ("won on penalties", with the shootout score in parentheses)
- The **third-place playoff** is shown beneath the main bracket
- A **Champion banner** appears at the top once the Final is decided

### Tab 4: Standings

The live leaderboard showing all players ranked by total points.

- Each row shows: rank, player name, total score, and a visual progress bar
- Expandable breakdown shows points earned in each category: Group, R32, R16, QF, SF, Final, Champion
- Scores update in real time via Firestore live sync — when a result is entered, all connected clients see updated standings immediately

### Tab 5: League Picks

Shows every player's full bracket, allowing comparison across the pool.

- **Hidden by default** — the commissioner must toggle "Reveal Picks" before brackets are visible
- When revealed, each player appears as an expandable card showing:
  - Champion pick (highlighted)
  - Finalist picks
  - Full knockout bracket (R16 through Champion)
  - All 72 group stage score predictions
- When hidden, displays "PICKS ARE SECRET" message

### Tab 6: Analysis

A blog-style analytics page with data visualizations and narratives about the pool's collective predictions. Analysis is organized into **editions** (Round 1, Round 2, Round 3, the Round of 32, …), each rendered from a **frozen snapshot** saved to Firestore so the analysis doesn't change as new match results come in. New editions are created by running `analytics.mjs` with a round argument.

The latest edition is fully expanded at the top of the page. Older editions collapse into a clickable bar with a chevron (▶) indicator — tap to expand and see the full analysis. Each edition displays its published date.

#### Edition 1: "Round 1 — Opening Salvo"

**Card 1: "The Crystal Ball Is Cracked" — Matchday Report (Matches 1–24)**
- Summary stats (matches played, pool accuracy %, shockers, exact scores)
- "Nobody Saw That Coming" — matches where almost nobody predicted the correct outcome
- "The Sure Things" — matches nearly everyone got right
- Match-by-match dot matrix showing each player's pick vs. the actual result (colored squares per player)
- First round accuracy leaderboard (horizontal bar chart)

**Card 2: "Where The Pool Agrees — And Doesn't" — Champion & Knockout Vision**
- Champion pick distribution (horizontal bar chart with player names)
- Semifinal team popularity chart
- "Hive Mind vs. Mavericks" — who has the most/least mainstream bracket (average shared semifinal picks)
- Final matchup grid showing each player's predicted final and winner

**Card 3: "The Scores We All Agreed On (And The Ones We Didn't)" — Group Stage Consensus**
- Matches with 100% agreement on outcome (with check/cross showing if reality matched)
- Most divided matches (proportional split bars showing home/draw/away distribution)
- "Lone Wolf Picks" — players who were the only person to pick a particular outcome (marked "genius!" if correct)

**Card 4: "What's Coming in Round 2" — Round 2 Preview**
- Consensus matches where all players agree on the outcome
- Toss-up matches with no dominant prediction (split bars)
- Full match-by-match breakdown with prediction distribution, favourite scores, and lone wolf picks

#### Edition 2: "Round 2 — The Plot Thickens"

**Card 1: "The Plot Thickens" — Matchday Report (Matches 25–48)**
- Same format as Round 1 matchday report but covering the second round of group matches

**Card 2: "Who's Climbing, Who's Sliding?" — Standings Movement**
- Accuracy rankings comparison between Round 1 and Round 2 snapshots
- Each player shown with current rank, correct count, and movement arrows (▲ climbed / ▼ dropped / — unchanged)
- Narrative highlighting the biggest climbers and fallers

**Card 3: "The Scores We All Agreed On" — Round 2 Consensus**
- Same format as Round 1 consensus card but covering matches 25–48

**Card 4: "What's Coming in Round 3" — Round 3 Preview**
- Same format as Round 2 preview but covering matches 49–72

#### Edition 3: "Round 3 — The Groups Are Settled"

**Card 1: "The Groups Are Settled" — Matchday Report (Matches 49–72)**
- Same format as earlier matchday reports, covering the final round of group matches

**Card 2: "Who's Climbing, Who's Sliding?" — Standings Movement (Round 2 → Round 3)**
- Now ranks by **total points** — group outcomes (1 pt) plus the Round-of-32 points (2 pts per correct qualifier) that land once the groups finish — so it matches the Standings tab. Each row shows the total with a group/R32 breakdown and movement arrows.

**Card 3: "The Bracket Survivors" — Knockout Preview**
- **Title picks still alive** — each player's champion pick with a ✓/✗ for whether it reached the Round of 32, plus how many of their four semifinalists survived
- **Gone too soon** — teams backed to reach the semifinals or beyond that were eliminated in the group stage
- **Collision course** — Round of 32 matchups that pit two commonly-picked teams against each other, guaranteeing a popular pick is knocked out (e.g., Netherlands vs. Morocco), with how many brackets backed both

**Card 4: "The Scores We All Agreed On" — Round 3 Consensus**
- Same format as the earlier consensus cards, covering matches 49–72

#### Edition 4: "Round of 32 — The Cull"

The first knockout edition, published once the Round of 32 is complete. It reads from a snapshot that captures the Round of 16 field and the R32 match results.

**Card 1: "The Survivors"**
- The 16 teams still standing vs. how many brackets picked each to reach the Round of 16 — the chalk (unanimous favourites), a bold "Nobody Saw This Coming" callout for any team that advanced in zero brackets, and "The Sharp Few" naming who called the low-owned survivors

**Card 2: "Broken Brackets"**
- Players whose champion, finalist, or semifinalist pick is already eliminated (noting whether it went out in the groups or lost in the R32), plus the brackets still fully intact

**Card 3: "Collision Course"**
- The Round of 16 ties that pit two commonly-picked teams together, naming the players guaranteed to lose one, plus editorial callouts

**Card 4: "The Quarterfinal Question"**
- Consensus vs. contrarian quarterfinal picks among the survivors, and a "Riding the Longshots" roll-call naming exactly who backs each lightly-owned survivor into the last eight

**Card 5: "Is It Still All To Play For?"**
- The title race: each player's locked score (group + R32 + R16) and their remaining ceiling as points escalate (QF 5, SF 8, Final 13, Champion 21), with a kind note for anyone who can no longer catch the leader

**Card 6: "Odds & Ends"**
- The little stories in the picks — computed tidbits (the maverick, the people's champion) plus editorial notes (e.g., the DeRise brothers backing Spain, the London connection)

#### Edition 5: "Round of 16 — The Elite Eight"

The second knockout edition, published once the Round of 16 is complete (the eight quarterfinalists are set). Same structure as The Cull, one round deeper: **The Survivors** (the 8 QF teams vs. who backed them), **Broken Brackets**, **Collision Course** (the quarterfinal ties), **The Semifinal Question** (consensus vs. contrarian picks for the last four, with a longshots roll-call), and **Is It Still All To Play For?** (title race with QF points now locked).

In place of Odds & Ends it closes with **scenario analysis** — a set of "Road to Glory" cards, one for each still-standing champion pick (France, Spain, England, Argentina). Each card enumerates all 128 remaining ways the bracket can play out and, for every player who backed that team, shows **how many of those outcomes would make them the overall pool winner** and their best-case path. Players who can no longer win are noted kindly (still cheering their team on for pride).

Analysis by Claude is credited on the page.

### Tab 7: Updates

A simple announcements board for commissioner-to-player communication.

- Commissioner can type and post messages
- Messages appear in reverse chronological order (newest first)
- Commissioner can delete individual messages
- Messages also appear on the Join/welcome screen so returning players see them immediately

### Tab 8: Results

The commissioner's scoring and tournament management interface. Only accessible after entering a name on the My Picks tab.

**Score Entry**
- All 72 group matches listed with input fields for home/away scores
- Scores can be entered manually or arrive via auto-feed
- A "Clear" button appears when a score is deleted, allowing removal of incorrect entries
- Each score records who entered it and when

**Tiebreaker Resolution**
- When group teams are tied on points, goal difference, and goals for, the app prompts the commissioner to manually set the ordering
- Similarly for third-place teams competing for the final Round of 32 spots

**Knockout Advancement**
- The **Round of 32** fills automatically from the completed group tables (top 2 per group + best 8 third-place teams)
- **R16 → Champion now fill in automatically from the auto-feed** as knockout matches are played — including matches decided in extra time or on penalties. A "Knockout results (auto-fed)" readout lists each played match with its score and winner.
- The commissioner can still tap teams to **override a round manually**; a manual edit takes precedence over the feed for that round (the feed won't overwrite it)
- Each round's team buttons are **filtered to the teams that advanced from the prior round** — the Round of 16 offers only the 32 qualifiers, the Quarterfinals only the teams in the R16 result, and so on. Eliminated teams disappear as options in later rounds. If the prior round hasn't been set yet, the round prompts to set it first.

**Commissioner Controls** (located at the bottom of the Results tab)
- **Open/Close Editing** — temporarily allows all players to modify their picks after the deadline (used for corrections)
- **Reveal/Hide Picks** — toggles whether the League Picks tab shows everyone's brackets

---

## Join Flow

### Before Deadline (Pre-Tournament)
1. Player sees the welcome screen with scoring rules and any commissioner announcements
2. Player types their name into a text input and taps "Start"
3. If the name matches an existing player, their saved picks are loaded
4. If new, the player starts with a blank prediction sheet
5. Player is taken to the My Picks tab

### After Deadline (Tournament In Progress)
1. Player sees a "WELCOME BACK" header with large, clear instructions
2. All existing player names are displayed as tappable buttons in a dark grid
3. Player taps their own name to re-enter (honor system notice displayed)
4. The text input for new names is removed — no new players can join after deadline
5. Picks are view-only unless the commissioner has opened editing

---

## Scoring System

The scoring system uses a Fibonacci-inspired point scale that rewards deeper knockout predictions more heavily.

### Group Stage (72 matches)
- **1 point** per correct match outcome (home win, draw, or away win)
- The exact score does not matter — only the outcome counts
- Maximum possible: 72 points

### Knockout Rounds
Players name which teams they think will reach each round. Points are awarded per team that actually reaches that round, regardless of how:

| Round | Teams to Pick | Points per Correct Team | Max Points |
|-------|--------------|------------------------|------------|
| Round of 32 | 32 | 2 | 64 |
| Round of 16 | 16 | 3 | 48 |
| Quarterfinals | 8 | 5 | 40 |
| Semifinals | 4 | 8 | 32 |
| Final | 2 | 13 | 26 |
| Champion | 1 | 21 | 21 |

**Knockout max: 231 points. Grand total possible: 303 points.**

### Round of 32 — Automatic Qualification
The R32 is not picked directly. Instead, it's computed from each player's group stage score predictions:
- Top 2 teams per group qualify (24 teams)
- Best 8 third-place teams qualify (ranked by predicted points → goal difference → goals for)
- Total: 32 teams

### How "Correct" Is Determined
- **Group matches:** Does the predicted outcome (H/D/A) match the actual outcome?
- **Knockout rounds:** Is the team in the player's list for that round AND in the actual list for that round? The path doesn't matter — if a player picked Brazil for the semifinals and Brazil reaches the semifinals by any route, the player earns 8 points.

---

## Commissioner Workflow

### During the Tournament
1. **Scores arrive automatically** via the openfootball GitHub feed every 15 minutes
2. Commissioner reviews and can manually correct or enter scores that the feed missed
3. As group play completes, the commissioner resolves any tiebreakers the app can't determine automatically
4. Commissioner sets knockout round results as they happen
5. Commissioner posts announcements for notable events or rule clarifications

### Emergency Overrides
- **Open Editing:** If players missed the deadline or need corrections, the commissioner can temporarily reopen editing for all players, then close it again
- **Reveal/Hide Picks:** Commissioner controls when everyone's brackets become visible to the group

---

## Auto-Feed

The app automatically fetches live match scores from the openfootball project on GitHub.

- **Source:** `openfootball/worldcup.json` repository on GitHub (raw JSON)
- **Frequency:** Every 15 minutes + on app load
- **Group stage:** Feed scores are only applied if no manual score exists for that match. Manual entries (identified by the `by` field) are never overwritten.
- **Knockout stage:** The feed also ingests the knockout matches (Round of 32 through Final). For each played match it determines the winner — handling **extra time and penalty shootouts** — and automatically advances that team. This flows straight into the Bracket, Standings, and Results tabs with no manual entry. A commissioner can still override any round by hand, and the feed will respect that override.
- **Team name normalization:** The feed uses different team names (e.g., "United States" vs "USA", "Côte d'Ivoire" vs "Ivory Coast"), which are mapped via an alias table
- **Status indicator:** The header shows "auto-feed synced Xm ago" or "auto-feed offline" if the fetch fails

---

## Tournament Structure

### Groups
12 groups (A–L), 4 teams each, 48 teams total.

### Schedule
- **Round 1 (Matches 1–24):** June 11–17, 2026
- **Round 2 (Matches 25–48):** June 18–23, 2026  
- **Round 3 (Matches 49–72):** June 24–27, 2026
- **Deadline:** June 11, 2026 at 19:00 UTC (before the first match)

### Qualification
- Top 2 per group → Round of 32 (24 teams)
- Best 8 third-place teams → Round of 32 (8 teams)
- Total R32 field: 32 teams

---

## Design & UX

### Visual Identity
- **Colors:** Dark navy (#0B1F3A), off-white (#F7F4EC), gold (#E8B23A), green (#1F7A4D), red (#C0392B)
- **Fonts:** Anton (display headings), DM Sans (body text), DM Mono (timestamps and scores)
- **Layout:** Mobile-first, max-width 720px, all inline styles

### Mobile Experience
- Designed primarily for mobile use (friends checking on phones)
- Large tap targets for score inputs and team selection buttons
- Sticky toast notifications for save confirmations
- Tab bar at the top wraps into rows of pill-style buttons so all tabs stay visible on narrow screens (2 rows of 4 on a phone, a single row on wider screens)
- Fast first load: the app fetches only the data the opening screen needs, so cold-start time stays small and doesn't grow as more analysis editions are published (the analysis loads only when the Analysis tab is opened)

---

## Security & Trust Model

- **No authentication** — no passwords, no accounts, no email verification
- **Honor system** — players are trusted to access only their own picks
- **Open Firestore rules** — the database allows read/write from any client
- **Commissioner is informal** — any logged-in player can access the Results tab and modify scores
- **This is appropriate for the use case** — a small group of friends who know and trust each other
