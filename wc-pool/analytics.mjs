import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAH9dOS457vf048dBBqSXejZMD97GX_1wE",
  authDomain: "wc2026game.firebaseapp.com",
  projectId: "wc2026game",
  storageBucket: "wc2026game.firebasestorage.app",
  messagingSenderId: "362164552972",
  appId: "1:362164552972:web:db30ca2e73ce6578dc3529",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const NS = "wc26:";

const GROUPS = {
  A: ["Mexico", "South Africa", "South Korea", "Czechia"],
  B: ["Canada", "Bosnia and Herzegovina", "Qatar", "Switzerland"],
  C: ["Brazil", "Morocco", "Haiti", "Scotland"],
  D: ["USA", "Paraguay", "Australia", "Türkiye"],
  E: ["Germany", "Curacao", "Ivory Coast", "Ecuador"],
  F: ["Netherlands", "Japan", "Sweden", "Tunisia"],
  G: ["Belgium", "Egypt", "Iran", "New Zealand"],
  H: ["Spain", "Cape Verde", "Saudi Arabia", "Uruguay"],
  I: ["France", "Senegal", "Iraq", "Norway"],
  J: ["Argentina", "Algeria", "Austria", "Jordan"],
  K: ["Portugal", "DR Congo", "Uzbekistan", "Colombia"],
  L: ["England", "Croatia", "Ghana", "Panama"],
};

const MATCHES = [
  { m: 1, g: "A", d: "Jun 11", h: "Mexico", a: "South Africa" },
  { m: 2, g: "A", d: "Jun 11", h: "South Korea", a: "Czechia" },
  { m: 3, g: "B", d: "Jun 12", h: "Canada", a: "Bosnia and Herzegovina" },
  { m: 4, g: "D", d: "Jun 12", h: "USA", a: "Paraguay" },
  { m: 5, g: "C", d: "Jun 13", h: "Brazil", a: "Morocco" },
  { m: 6, g: "D", d: "Jun 13", h: "Australia", a: "Türkiye" },
  { m: 7, g: "C", d: "Jun 13", h: "Haiti", a: "Scotland" },
  { m: 8, g: "B", d: "Jun 13", h: "Qatar", a: "Switzerland" },
  { m: 9, g: "E", d: "Jun 14", h: "Germany", a: "Curacao" },
  { m: 10, g: "E", d: "Jun 14", h: "Ivory Coast", a: "Ecuador" },
  { m: 11, g: "F", d: "Jun 14", h: "Netherlands", a: "Japan" },
  { m: 12, g: "F", d: "Jun 14", h: "Sweden", a: "Tunisia" },
  { m: 13, g: "H", d: "Jun 15", h: "Spain", a: "Cape Verde" },
  { m: 14, g: "G", d: "Jun 15", h: "Belgium", a: "Egypt" },
  { m: 15, g: "H", d: "Jun 15", h: "Saudi Arabia", a: "Uruguay" },
  { m: 16, g: "G", d: "Jun 15", h: "Iran", a: "New Zealand" },
  { m: 17, g: "I", d: "Jun 16", h: "France", a: "Senegal" },
  { m: 18, g: "I", d: "Jun 16", h: "Iraq", a: "Norway" },
  { m: 19, g: "J", d: "Jun 16", h: "Argentina", a: "Algeria" },
  { m: 20, g: "J", d: "Jun 16", h: "Austria", a: "Jordan" },
  { m: 21, g: "K", d: "Jun 17", h: "Portugal", a: "DR Congo" },
  { m: 22, g: "L", d: "Jun 17", h: "England", a: "Croatia" },
  { m: 23, g: "L", d: "Jun 17", h: "Ghana", a: "Panama" },
  { m: 24, g: "K", d: "Jun 17", h: "Uzbekistan", a: "Colombia" },
  { m: 25, g: "A", d: "Jun 18", h: "Czechia", a: "South Africa" },
  { m: 26, g: "B", d: "Jun 18", h: "Switzerland", a: "Bosnia and Herzegovina" },
  { m: 27, g: "B", d: "Jun 18", h: "Canada", a: "Qatar" },
  { m: 28, g: "A", d: "Jun 18", h: "Mexico", a: "South Korea" },
  { m: 29, g: "D", d: "Jun 19", h: "USA", a: "Australia" },
  { m: 30, g: "C", d: "Jun 19", h: "Scotland", a: "Morocco" },
  { m: 31, g: "C", d: "Jun 19", h: "Brazil", a: "Haiti" },
  { m: 32, g: "D", d: "Jun 19", h: "Türkiye", a: "Paraguay" },
  { m: 33, g: "F", d: "Jun 20", h: "Netherlands", a: "Sweden" },
  { m: 34, g: "E", d: "Jun 20", h: "Germany", a: "Ivory Coast" },
  { m: 35, g: "E", d: "Jun 20", h: "Ecuador", a: "Curacao" },
  { m: 36, g: "F", d: "Jun 20", h: "Tunisia", a: "Japan" },
  { m: 37, g: "H", d: "Jun 21", h: "Spain", a: "Saudi Arabia" },
  { m: 38, g: "G", d: "Jun 21", h: "Belgium", a: "Iran" },
  { m: 39, g: "H", d: "Jun 21", h: "Uruguay", a: "Cape Verde" },
  { m: 40, g: "G", d: "Jun 21", h: "New Zealand", a: "Egypt" },
  { m: 41, g: "J", d: "Jun 22", h: "Argentina", a: "Austria" },
  { m: 42, g: "I", d: "Jun 22", h: "France", a: "Iraq" },
  { m: 43, g: "I", d: "Jun 22", h: "Norway", a: "Senegal" },
  { m: 44, g: "J", d: "Jun 22", h: "Jordan", a: "Algeria" },
  { m: 45, g: "K", d: "Jun 23", h: "Portugal", a: "Uzbekistan" },
  { m: 46, g: "L", d: "Jun 23", h: "England", a: "Ghana" },
  { m: 47, g: "L", d: "Jun 23", h: "Panama", a: "Croatia" },
  { m: 48, g: "K", d: "Jun 23", h: "Colombia", a: "DR Congo" },
  { m: 49, g: "B", d: "Jun 24", h: "Canada", a: "Switzerland" },
  { m: 50, g: "B", d: "Jun 24", h: "Bosnia and Herzegovina", a: "Qatar" },
  { m: 51, g: "C", d: "Jun 24", h: "Scotland", a: "Brazil" },
  { m: 52, g: "C", d: "Jun 24", h: "Morocco", a: "Haiti" },
  { m: 53, g: "A", d: "Jun 24", h: "Mexico", a: "Czechia" },
  { m: 54, g: "A", d: "Jun 24", h: "South Korea", a: "South Africa" },
  { m: 55, g: "E", d: "Jun 25", h: "Ecuador", a: "Germany" },
  { m: 56, g: "E", d: "Jun 25", h: "Curacao", a: "Ivory Coast" },
  { m: 57, g: "F", d: "Jun 25", h: "Tunisia", a: "Netherlands" },
  { m: 58, g: "F", d: "Jun 25", h: "Japan", a: "Sweden" },
  { m: 59, g: "D", d: "Jun 25", h: "USA", a: "Türkiye" },
  { m: 60, g: "D", d: "Jun 25", h: "Paraguay", a: "Australia" },
  { m: 61, g: "I", d: "Jun 26", h: "Norway", a: "France" },
  { m: 62, g: "I", d: "Jun 26", h: "Senegal", a: "Iraq" },
  { m: 63, g: "G", d: "Jun 26", h: "New Zealand", a: "Belgium" },
  { m: 64, g: "G", d: "Jun 26", h: "Egypt", a: "Iran" },
  { m: 65, g: "H", d: "Jun 26", h: "Uruguay", a: "Spain" },
  { m: 66, g: "H", d: "Jun 26", h: "Cape Verde", a: "Saudi Arabia" },
  { m: 67, g: "L", d: "Jun 27", h: "Panama", a: "England" },
  { m: 68, g: "L", d: "Jun 27", h: "Croatia", a: "Ghana" },
  { m: 69, g: "K", d: "Jun 27", h: "Colombia", a: "Portugal" },
  { m: 70, g: "K", d: "Jun 27", h: "DR Congo", a: "Uzbekistan" },
  { m: 71, g: "J", d: "Jun 27", h: "Jordan", a: "Argentina" },
  { m: 72, g: "J", d: "Jun 27", h: "Algeria", a: "Austria" },
];

const ROUNDS = [
  { key: "r32", label: "Round of 32", count: 32, pts: 2 },
  { key: "r16", label: "Round of 16", count: 16, pts: 3 },
  { key: "qf", label: "Quarterfinals", count: 8, pts: 5 },
  { key: "sf", label: "Semifinals", count: 4, pts: 8 },
  { key: "final", label: "Final", count: 2, pts: 13 },
  { key: "champ", label: "Champion", count: 1, pts: 21 },
];

function predOutcome(score) {
  if (!score || score.hg == null || score.ag == null) return null;
  return score.hg > score.ag ? "H" : score.hg < score.ag ? "A" : "D";
}

function computeGroupTable(g, scores) {
  const teams = GROUPS[g];
  const row = {};
  for (const t of teams) row[t] = { team: t, pld: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
  const gm = MATCHES.filter((m) => m.g === g);
  for (const mm of gm) {
    const s = scores[mm.m];
    if (!s || s.hg == null || s.ag == null) continue;
    const H = row[mm.h], A = row[mm.a];
    H.pld++; A.pld++; H.gf += s.hg; H.ga += s.ag; A.gf += s.ag; A.ga += s.hg;
    if (s.hg > s.ag) { H.w++; H.pts += 3; A.l++; }
    else if (s.hg < s.ag) { A.w++; A.pts += 3; H.l++; }
    else { H.d++; A.d++; H.pts++; A.pts++; }
  }
  for (const t of teams) row[t].gd = row[t].gf - row[t].ga;
  let table = teams.map((t) => row[t]);
  table.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  return { group: g, table };
}

function playerR32(picks) {
  const scores = picks.scores || {};
  const complete = MATCHES.every((m) => scores[m.m] && scores[m.m].hg != null && scores[m.m].ag != null);
  if (!complete) return [];
  const top2 = [], thirds = [];
  for (const g of Object.keys(GROUPS)) {
    const r = computeGroupTable(g, scores);
    const t = r.table;
    top2.push(t[0].team, t[1].team);
    thirds.push({ ...t[2], group: g });
  }
  thirds.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  const best8 = thirds.slice(0, 8).map((r) => r.team);
  return [...top2, ...best8];
}

async function main() {
  console.log("Fetching all data from Firestore...\n");

  const snap = await getDocs(collection(db, "pool"));
  const docs = {};
  snap.forEach((d) => {
    const id = d.id.replaceAll("__", ":");
    docs[id] = d.data().value;
  });

  const players = docs[`${NS}players`] || {};
  const playerIds = Object.keys(players);
  const results = docs[`${NS}results`] || { scores: {}, advanced: {} };

  console.log(`=== POOL ANALYTICS (${playerIds.length} players) ===\n`);
  console.log("Players:", playerIds.map((id) => players[id]).join(", "));
  console.log();

  const playerData = {};
  for (const id of playerIds) {
    const key = `${NS}player:${id}`;
    playerData[id] = docs[key] || { picks: { scores: {}, advanced: {} } };
  }

  // --- 1. Champion Picks ---
  console.log("━".repeat(60));
  console.log("🏆 CHAMPION PICKS");
  console.log("━".repeat(60));
  const champCounts = {};
  for (const id of playerIds) {
    const picks = playerData[id].picks || {};
    const champ = (picks.advanced?.champ || [])[0] || "None";
    champCounts[champ] = (champCounts[champ] || 0) + 1;
    console.log(`  ${players[id]}: ${champ}`);
  }
  console.log("\n  Tally:");
  Object.entries(champCounts).sort((a, b) => b[1] - a[1]).forEach(([team, count]) => {
    console.log(`    ${team}: ${count} pick${count > 1 ? "s" : ""} (${Math.round(100 * count / playerIds.length)}%)`);
  });

  // --- 2. Finalist Picks ---
  console.log("\n" + "━".repeat(60));
  console.log("🥇🥈 FINALIST PICKS");
  console.log("━".repeat(60));
  const finalistCounts = {};
  for (const id of playerIds) {
    const picks = playerData[id].picks || {};
    const finalists = picks.advanced?.final || [];
    console.log(`  ${players[id]}: ${finalists.join(" vs ") || "None"}`);
    for (const t of finalists) finalistCounts[t] = (finalistCounts[t] || 0) + 1;
  }
  console.log("\n  Tally:");
  Object.entries(finalistCounts).sort((a, b) => b[1] - a[1]).forEach(([team, count]) => {
    console.log(`    ${team}: ${count} (${Math.round(100 * count / playerIds.length)}%)`);
  });

  // --- 3. Semifinalist Picks ---
  console.log("\n" + "━".repeat(60));
  console.log("🏅 SEMIFINALIST PICKS");
  console.log("━".repeat(60));
  const sfCounts = {};
  for (const id of playerIds) {
    const picks = playerData[id].picks || {};
    const sfs = picks.advanced?.sf || [];
    console.log(`  ${players[id]}: ${sfs.join(", ") || "None"}`);
    for (const t of sfs) sfCounts[t] = (sfCounts[t] || 0) + 1;
  }
  console.log("\n  Tally:");
  Object.entries(sfCounts).sort((a, b) => b[1] - a[1]).forEach(([team, count]) => {
    console.log(`    ${team}: ${count} (${Math.round(100 * count / playerIds.length)}%)`);
  });

  // --- 4. Most Popular Group Stage Predictions ---
  console.log("\n" + "━".repeat(60));
  console.log("⚽ GROUP MATCH PREDICTIONS - CONSENSUS vs CONTRARIANS");
  console.log("━".repeat(60));
  const matchConsensus = [];
  for (const mm of MATCHES) {
    const outcomes = { H: 0, D: 0, A: 0 };
    const exactScores = {};
    for (const id of playerIds) {
      const picks = playerData[id].picks || {};
      const s = (picks.scores || {})[mm.m];
      const o = predOutcome(s);
      if (o) outcomes[o]++;
      if (s && s.hg != null && s.ag != null) {
        const key = `${s.hg}-${s.ag}`;
        exactScores[key] = (exactScores[key] || 0) + 1;
      }
    }
    const total = outcomes.H + outcomes.D + outcomes.A;
    if (total === 0) continue;
    const maxOutcome = Object.entries(outcomes).sort((a, b) => b[1] - a[1])[0];
    const consensusPct = Math.round(100 * maxOutcome[1] / total);
    const topScore = Object.entries(exactScores).sort((a, b) => b[1] - a[1])[0];
    matchConsensus.push({ mm, outcomes, total, consensusPct, maxOutcome, topScore });
  }

  console.log("\n  Most agreed-upon matches:");
  matchConsensus.sort((a, b) => b.consensusPct - a.consensusPct);
  for (const mc of matchConsensus.slice(0, 10)) {
    const o = mc.maxOutcome[0] === "H" ? mc.mm.h + " win" : mc.maxOutcome[0] === "A" ? mc.mm.a + " win" : "Draw";
    console.log(`    M${mc.mm.m} ${mc.mm.h} vs ${mc.mm.a}: ${mc.consensusPct}% pick ${o}${mc.topScore ? ` (most common: ${mc.topScore[0]}, ${mc.topScore[1]}x)` : ""}`);
  }

  console.log("\n  Most divided matches:");
  matchConsensus.sort((a, b) => a.consensusPct - b.consensusPct);
  for (const mc of matchConsensus.slice(0, 10)) {
    console.log(`    M${mc.mm.m} ${mc.mm.h} vs ${mc.mm.a}: H ${mc.outcomes.H} / D ${mc.outcomes.D} / A ${mc.outcomes.A}`);
  }

  // --- 5. Biggest Upsets Predicted ---
  console.log("\n" + "━".repeat(60));
  console.log("🎯 CONTRARIAN PICKS (Unique predictions)");
  console.log("━".repeat(60));
  for (const mm of MATCHES) {
    for (const id of playerIds) {
      const picks = playerData[id].picks || {};
      const s = (picks.scores || {})[mm.m];
      const o = predOutcome(s);
      if (!o) continue;
      let othersWithSame = 0;
      for (const oid of playerIds) {
        if (oid === id) continue;
        const op = playerData[oid].picks || {};
        const os = (op.scores || {})[mm.m];
        if (predOutcome(os) === o) othersWithSame++;
      }
      if (othersWithSame === 0) {
        const label = o === "H" ? `${mm.h} win` : o === "A" ? `${mm.a} win` : "Draw";
        console.log(`  ${players[id]} is ALONE picking ${label} in M${mm.m} ${mm.h} vs ${mm.a} (${s.hg}-${s.ag})`);
      }
    }
  }

  // --- 6. Most Popular Teams to Advance (R32) ---
  console.log("\n" + "━".repeat(60));
  console.log("📊 ROUND OF 32 - TEAM POPULARITY");
  console.log("━".repeat(60));
  const r32Counts = {};
  for (const id of playerIds) {
    const picks = playerData[id].picks || {};
    const r32 = playerR32(picks);
    for (const t of r32) r32Counts[t] = (r32Counts[t] || 0) + 1;
  }
  const teamsByGroup = {};
  for (const [g, teams] of Object.entries(GROUPS)) {
    teamsByGroup[g] = teams.map((t) => ({ team: t, count: r32Counts[t] || 0, pct: Math.round(100 * (r32Counts[t] || 0) / playerIds.length) }))
      .sort((a, b) => b.count - a.count);
  }
  for (const [g, teams] of Object.entries(teamsByGroup)) {
    console.log(`  Group ${g}:`);
    for (const t of teams) {
      const bar = "█".repeat(Math.round(t.pct / 5));
      console.log(`    ${t.team.padEnd(25)} ${String(t.count).padStart(2)}/${playerIds.length} (${String(t.pct).padStart(3)}%) ${bar}`);
    }
  }

  // --- 7. Teams nobody picked to advance ---
  console.log("\n" + "━".repeat(60));
  console.log("❌ TEAMS NOBODY PICKED TO ADVANCE PAST R32");
  console.log("━".repeat(60));
  const r16Counts = {};
  for (const id of playerIds) {
    const picks = playerData[id].picks || {};
    for (const t of (picks.advanced?.r16 || [])) r16Counts[t] = (r16Counts[t] || 0) + 1;
  }
  const allTeams = Object.values(GROUPS).flat();
  const neverR16 = allTeams.filter((t) => !r16Counts[t]);
  console.log(`  ${neverR16.join(", ") || "None"}`);

  // --- 8. Predicted Group Winners ---
  console.log("\n" + "━".repeat(60));
  console.log("👑 PREDICTED GROUP WINNERS");
  console.log("━".repeat(60));
  for (const g of Object.keys(GROUPS)) {
    const winnerCounts = {};
    for (const id of playerIds) {
      const picks = playerData[id].picks || {};
      const tbl = computeGroupTable(g, picks.scores || {});
      const winner = tbl.table[0]?.team;
      if (winner) winnerCounts[winner] = (winnerCounts[winner] || 0) + 1;
    }
    const sorted = Object.entries(winnerCounts).sort((a, b) => b[1] - a[1]);
    console.log(`  Group ${g}: ${sorted.map(([t, c]) => `${t} (${c})`).join(", ")}`);
  }

  // --- 9. Score Prediction Stats ---
  console.log("\n" + "━".repeat(60));
  console.log("📈 SCORE PREDICTION STYLE");
  console.log("━".repeat(60));
  for (const id of playerIds) {
    const picks = playerData[id].picks || {};
    const scores = picks.scores || {};
    let totalGoals = 0, games = 0, draws = 0, homeWins = 0, awayWins = 0;
    for (const mm of MATCHES) {
      const s = scores[mm.m];
      if (!s || s.hg == null || s.ag == null) continue;
      games++;
      totalGoals += s.hg + s.ag;
      if (s.hg === s.ag) draws++;
      else if (s.hg > s.ag) homeWins++;
      else awayWins++;
    }
    if (games > 0) {
      console.log(`  ${players[id].padEnd(20)} Avg goals/game: ${(totalGoals / games).toFixed(1)}  Home wins: ${homeWins}  Draws: ${draws}  Away wins: ${awayWins}`);
    }
  }

  // --- 10. Actual results so far ---
  const actualScores = results.scores || {};
  const playedMatches = MATCHES.filter((mm) => actualScores[mm.m] && actualScores[mm.m].hg != null);
  if (playedMatches.length > 0) {
    console.log("\n" + "━".repeat(60));
    console.log(`🏟️  RESULTS SO FAR (${playedMatches.length} matches played)`);
    console.log("━".repeat(60));

    for (const mm of playedMatches) {
      const s = actualScores[mm.m];
      let correct = 0;
      const correctNames = [];
      const exactNames = [];
      for (const id of playerIds) {
        const picks = playerData[id].picks || {};
        const ps = (picks.scores || {})[mm.m];
        if (predOutcome(ps) === predOutcome(s)) {
          correct++;
          correctNames.push(players[id]);
          if (ps && ps.hg === s.hg && ps.ag === s.ag) exactNames.push(players[id]);
        }
      }
      console.log(`  M${mm.m} ${mm.h} ${s.hg}-${s.ag} ${mm.a}: ${correct}/${playerIds.length} correct${exactNames.length ? ` (EXACT: ${exactNames.join(", ")})` : ""}`);
    }

    console.log("\n  Current accuracy ranking:");
    const accuracy = [];
    for (const id of playerIds) {
      const picks = playerData[id].picks || {};
      let correct = 0;
      for (const mm of playedMatches) {
        const s = actualScores[mm.m];
        const ps = (picks.scores || {})[mm.m];
        if (predOutcome(ps) === predOutcome(s)) correct++;
      }
      accuracy.push({ name: players[id], correct, pct: Math.round(100 * correct / playedMatches.length) });
    }
    accuracy.sort((a, b) => b.correct - a.correct);
    accuracy.forEach((a, i) => {
      console.log(`    ${i + 1}. ${a.name.padEnd(20)} ${a.correct}/${playedMatches.length} (${a.pct}%)`);
    });
  }

  // --- Save frozen snapshot to Firestore ---
  console.log("\n" + "━".repeat(60));
  console.log("Saving analysis snapshot to Firestore...");
  console.log("━".repeat(60));

  const snapPicks = {};
  for (const id of playerIds) {
    const name = players[id];
    snapPicks[name] = playerData[id].picks || { scores: {}, advanced: {} };
  }
  const K_ANALYSIS = NS + "analysis";
  const aDocId = K_ANALYSIS.replaceAll(":", "__");

  // Load existing editions
  const existingDoc = await getDocs(collection(db, "pool"));
  let existing = [];
  existingDoc.forEach((d) => {
    if (d.id === aDocId) {
      const val = d.data().value;
      if (Array.isArray(val)) existing = val;
    }
  });

  // Determine which edition to create based on command-line arg
  const editionArg = process.argv[2] || "round1";

  // Filter results to only include matches up to this edition's cutoff
  const maxMatch = editionArg === "round3" ? 72 : editionArg === "round2" ? 48 : 24;
  const filteredScores = {};
  for (const [m, s] of Object.entries(results.scores || {})) {
    if (Number(m) <= maxMatch) filteredScores[m] = s;
  }
  const snapshot = {
    playerPicks: snapPicks,
    results: { scores: filteredScores, advanced: results.advanced || {} },
  };

  let newEdition;
  if (editionArg === "qf") {
    // Post–Quarterfinal edition: capture the SF field (advanced.sf) + koScores.
    const koSnapshot = {
      playerPicks: snapPicks,
      results: {
        scores: results.scores || {},
        advanced: results.advanced || {},
        koScores: results.koScores || {},
      },
    };
    newEdition = {
      id: "ko-qf",
      title: "Quarterfinals — The Final Four",
      headline: "THE FINAL FOUR",
      publishedAt: new Date().toISOString(),
      stage: { gamesTag: "QUARTERFINALS", wonKey: "sf", wonLabel: "semifinals", nextKey: "final", nextLabel: "final", nextTitle: "FINAL", nextShort: "FINAL", nextPlace: "final", lockedLabel: "Group + R32 + R16 + QF locked", raceLead: "", raceTail: "The gaps at the top are tiny — but with only the semifinals and final left, the Road to Glory cards below show the door has already closed for several players." },
      cards: ["survivors", "broken-brackets", "collisions", "question", "title-race", "scenarios"],
      scenarioTeams: ["France", "Spain", "England", "Argentina"],
      snapshot: koSnapshot,
    };
  } else if (editionArg === "r16") {
    // Post–Round of 16 edition: capture the QF field (advanced.qf) + koScores.
    const koSnapshot = {
      playerPicks: snapPicks,
      results: {
        scores: results.scores || {},
        advanced: results.advanced || {},
        koScores: results.koScores || {},
      },
    };
    newEdition = {
      id: "ko-r16",
      title: "Round of 16 — The Elite Eight",
      headline: "THE ELITE EIGHT",
      publishedAt: new Date().toISOString(),
      stage: { gamesTag: "ROUND OF 16", wonKey: "qf", wonLabel: "quarterfinals", nextKey: "sf", nextLabel: "semifinals", nextTitle: "SEMIFINAL", nextShort: "SF", nextPlace: "last four", lockedLabel: "Group + R32 + R16 + QF locked", raceLead: "", raceTail: "The gaps are small and the biggest points are still ahead — but dig into the specific scenarios below and some players already have no path left to an outright win." },
      cards: ["survivors", "broken-brackets", "collisions", "question", "title-race", "scenarios", "chaos"],
      scenarioTeams: ["France", "Spain", "England", "Argentina"],
      snapshot: koSnapshot,
    };
  } else if (editionArg === "r32") {
    // Post–Round of 32 edition: capture the R16 field (advanced.r16) and the R32 match
    // results (koScores) so the survivor/collision/title-race cards can be computed.
    const koSnapshot = {
      playerPicks: snapPicks,
      results: {
        scores: results.scores || {},
        advanced: results.advanced || {},
        koScores: results.koScores || {},
      },
    };
    newEdition = {
      id: "ko-r32",
      title: "Round of 32 — The Cull",
      headline: "THE CULL",
      publishedAt: new Date().toISOString(),
      cards: ["survivors", "broken-brackets", "r16-collisions", "qf-question", "title-race", "odds-ends"],
      collisionNote: "Every player left the USA out of their semifinals — Mauricio Pochettino would ask, “why not us?” The twist: Daaaaaaaave and Gary, both Americans, backed Belgium to reach the last four — never guessing the US would be staring them down in Seattle in the sweet 16.",
      customTidbits: [
        { h: "The DeRise brothers back La Roja", p: "Jason, Greg and Eric all put their Spanish heritage on the line — every one of the brothers has Spain lifting the trophy." },
        { h: "The London connection", p: "Of the six players with connections to London, only the UK citizens of the group, Andrew and Rebecca, backed England to win it all. Meanwhile Mark, Kyle, Jason and Greg all back other countries despite England being their home for many years. That same London six have bunched right back up in the table like an old group chat — they hold every spot from 6th to 11th, the whole reunion separated by just nine points." },
      ],
      snapshot: koSnapshot,
    };
  } else if (editionArg === "round3") {
    // Freeze knockout advancement empty — this edition is the moment the groups finished,
    // so standings movement reflects group points + Round-of-32 points only.
    const r3snapshot = {
      playerPicks: snapPicks,
      results: { scores: filteredScores, advanced: { r32: [], r16: [], qf: [], sf: [], final: [], champ: [] } },
    };
    newEdition = {
      id: "round3",
      title: "Round 3 — The Groups Are Settled",
      headline: "THE GROUPS ARE SETTLED",
      publishedAt: new Date().toISOString(),
      roundLabel: "Final round",
      tagLabel: "MATCHDAY 5-6",
      matchRange: [49, 72],
      movementLabel: "Round 2 → Round 3",
      movementFrom: "Round 2",
      movementTo: "Round 3",
      includeR32: true,
      cards: ["matchday", "standings-movement", "knockout-preview", "consensus"],
      snapshot: r3snapshot,
    };
  } else if (editionArg === "round2") {
    newEdition = {
      id: "round2",
      title: "Round 2 — The Plot Thickens",
      headline: "THE PLOT THICKENS",
      publishedAt: new Date().toISOString(),
      roundLabel: "Second round",
      tagLabel: "MATCHDAY 3-4",
      matchRange: [25, 48],
      previewRange: [49, 72],
      previewLabel: "Round 3",
      previewTagLabel: "MATCHDAY 5-6",
      movementLabel: "Round 1 → Round 2",
      movementFrom: "Round 1",
      movementTo: "Round 2",
      cards: ["matchday", "standings-movement", "consensus", "preview"],
      snapshot,
    };
  } else {
    newEdition = {
      id: "round1",
      title: "Round 1 — Opening Salvo",
      headline: "THE CRYSTAL BALL IS CRACKED",
      publishedAt: new Date().toISOString(),
      roundLabel: "First round",
      tagLabel: "MATCHDAY 1-2",
      matchRange: [1, 24],
      previewRange: [25, 48],
      previewLabel: "Round 2",
      previewTagLabel: "MATCHDAY 3-4",
      cards: ["matchday", "knockout-vision", "consensus", "preview"],
      snapshot,
    };
  }

  // Replace edition with same id, or prepend
  const filtered = existing.filter((e) => e.id !== newEdition.id);
  const editions = [newEdition, ...filtered];

  await setDoc(doc(db, "pool", aDocId), { value: editions });
  console.log("Edition saved:", newEdition.id, "(" + newEdition.title + ")");
  console.log("Total editions:", editions.length);
  console.log("Timestamp:", newEdition.publishedAt);

  console.log("\n" + "━".repeat(60));
  console.log("Done!");
  console.log("━".repeat(60));

  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
