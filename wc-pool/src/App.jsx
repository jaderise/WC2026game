import React, { useState, useEffect, useMemo } from "react";
import { db } from "./firebase";
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, onSnapshot, query, orderBy, startAt, endAt, documentId } from "firebase/firestore";

/* =========================================================================
   WORLD CUP 2026 PREDICTION POOL
   ========================================================================= */

const SANDBOX = import.meta.env.DEV;
const NS = SANDBOX ? "wc26test:" : "wc26:";

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
const ALL_TEAMS = Object.values(GROUPS).flat();

const FEED_ALIASES = {
  "United States": "USA", "Côte d'Ivoire": "Ivory Coast", "Curaçao": "Curacao",
  "Korea Republic": "South Korea", "IR Iran": "Iran", "Turkey": "Türkiye",
  "Czech Republic": "Czechia", "Congo DR": "DR Congo", "DR Congo": "DR Congo",
  "Bosnia-Herzegovina": "Bosnia and Herzegovina", "Bosnia & Herzegovina": "Bosnia and Herzegovina",
};
const normalizeFeedTeam = (n) => FEED_ALIASES[n] || n;

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

const matchByTeams = (() => { const map = {}; for (const mm of MATCHES) map[[mm.h, mm.a].sort().join("|")] = mm.m; return map; })();

const ROUNDS = [
  { key: "r32", label: "Round of 32", count: 32, pts: 2 },
  { key: "r16", label: "Round of 16", count: 16, pts: 3 },
  { key: "qf", label: "Quarterfinals", count: 8, pts: 5 },
  { key: "sf", label: "Semifinals", count: 4, pts: 8 },
  { key: "final", label: "Final", count: 2, pts: 13 },
  { key: "champ", label: "Champion", count: 1, pts: 21 },
];
const GROUP_MATCH_PTS = 1;
const DEADLINE_ISO = "2026-06-11T19:00:00Z";

/* Knockout bracket — R32 matchups locked once groups completed.
   R32 carries real teams + group-seed labels; later rounds carry feeder match nums (f1/f2),
   resolved to actual teams from results.advanced as the commissioner sets advancement.
   Times converted to US Eastern (EDT). */
const KNOCKOUT = [
  { n: 73, r: "r32", et: "Sun Jun 28, 3:00 PM ET", v: "Los Angeles", a: "South Africa", as: "2A", b: "Canada", bs: "2B" },
  { n: 74, r: "r32", et: "Mon Jun 29, 4:30 PM ET", v: "Boston", a: "Germany", as: "1E", b: "Paraguay", bs: "3D" },
  { n: 75, r: "r32", et: "Mon Jun 29, 9:00 PM ET", v: "Monterrey", a: "Netherlands", as: "1F", b: "Morocco", bs: "2C" },
  { n: 76, r: "r32", et: "Mon Jun 29, 1:00 PM ET", v: "Houston", a: "Brazil", as: "1C", b: "Japan", bs: "2F" },
  { n: 77, r: "r32", et: "Tue Jun 30, 5:00 PM ET", v: "New York/New Jersey", a: "France", as: "1I", b: "Sweden", bs: "3F" },
  { n: 78, r: "r32", et: "Tue Jun 30, 1:00 PM ET", v: "Dallas", a: "Ivory Coast", as: "2E", b: "Norway", bs: "2I" },
  { n: 79, r: "r32", et: "Tue Jun 30, 9:00 PM ET", v: "Mexico City", a: "Mexico", as: "1A", b: "Ecuador", bs: "3E" },
  { n: 80, r: "r32", et: "Wed Jul 1, 12:00 PM ET", v: "Atlanta", a: "England", as: "1L", b: "DR Congo", bs: "3K" },
  { n: 81, r: "r32", et: "Wed Jul 1, 8:00 PM ET", v: "San Francisco Bay Area", a: "USA", as: "1D", b: "Bosnia and Herzegovina", bs: "3B" },
  { n: 82, r: "r32", et: "Wed Jul 1, 4:00 PM ET", v: "Seattle", a: "Belgium", as: "1G", b: "Senegal", bs: "3I" },
  { n: 83, r: "r32", et: "Thu Jul 2, 7:00 PM ET", v: "Toronto", a: "Portugal", as: "2K", b: "Croatia", bs: "2L" },
  { n: 84, r: "r32", et: "Thu Jul 2, 3:00 PM ET", v: "Los Angeles", a: "Spain", as: "1H", b: "Austria", bs: "2J" },
  { n: 85, r: "r32", et: "Thu Jul 2, 11:00 PM ET", v: "Vancouver", a: "Switzerland", as: "1B", b: "Algeria", bs: "3J" },
  { n: 86, r: "r32", et: "Fri Jul 3, 6:00 PM ET", v: "Miami", a: "Argentina", as: "1J", b: "Cape Verde", bs: "2H" },
  { n: 87, r: "r32", et: "Fri Jul 3, 9:30 PM ET", v: "Kansas City", a: "Colombia", as: "1K", b: "Ghana", bs: "3L" },
  { n: 88, r: "r32", et: "Fri Jul 3, 2:00 PM ET", v: "Dallas", a: "Australia", as: "2D", b: "Egypt", bs: "2G" },
  { n: 89, r: "r16", et: "Sat Jul 4, 5:00 PM ET", v: "Philadelphia", f1: 74, f2: 77 },
  { n: 90, r: "r16", et: "Sat Jul 4, 1:00 PM ET", v: "Houston", f1: 73, f2: 75 },
  { n: 91, r: "r16", et: "Sun Jul 5, 4:00 PM ET", v: "New York/New Jersey", f1: 76, f2: 78 },
  { n: 92, r: "r16", et: "Sun Jul 5, 8:00 PM ET", v: "Mexico City", f1: 79, f2: 80 },
  { n: 93, r: "r16", et: "Mon Jul 6, 3:00 PM ET", v: "Dallas", f1: 83, f2: 84 },
  { n: 94, r: "r16", et: "Mon Jul 6, 8:00 PM ET", v: "Seattle", f1: 81, f2: 82 },
  { n: 95, r: "r16", et: "Tue Jul 7, 12:00 PM ET", v: "Atlanta", f1: 86, f2: 88 },
  { n: 96, r: "r16", et: "Tue Jul 7, 4:00 PM ET", v: "Vancouver", f1: 85, f2: 87 },
  { n: 97, r: "qf", et: "Thu Jul 9, 4:00 PM ET", v: "Boston", f1: 89, f2: 90 },
  { n: 98, r: "qf", et: "Fri Jul 10, 3:00 PM ET", v: "Los Angeles", f1: 93, f2: 94 },
  { n: 99, r: "qf", et: "Sat Jul 11, 5:00 PM ET", v: "Miami", f1: 91, f2: 92 },
  { n: 100, r: "qf", et: "Sat Jul 11, 9:00 PM ET", v: "Kansas City", f1: 95, f2: 96 },
  { n: 101, r: "sf", et: "Tue Jul 14, 3:00 PM ET", v: "Dallas", f1: 97, f2: 98 },
  { n: 102, r: "sf", et: "Wed Jul 15, 3:00 PM ET", v: "Atlanta", f1: 99, f2: 100 },
  { n: 103, r: "third", et: "Sat Jul 18, 5:00 PM ET", v: "Miami", l1: 101, l2: 102 },
  { n: 104, r: "final", et: "Sun Jul 19, 3:00 PM ET", v: "New York/New Jersey", f1: 101, f2: 102 },
];
const KO_NEXT = { r32: "r16", r16: "qf", qf: "sf", sf: "final", final: "champ" };
const KO_BY_NUM = Object.fromEntries(KNOCKOUT.map((m) => [m.n, m]));
// Knockout-edition "stage" config. wonKey = the round teams reached by winning the games this
// edition covers (also the KNOCKOUT round of the games shown as upcoming); nextKey = the round
// those survivors now play toward. DEFAULT_STAGE reproduces the post-Round-of-32 edition.
const KO_SEQ = ["r16", "qf", "sf", "final", "champ"];
const KO_PTS = { r16: 3, qf: 5, sf: 8, final: 13, champ: 21 };
// gamesLabel/gamesTag = the round of games this edition covers; wonKey/wonLabel = where survivors
// have reached; nextKey/nextLabel/nextTitle/nextPlace = the round they now play toward.
const DEFAULT_STAGE = { gamesTag: "ROUND OF 32", wonKey: "r16", wonLabel: "Round of 16", nextKey: "qf", nextLabel: "quarterfinals", nextTitle: "QUARTERFINAL", nextShort: "QF", nextPlace: "last eight", lockedLabel: "Group + R32 + R16 locked", collisionNoteTitle: "THE SEATTLE SUBPLOT" };
const FEED_URL = "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";
const FETCH_INTERVAL_MS = 15 * 60 * 1000;

/* ---------- Firestore storage ---------- */
const docId = (key) => key.replaceAll(":", "__");

async function sGet(key) {
  try {
    const snap = await getDoc(doc(db, "pool", docId(key)));
    return snap.exists() ? snap.data().value : null;
  } catch (e) { console.error(e); return null; }
}
async function sSet(key, val) {
  try {
    await setDoc(doc(db, "pool", docId(key)), { value: val, key });
    return true;
  } catch (e) { console.error(e); return false; }
}
async function sList(prefix) {
  try {
    // Document-ID range query: fetch only the docs whose ID begins with `pfx`,
    // instead of downloading the whole collection (which includes the large analysis doc
    // and the other namespace's docs). U+F8FF is a high code point that bounds the prefix.
    const pfx = docId(prefix);
    const q = query(collection(db, "pool"), orderBy(documentId()), startAt(pfx), endAt(pfx + "\uf8ff"));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.id).map(id => id.replaceAll("__", ":"));
  } catch (e) { console.error(e); return []; }
}
async function sDelete(key) {
  try { await deleteDoc(doc(db, "pool", docId(key))); return true; }
  catch (e) { console.error(e); return false; }
}

/* ---------- Live updates via Firestore onSnapshot ---------- */
const LIVE_ENABLED = true;
// Listen only to the docs that change live during the tournament — results (scores,
// advancement, announcements) and the player registry — instead of the whole collection.
// This keeps the large analysis doc (and the other namespace's docs) off every client's
// live stream and cold load; the Analysis tab fetches its own doc on demand.
function liveSubscribe(onChange) {
  const unsubs = [
    onSnapshot(doc(db, "pool", docId(K_RESULTS)), () => onChange()),
    onSnapshot(doc(db, "pool", docId(K_PLAYERS)), () => onChange()),
  ];
  return () => unsubs.forEach((u) => u && u());
}

const K_RESULTS = NS + "results";
const K_ANALYSIS = NS + "analysis";
const playerKey = (id) => `${NS}player:${id}`;
const K_PLAYERS = NS + "players";

const emptyResults = () => ({ scores: {}, advanced: { r32: [], r16: [], qf: [], sf: [], final: [], champ: [] }, advancedMeta: {}, koScores: {}, manualOrder: {}, manualThird: [], revealed: false, feedAt: null });
const emptyPicks = () => ({ scores: {}, advanced: { r16: [], qf: [], sf: [], final: [], champ: [] } });

/* ---------- standings engine ---------- */
function computeGroupTable(g, scores, manualOrder) {
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
  const ties = [];
  for (let i = 0; i < table.length;) {
    let j = i + 1;
    while (j < table.length && table[j].pts === table[i].pts && table[j].gd === table[i].gd && table[j].gf === table[i].gf) j++;
    if (j - i > 1) ties.push(table.slice(i, j).map((r) => r.team));
    i = j;
  }
  if (manualOrder && manualOrder[g] && manualOrder[g].length) {
    const ord = manualOrder[g];
    table.sort((a, b) => {
      const prim = b.pts - a.pts || b.gd - a.gd || b.gf - a.gf;
      if (prim) return prim;
      const pa = ord.indexOf(a.team), pb = ord.indexOf(b.team);
      if (pa === -1 || pb === -1) return 0;
      return pa - pb;
    });
  }
  const complete = gm.every((m) => scores[m.m] && scores[m.m].hg != null && scores[m.m].ag != null);
  const unresolved = ties.filter((grp) => !(manualOrder && manualOrder[g] && grp.every((t) => manualOrder[g].includes(t))));
  return { group: g, table, complete, ties, unresolved };
}
function computeQualifiers(scores, manualOrder, manualThird) {
  const tables = {}; let allComplete = true; const pendingTies = [];
  for (const g of Object.keys(GROUPS)) {
    const r = computeGroupTable(g, scores, manualOrder);
    tables[g] = r;
    if (!r.complete) allComplete = false;
    if (r.unresolved.length) pendingTies.push({ group: g, ties: r.unresolved });
  }
  const top2 = [], thirds = [];
  for (const g of Object.keys(GROUPS)) { const t = tables[g].table; top2.push(t[0].team, t[1].team); thirds.push({ ...t[2], group: g }); }
  thirds.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  const thirdTies = [];
  for (let i = 0; i < thirds.length;) {
    let j = i + 1;
    while (j < thirds.length && thirds[j].pts === thirds[i].pts && thirds[j].gd === thirds[i].gd && thirds[j].gf === thirds[i].gf) j++;
    if (j - i > 1) thirdTies.push(thirds.slice(i, j).map((r) => r.team));
    i = j;
  }
  if (manualThird && manualThird.length) {
    thirds.sort((a, b) => { const prim = b.pts - a.pts || b.gd - a.gd || b.gf - a.gf; if (prim) return prim; const pa = manualThird.indexOf(a.team), pb = manualThird.indexOf(b.team); if (pa === -1 || pb === -1) return 0; return pa - pb; });
  }
  const best8 = thirds.slice(0, 8).map((r) => r.team);
  const r32 = [...top2, ...best8];
  const cutoffThirdTie = thirdTies.filter((grp) => {
    const idxs = grp.map((t) => thirds.findIndex((r) => r.team === t));
    const straddles = Math.min(...idxs) < 8 && Math.max(...idxs) >= 8;
    const resolved = manualThird && grp.every((t) => manualThird.includes(t));
    return straddles && !resolved;
  });
  return { tables, allComplete, r32, top2, best8, pendingTies, thirdTies: cutoffThirdTie };
}

function predOutcome(score) {
  if (!score || score.hg == null || score.ag == null) return null;
  return score.hg > score.ag ? "H" : score.hg < score.ag ? "A" : "D";
}
function playerR32(picks) {
  const scores = picks.scores || {};
  const complete = MATCHES.every((m) => scores[m.m] && scores[m.m].hg != null && scores[m.m].ag != null);
  if (!complete) return { r32: [], complete: false };
  const q = computeQualifiers(scores, picks.manualOrder || {}, picks.manualThird || []);
  return { r32: q.r32, complete: true, pendingTies: q.pendingTies, thirdTies: q.thirdTies, tables: q.tables };
}
function scorePlayer(picks, results) {
  let total = 0; const breakdown = { group: 0 };
  for (const mm of MATCHES) {
    const predS = (picks.scores || {})[mm.m];
    const pred = predOutcome(predS);
    const act = predOutcome(results.scores[mm.m]);
    if (pred && act && pred === act) { total += GROUP_MATCH_PTS; breakdown.group += GROUP_MATCH_PTS; }
  }
  const actualQual = computeQualifiers(results.scores, results.manualOrder || {}, results.manualThird || []);
  const actualR32 = actualQual.allComplete ? actualQual.r32 : (results.advanced.r32 || []);
  const myR32 = playerR32(picks).r32;
  for (const r of ROUNDS) {
    let predList, actList;
    if (r.key === "r32") { predList = myR32; actList = actualR32; }
    else { predList = picks.advanced[r.key] || []; actList = results.advanced[r.key] || []; }
    const actSet = new Set(actList);
    let hits = 0; for (const t of new Set(predList)) if (actSet.has(t)) hits++;
    breakdown[r.key] = hits * r.pts; total += hits * r.pts;
  }
  return { total, breakdown };
}

function parseFeedScores(json) {
  const out = {};
  if (!json || !Array.isArray(json.matches)) return out;
  for (const g of json.matches) {
    const ft = g.score && g.score.ft;
    if (!ft || ft.length !== 2) continue;
    const t1 = normalizeFeedTeam(g.team1), t2 = normalizeFeedTeam(g.team2);
    const mid = matchByTeams[[t1, t2].sort().join("|")];
    if (!mid) continue;
    const mm = MATCHES.find((x) => x.m === mid);
    const home1 = t1 === mm.h;
    out[mid] = { hg: home1 ? ft[0] : ft[1], ag: home1 ? ft[1] : ft[0] };
  }
  return out;
}

/* ---- Knockout feed parsing (matches 73–104, incl. extra time & penalties) ---- */
function koWinnerFromScore(s, t1, t2) {
  if (!s) return null;
  if (s.p && s.p.length === 2 && s.p[0] !== s.p[1]) return s.p[0] > s.p[1] ? t1 : t2; // penalties
  const base = (s.et && s.et.length === 2) ? s.et : s.ft; // after extra time, else 90'
  if (!base || base.length !== 2 || base[0] === base[1]) return null;
  return base[0] > base[1] ? t1 : t2;
}
function parseFeedKnockout(json) {
  const out = {};
  if (!json || !Array.isArray(json.matches)) return out;
  for (const g of json.matches) {
    if (typeof g.num !== "number" || g.num < 73 || g.num > 104) continue;
    const s = g.score;
    if (!s || !s.ft || s.ft.length !== 2) continue;
    const t1 = normalizeFeedTeam(g.team1), t2 = normalizeFeedTeam(g.team2);
    if (!ALL_TEAMS.includes(t1) || !ALL_TEAMS.includes(t2)) continue; // skip unresolved placeholder slots
    out[g.num] = { a: t1, b: t2, ft: s.ft || null, et: s.et || null, pen: s.p || null, winner: koWinnerFromScore(s, t1, t2) };
  }
  return out;
}
function deriveAdvancedFromKO(ko) {
  const rounds = { r16: [], qf: [], sf: [], final: [], champ: [] };
  for (const m of KNOCKOUT) {
    if (m.r === "third") continue;
    const ks = ko[m.n];
    if (!ks || !ks.winner) continue;
    const target = KO_NEXT[m.r];
    if (rounds[target]) rounds[target].push(ks.winner);
  }
  return rounds;
}
function koResultText(ks) {
  if (!ks || !ks.ft) return null;
  const base = ks.et || ks.ft;
  let s = base[0] + "–" + base[1];
  if (ks.et && ks.ft && (ks.et[0] !== ks.ft[0] || ks.et[1] !== ks.ft[1])) s += " a.e.t.";
  if (ks.pen) s += ` (pen ${ks.pen[0]}–${ks.pen[1]})`;
  return s;
}

const C = { ink: "#0B1F3A", paper: "#F7F4EC", line: "#D9D2C2", sun: "#E8B23A", pitch: "#1F7A4D", red: "#C0392B", mute: "#6B6353", chalk: "#FFFFFF" };
function Eyebrow({ children }) { return <div style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: C.mute, fontWeight: 700 }}>{children}</div>; }
function abbr(name) {
  const map = { "Bosnia and Herzegovina": "BIH", "Sweden": "SWE", "Türkiye": "TUR", "Czechia": "CZE", "DR Congo": "COD", "Iraq": "IRQ" };
  if (map[name]) return map[name];
  const p = name.split(" "); if (p.length === 1) return name.slice(0, 3).toUpperCase();
  return (p[0][0] + p[1][0] + (p[1][1] || "")).toUpperCase();
}
function ago(iso) { if (!iso) return ""; const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000); if (s < 60) return "just now"; if (s < 3600) return `${Math.floor(s / 60)}m ago`; if (s < 86400) return `${Math.floor(s / 3600)}h ago`; return `${Math.floor(s / 86400)}d ago`; }

export default function App() {
  const [tab, setTab] = useState("play");
  const [playerId, setPlayerId] = useState(null);
  const [playerName, setPlayerName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [picks, setPicks] = useState(emptyPicks());
  const [locked, setLocked] = useState(false);
  const [results, setResults] = useState(emptyResults());
  const [players, setPlayers] = useState({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [feedStatus, setFeedStatus] = useState("idle");
  const [standRows, setStandRows] = useState([]);
  const [confirmReset, setConfirmReset] = useState(false);
  const [leagueEntries, setLeagueEntries] = useState([]);
  const [analysisPosts, setAnalysisPosts] = useState([]);
  const [confirmReveal, setConfirmReveal] = useState(false);

  const now = Date.now();
  const deadline = new Date(DEADLINE_ISO).getTime();
  const pastDeadline = now >= deadline;
  const flash = (m) => { setToast(m); setTimeout(() => setToast(""), 2600); };

  const qual = useMemo(() => computeQualifiers(results.scores, results.manualOrder, results.manualThird), [results]);
  const autoR32 = qual.allComplete ? qual.r32 : [];

  useEffect(() => { (async () => {
    const res = await sGet(K_RESULTS); if (res) setResults({ ...emptyResults(), ...res });
    const idx = await sGet(K_PLAYERS); if (idx) setPlayers(idx);
    setLoading(false);
  })(); }, []);

  useEffect(() => {
    if (!LIVE_ENABLED) return;
    let alive = true;
    async function refresh() {
      const res = await sGet(K_RESULTS); if (alive && res) setResults({ ...emptyResults(), ...res });
      const idx = await sGet(K_PLAYERS); if (alive && idx) setPlayers(idx);
      if (alive) {
        const ids = await sList(NS + "player:"); const rows = [];
        for (const key of ids) { const data = await sGet(key); if (!data) continue;
          const sc = scorePlayer(data.picks || emptyPicks(), res || emptyResults());
          rows.push({ id: key, name: data.name || key, total: sc.total, breakdown: sc.breakdown, locked: !!data.locked }); }
        rows.sort((a, b) => b.total - a.total); setStandRows(rows);
      }
    }
    const unsub = liveSubscribe(() => { refresh(); });
    return () => { alive = false; unsub && unsub(); };
  }, []);

  useEffect(() => {
    let alive = true;
    async function pull() {
      try {
        const r = await fetch(FEED_URL, { cache: "no-store" });
        if (!r.ok) throw new Error("bad");
        const json = await r.json();
        const parsed = parseFeedScores(json);
        if (!alive) return;
        const koParsed = parseFeedKnockout(json);
        const cur = (await sGet(K_RESULTS)) || emptyResults();
        cur.scores = cur.scores || {};
        for (const [mid, sc] of Object.entries(parsed)) {
          const ex = cur.scores[mid];
          if (ex && ex.by && ex.by !== "openfootball") continue;
          if (!ex || ex.hg !== sc.hg || ex.ag !== sc.ag) cur.scores[mid] = { ...sc, by: "openfootball", at: new Date().toISOString() };
        }
        // Knockout results: store match scores, then derive advancement (respecting manual overrides per round)
        cur.koScores = cur.koScores || {};
        const nowISO = new Date().toISOString();
        for (const [num, ks] of Object.entries(koParsed)) {
          cur.koScores[num] = { ...ks, by: "openfootball", at: nowISO };
        }
        cur.advanced = cur.advanced || {};
        cur.advancedMeta = cur.advancedMeta || {};
        const derived = deriveAdvancedFromKO(cur.koScores);
        for (const rk of ["r16", "qf", "sf", "final", "champ"]) {
          const meta = cur.advancedMeta[rk];
          const manualLocked = meta && meta.by && meta.by !== "openfootball";
          if (manualLocked) continue; // a commissioner edited this round by hand — leave it alone
          if (derived[rk] && derived[rk].length) {
            cur.advanced[rk] = derived[rk];
            cur.advancedMeta[rk] = { by: "openfootball", at: nowISO };
          }
        }
        cur.feedAt = new Date().toISOString();
        await sSet(K_RESULTS, cur);
        if (alive) { setResults({ ...emptyResults(), ...cur }); setFeedStatus("ok"); }
      } catch { if (alive) setFeedStatus("fail"); }
    }
    pull(); const id = setInterval(pull, FETCH_INTERVAL_MS);
    return () => { alive = false; clearInterval(id); };
  }, []);

  async function joinAs(name) {
    const clean = name.trim(); if (!clean) return;
    const id = clean.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) || ("p" + Date.now());
    const existing = await sGet(playerKey(id));
    if (existing) { setPicks(existing.picks || emptyPicks()); setLocked(!!existing.locked); }
    else { setPicks(emptyPicks()); setLocked(false); }
    const idx = (await sGet(K_PLAYERS)) || {}; idx[id] = clean; await sSet(K_PLAYERS, idx); setPlayers(idx);
    setPlayerId(id); setPlayerName(clean);
  }
  async function postAnnouncement(text) {
    const clean = text.trim(); if (!clean) return;
    const cur = (await sGet(K_RESULTS)) || emptyResults();
    cur.announcements = cur.announcements || [];
    cur.announcements.unshift({ text: clean, by: playerName || "Commissioner", at: new Date().toISOString() });
    await sSet(K_RESULTS, cur); setResults({ ...emptyResults(), ...cur });
    flash("Announcement posted.");
  }
  async function deleteAnnouncement(idx) {
    const cur = (await sGet(K_RESULTS)) || emptyResults();
    cur.announcements = cur.announcements || [];
    cur.announcements.splice(idx, 1);
    await sSet(K_RESULTS, cur); setResults({ ...emptyResults(), ...cur });
    flash("Announcement removed.");
  }
  async function toggleEditingOpen() {
    const cur = (await sGet(K_RESULTS)) || emptyResults();
    cur.editingOpen = !cur.editingOpen;
    await sSet(K_RESULTS, cur); setResults({ ...emptyResults(), ...cur });
    flash(cur.editingOpen ? "Editing is open — players can update their picks." : "Editing closed — picks are locked again.");
  }
  async function toggleReveal() {
    const cur = (await sGet(K_RESULTS)) || emptyResults();
    cur.revealed = !cur.revealed;
    await sSet(K_RESULTS, cur); setResults({ ...emptyResults(), ...cur });
    flash(cur.revealed ? "All picks are now visible to the league." : "Picks hidden again.");
  }
  async function unlockPicks() {
    if (!playerId) return;
    const cur = (await sGet(playerKey(playerId))) || {};
    await sSet(playerKey(playerId), { ...cur, name: playerName, picks, locked: false });
    setLocked(false); flash("Picks unlocked — you can edit again.");
  }
  async function savePicks({ lock }) {
    if (!playerId) { flash("Enter your name first."); return; }
    const ok = await sSet(playerKey(playerId), { name: playerName, picks, locked: lock || locked });
    if (!ok) { flash("Couldn't save — storage unavailable."); return; }
    if (lock) setLocked(true);
    flash(lock ? "Picks locked in." : "Saved.");
  }
  const editable = !locked && (!pastDeadline || !!results.editingOpen);
  function setScorePick(m, hg, ag) {
    if (!editable) return;
    setPicks((p) => { const scores = { ...(p.scores || {}) }; if (hg === null) delete scores[m]; else scores[m] = { hg, ag }; return { ...p, scores }; });
  }
  function toggleAdvance(roundKey, team, max) {
    if (!editable) return;
    setPicks((p) => {
      const adv = { ...p.advanced };
      const cur = new Set(adv[roundKey] || []);
      const removing = cur.has(team);
      if (removing) cur.delete(team); else { if (cur.size >= max) return p; cur.add(team); }
      adv[roundKey] = [...cur];
      const order = ["r16", "qf", "sf", "final", "champ"];
      const startIdx = order.indexOf(roundKey);
      if (startIdx !== -1) {
        for (let i = startIdx + 1; i < order.length; i++) {
          const prev = new Set(adv[order[i - 1]] || []);
          adv[order[i]] = (adv[order[i]] || []).filter((t) => prev.has(t));
        }
      }
      return { ...p, advanced: adv };
    });
  }

  async function setScore(m, hg, ag) {
    const cur = (await sGet(K_RESULTS)) || emptyResults();
    cur.scores = cur.scores || {};
    if (hg === null) delete cur.scores[m];
    else cur.scores[m] = { hg, ag, by: playerName || "someone", at: new Date().toISOString() };
    await sSet(K_RESULTS, cur); setResults({ ...emptyResults(), ...cur });
  }
  async function setManualOrder(g, orderedTeams) {
    const cur = (await sGet(K_RESULTS)) || emptyResults();
    cur.manualOrder = { ...(cur.manualOrder || {}), [g]: orderedTeams };
    await sSet(K_RESULTS, cur); setResults({ ...emptyResults(), ...cur }); flash(`Group ${g} tiebreaker set.`);
  }
  async function setManualThird(orderedTeams) {
    const cur = (await sGet(K_RESULTS)) || emptyResults();
    cur.manualThird = orderedTeams;
    await sSet(K_RESULTS, cur); setResults({ ...emptyResults(), ...cur }); flash("Third-place tiebreaker set.");
  }
  async function toggleResultAdvance(roundKey, team, max) {
    const cur = (await sGet(K_RESULTS)) || emptyResults();
    const set = new Set(cur.advanced[roundKey] || []);
    if (set.has(team)) set.delete(team); else { if (set.size >= max) return; set.add(team); }
    cur.advanced[roundKey] = [...set];
    cur.advancedMeta[roundKey] = { by: playerName || "someone", at: new Date().toISOString() };
    await sSet(K_RESULTS, cur); setResults({ ...emptyResults(), ...cur });
  }
  async function handleReset() {
    if (!confirmReset) { setConfirmReset(true); setTimeout(() => setConfirmReset(false), 4000); return; }
    setConfirmReset(false);
    const pkeys = await sList(NS + "player:"); for (const k of pkeys) await sDelete(k);
    await sDelete(K_PLAYERS); await sDelete(K_RESULTS);
    setPicks(emptyPicks()); setLocked(false); setPlayerId(null); setPlayerName(""); setNameInput("");
    setResults(emptyResults()); setPlayers({}); setStandRows([]); flash("Sandbox reset.");
  }

  useEffect(() => { (async () => {
    if (tab !== "analysis") return;
    const saved = await sGet(K_ANALYSIS);
    setAnalysisPosts(saved || []);
  })(); }, [tab]);

  useEffect(() => { (async () => {
    if (tab !== "league") return;
    const ids = await sList(NS + "player:"); const out = [];
    for (const key of ids) { const data = await sGet(key); if (!data) continue; out.push({ id: key, name: data.name || key, picks: data.picks || emptyPicks(), locked: !!data.locked }); }
    setLeagueEntries(out);
  })(); }, [tab, results]);

  useEffect(() => { (async () => {
    if (tab !== "standings") return;
    const ids = await sList(NS + "player:"); const rows = [];
    for (const key of ids) { const data = await sGet(key); if (!data) continue;
      const sc = scorePlayer(data.picks || emptyPicks(), results);
      rows.push({ id: key, name: data.name || key, total: sc.total, breakdown: sc.breakdown, locked: !!data.locked }); }
    rows.sort((a, b) => b.total - a.total); setStandRows(rows);
  })(); }, [tab, results]);

  if (loading) return <Shell><div style={{ padding: 40, color: C.mute }}>Loading pool…</div></Shell>;

  return (
    <Shell>
      <Header tab={tab} setTab={setTab} pastDeadline={pastDeadline} deadline={deadline} now={now} feedStatus={feedStatus} feedAt={results.feedAt} onReset={handleReset} confirmReset={confirmReset} editingOpen={!!results.editingOpen} />
      {toast && <div style={{ position: "sticky", top: 0, zIndex: 5, background: C.ink, color: C.chalk, padding: "8px 14px", fontSize: 13, fontWeight: 600 }}>{toast}</div>}
      {tab === "play" && (!playerId
        ? <Join nameInput={nameInput} setNameInput={setNameInput} onJoin={joinAs} players={players} announcements={results.announcements || []} pastDeadline={pastDeadline} />
        : <PlayTab playerName={playerName} picks={picks} editable={editable} locked={locked} pastDeadline={pastDeadline} setScorePick={setScorePick} toggleAdvance={toggleAdvance} onSave={() => savePicks({ lock: false })} onLock={() => savePicks({ lock: true })} onUnlock={unlockPicks} onSwitch={() => { setPlayerId(null); setNameInput(""); }} />)}
      {tab === "tables" && <Tables qual={qual} />}
      {tab === "bracket" && <Bracket advanced={results.advanced} koScores={results.koScores} />}
      {tab === "standings" && <Standings rows={standRows} autoReady={qual.allComplete} />}
      {tab === "league" && <LeaguePicks entries={leagueEntries} revealed={results.revealed} />}
      {tab === "analysis" && <Analysis editions={analysisPosts} />}
      {tab === "updates" && <Updates announcements={results.announcements || []} onPost={postAnnouncement} onDelete={deleteAnnouncement} isCommissioner={!!playerId} />}
      {tab === "results" && (playerId
        ? <Results results={results} setScore={setScore} toggleResultAdvance={toggleResultAdvance} qual={qual} setManualOrder={setManualOrder} setManualThird={setManualThird} feedStatus={feedStatus} feedAt={results.feedAt} onToggleReveal={toggleReveal} confirmReveal={confirmReveal} setConfirmReveal={setConfirmReveal} onToggleEditing={toggleEditingOpen} />
        : <div style={{ padding: "30px 18px", color: C.mute }}>Enter your name on the My Picks tab first, so result edits are attributed to you.</div>)}
      <Footer />
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div style={{ minHeight: "100vh", background: C.paper, color: C.ink, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Anton&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@500&display=swap');
        * { box-sizing: border-box; } button:focus-visible { outline: 3px solid ${C.sun}; outline-offset: 2px; }
        input[type=number]::-webkit-inner-spin-button{ -webkit-appearance: none; margin: 0; } input[type=number]{ -moz-appearance: textfield; }
        @media (prefers-reduced-motion: reduce){ *{transition:none!important} }`}</style>
      <div style={{ maxWidth: 720, margin: "0 auto", paddingBottom: 60 }}>{children}</div>
    </div>
  );
}

function Header({ tab, setTab, pastDeadline, deadline, now, feedStatus, feedAt, onReset, confirmReset, editingOpen }) {
  const days = Math.max(0, Math.ceil((deadline - now) / 86400000));
  const tabs = [["play", "My Picks"], ["tables", "Groups"], ["bracket", "Bracket"], ["standings", "Standings"], ["league", "League"], ["analysis", "Analysis"], ["updates", "Updates"], ["results", "Results"]];
  return (
    <div style={{ background: C.ink, color: C.chalk, padding: "22px 14px 12px" }}>
      {SANDBOX && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.red, color: C.chalk, margin: "-22px -14px 14px", padding: "8px 14px", fontSize: 12, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase" }}>
          <span>● Sandbox · test data only</span>
          <button onClick={onReset} style={{ background: C.chalk, color: C.red, border: "none", borderRadius: 2, padding: "5px 10px", fontWeight: 800, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>{confirmReset ? "TAP AGAIN" : "RESET"}</button>
        </div>
      )}
      <Eyebrow><span style={{ color: C.sun }}>FIFA World Cup 2026 · Friends Pool</span></Eyebrow>
      <h1 style={{ fontFamily: "Anton, sans-serif", fontWeight: 400, fontSize: 42, lineHeight: .95, margin: "6px 0 2px" }}>PICK<span style={{ color: C.sun }}>'</span>EM</h1>
      <div style={{ fontSize: 12, color: "#C7D0DE", marginBottom: 4, fontFamily: "'DM Mono', monospace" }}>
        {pastDeadline ? (editingOpen ? "EDITING OPEN · update your picks now" : "PICKS LOCKED · tournament underway") : `Picks lock at the opener · ${days} day${days === 1 ? "" : "s"} left`}
      </div>
      <div style={{ fontSize: 10.5, color: feedStatus === "fail" ? "#E59B92" : "#9FE3BE", marginBottom: 12, fontFamily: "'DM Mono', monospace" }}>
        {feedStatus === "fail" ? "auto-feed offline · enter scores manually" : feedAt ? `auto-feed synced ${ago(feedAt)}` : "auto-feed connecting…"}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {tabs.map(([k, lbl]) => (
          <button key={k} onClick={() => setTab(k)} style={{ flex: "1 1 auto", minWidth: 74, background: tab === k ? C.paper : "rgba(255,255,255,0.06)", color: tab === k ? C.ink : "#C7D0DE", border: "none", borderRadius: 6, padding: "9px 8px", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>{lbl}</button>
        ))}
      </div>
    </div>
  );
}

function Footer() {
  return (
    <div style={{ padding: "26px 18px", color: C.mute, fontSize: 11.5, lineHeight: 1.6 }}>
      <strong>Scoring.</strong> Each correct group result (win/draw/loss) = 1 pt. For knockouts you name the teams you think reach each round; you score whenever a named team reaches it, however it got there. Per-team points rise on a Fibonacci scale: R32 2 · R16 3 · QF 5 · SF 8 · Final 13 · Champion 21.
      <br /><br />
      <strong>Standings & results.</strong> Enter the actual score of each group game in the Results tab. Group tables compute automatically by points, then goal difference, then goals scored. If teams are still dead-level, the app asks whoever's entering results to break the tie by hand. Once every group is done, the top two plus the best eight third-place teams fill the Round of 32 automatically.
    </div>
  );
}

function Join({ nameInput, setNameInput, onJoin, players, announcements, pastDeadline }) {
  const playerNames = Object.values(players || {});
  return (
    <div style={{ padding: "26px 18px" }}>
      {announcements && announcements.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <Eyebrow>Commissioner updates</Eyebrow>
          <div style={{ marginTop: 8 }}>
            {announcements.map((a, i) => (
              <div key={i} style={{ background: C.chalk, border: `1.5px solid ${C.sun}`, borderLeft: `4px solid ${C.sun}`, borderRadius: 3, padding: "10px 14px", marginBottom: 8 }}>
                <div style={{ fontSize: 13.5, lineHeight: 1.5, color: C.ink, whiteSpace: "pre-wrap" }}>{a.text}</div>
                <div style={{ fontSize: 10.5, color: C.mute, marginTop: 6, fontFamily: "'DM Mono', monospace" }}>{a.by} · {ago(a.at)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pastDeadline ? (
        <>
          <h2 style={{ fontFamily: "Anton, sans-serif", fontWeight: 400, fontSize: 32, lineHeight: 1, margin: "8px 0 6px" }}>WELCOME BACK</h2>
          <p style={{ fontSize: 15, color: C.ink, margin: "0 0 18px", lineHeight: 1.5, fontWeight: 600 }}>👇 Tap your name below to get back into the game — view your picks, check standings, and follow the tournament.</p>
          {playerNames.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
                {playerNames.map((name) => (
                  <button key={name} onClick={() => onJoin(name)} style={{ background: C.ink, border: `1.5px solid ${C.ink}`, color: C.chalk, borderRadius: 3, padding: "14px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>{name}</button>
                ))}
              </div>
            </div>
          )}
          <div style={{ background: "#FBF1DA", border: `1.5px solid ${C.sun}`, borderRadius: 4, padding: "14px 16px", marginBottom: 20, lineHeight: 1.6, fontSize: 13, color: C.ink }}>
            This is on the <strong>honor system</strong> — there are no passwords. Please only tap your own name. If you tap someone else's name you'll be able to see and edit their picks.
          </div>
        </>
      ) : (
        <>
          <Eyebrow>Enter the pool</Eyebrow>
          <div style={{ display: "flex", gap: 8, margin: "16px 0" }}>
            <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onJoin(nameInput)} placeholder="Your name" style={{ flex: 1, padding: "12px", border: `1.5px solid ${C.ink}`, borderRadius: 2, fontSize: 15, fontFamily: "inherit" }} />
            <button onClick={() => onJoin(nameInput)} style={{ background: C.ink, color: C.chalk, border: "none", borderRadius: 2, padding: "0 18px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Start</button>
          </div>
          <div style={{ background: "#FBF1DA", border: `1.5px solid ${C.sun}`, borderRadius: 4, padding: "14px 16px", marginBottom: 20, lineHeight: 1.6 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>How this works</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: C.ink }}>
              <li><strong>New player?</strong> Type any name and hit Start.</li>
              <li><strong>Returning?</strong> Type the <strong>exact same name</strong> you used before to get back to your picks.</li>
              <li>This is on the <strong>honor system</strong> — there are no passwords. Please only type your own name. If you type someone else's name you'll be able to see and edit their picks.</li>
            </ul>
          </div>
          {playerNames.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Players in the pool ({playerNames.length})</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 6 }}>
                {playerNames.map((name) => (
                  <div key={name} style={{ background: C.chalk, border: `1px solid ${C.line}`, borderRadius: 3, padding: "8px 12px", fontSize: 13, fontWeight: 600 }}>{name}</div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div style={{ background: C.ink, color: C.chalk, borderRadius: 4, padding: "16px 18px", marginBottom: 8 }}>
        <div style={{ fontFamily: "Anton, sans-serif", fontSize: 20, marginBottom: 10 }}>SCORING</div>
        <div style={{ fontSize: 13, lineHeight: 1.7, marginBottom: 12 }}>
          <strong style={{ color: C.sun }}>Group stage — predict every match result</strong><br />
          For each of the 72 group games, enter the score you think will happen. You earn <strong>1 point</strong> for each game where you correctly predict the outcome (win, draw, or loss) — the exact score doesn't matter, just who wins.
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.7, marginBottom: 12 }}>
          <strong style={{ color: C.sun }}>Knockouts — pick who advances</strong><br />
          Your group scores automatically determine your Round of 32. From there, pick which teams you think reach each round. You score points for every team that actually makes it.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px", fontSize: 13, fontFamily: "'DM Mono', monospace", marginTop: 8 }}>
          <div>Round of 32</div><div style={{ color: C.sun, fontWeight: 700 }}>2 pts / team</div>
          <div>Round of 16</div><div style={{ color: C.sun, fontWeight: 700 }}>3 pts / team</div>
          <div>Quarterfinals</div><div style={{ color: C.sun, fontWeight: 700 }}>5 pts / team</div>
          <div>Semifinals</div><div style={{ color: C.sun, fontWeight: 700 }}>8 pts / team</div>
          <div>Final</div><div style={{ color: C.sun, fontWeight: 700 }}>13 pts / team</div>
          <div>Champion</div><div style={{ color: C.sun, fontWeight: 700 }}>21 pts</div>
        </div>
        <div style={{ fontSize: 11.5, color: "#9FAFC0", marginTop: 10 }}>Points follow a Fibonacci scale — later rounds are worth much more, so a bold deep-run pick can vault you up the standings.</div>
      </div>
    </div>
  );
}

function SegBtn({ on, onClick, children }) {
  return <button onClick={onClick} style={{ flex: 1, background: on ? C.ink : "transparent", color: on ? C.chalk : C.ink, border: `1.5px solid ${C.ink}`, borderRadius: 2, padding: "10px 8px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>{children}</button>;
}
function Count({ children }) { return <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, opacity: .8, marginLeft: 6 }}>{children}</span>; }

function PlayTab({ playerName, picks, editable, locked, pastDeadline, setScorePick, toggleAdvance, onSave, onLock, onUnlock, onSwitch }) {
  const [section, setSection] = useState("group");
  const [confirmLock, setConfirmLock] = useState(false);
  const myR32info = playerR32(picks);
  const groupDone = MATCHES.filter((m) => (picks.scores || {})[m.m] && (picks.scores || {})[m.m].hg != null).length;
  return (
    <div style={{ padding: "18px 14px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>Playing as {playerName}</div>
        <button onClick={onSwitch} style={{ background: "none", border: "none", color: C.mute, fontSize: 12, textDecoration: "underline", cursor: "pointer", fontFamily: "inherit" }}>switch</button>
      </div>
      {!editable && (
        <div style={{ background: C.ink, color: C.chalk, padding: "10px 12px", borderRadius: 3, fontSize: 13, margin: "8px 0 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <span>{locked ? "Your picks are locked in." : "The deadline has passed — picks are read-only."}{locked && " Tap Unlock to edit."}</span>
          {locked && <button onClick={onUnlock} style={{ background: C.sun, color: C.ink, border: "none", borderRadius: 2, padding: "7px 12px", fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>Unlock</button>}
        </div>
      )}
      {editable && pastDeadline && (
        <div style={{ background: C.pitch, color: C.chalk, padding: "10px 12px", borderRadius: 3, fontSize: 13, margin: "8px 0 14px" }}>
          Editing is temporarily open — update your picks now. Don't forget to Save when you're done.
        </div>
      )}
      <div style={{ display: "flex", gap: 8, margin: "8px 0 16px" }}>
        <SegBtn on={section === "group"} onClick={() => setSection("group")}>Group stage <Count>{groupDone}/72</Count></SegBtn>
        <SegBtn on={section === "knockout"} onClick={() => setSection("knockout")}>Knockouts</SegBtn>
      </div>
      {section === "group" ? <GroupPicks picks={picks} editable={editable} setScorePick={setScorePick} myR32info={myR32info} /> : <KnockoutPicks picks={picks} editable={editable} toggleAdvance={toggleAdvance} myR32info={myR32info} />}
      {editable ? (
        <div style={{ position: "sticky", bottom: 0, background: C.paper, borderTop: `1px solid ${C.line}`, padding: "12px 4px", display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
          <button onClick={onSave} style={{ flex: 1, background: "transparent", color: C.ink, border: `1.5px solid ${C.ink}`, borderRadius: 2, padding: "12px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", minWidth: 120 }}>Save progress</button>
          {section === "group" && <button onClick={() => { onSave(); setSection("knockout"); }} style={{ flex: 1, background: C.ink, color: C.chalk, border: "none", borderRadius: 2, padding: "12px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", minWidth: 120 }}>Save & go to Knockouts</button>}
          <button onClick={() => { if (confirmLock) { onLock(); setConfirmLock(false); } else { setConfirmLock(true); setTimeout(() => setConfirmLock(false), 4000); } }} style={{ flex: 1, background: confirmLock ? C.red : C.pitch, color: C.chalk, border: "none", borderRadius: 2, padding: "12px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", minWidth: 120 }}>{confirmLock ? "Tap again to confirm" : "Lock in picks"}</button>
        </div>
      ) : (locked && !pastDeadline) ? (
        <div style={{ position: "sticky", bottom: 0, background: C.paper, borderTop: `1px solid ${C.line}`, padding: "12px 4px", display: "flex", gap: 10, marginTop: 18 }}>
          <button onClick={onUnlock} style={{ flex: 1, background: C.sun, color: C.ink, border: "none", borderRadius: 2, padding: "12px", fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Unlock picks</button>
        </div>
      ) : null}
    </div>
  );
}

function GroupPicks({ picks, editable, setScorePick, myR32info }) {
  const scores = picks.scores || {};
  return (
    <div>
      <p style={{ fontSize: 13, color: C.mute, lineHeight: 1.5, marginTop: 0 }}>Enter your projected score for every game. Your group tables and your Round of 32 are calculated from these scores automatically.</p>
      {Object.keys(GROUPS).map((g) => {
        const tbl = myR32info.tables ? myR32info.tables[g] : null;
        return (
          <div key={g} style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 8px" }}>
              <span style={{ fontFamily: "Anton, sans-serif", fontSize: 22 }}>GROUP {g}</span>
              <span style={{ fontSize: 11, color: C.mute }}>{GROUPS[g].join(" · ")}</span>
            </div>
            {MATCHES.filter((m) => m.g === g).map((mm) => {
              const sc = scores[mm.m] || { hg: null, ag: null };
              return (
                <div key={mm.m} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${C.line}` }}>
                  <div style={{ fontSize: 13.5 }}><span style={{ fontFamily: "'DM Mono', monospace", color: C.mute, fontSize: 11, marginRight: 6 }}>{mm.d}</span><strong>{mm.h}</strong> <span style={{ color: C.mute }}>v</span> <strong>{mm.a}</strong></div>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <ScoreBox value={sc.hg} disabled={!editable} onChange={(v) => setScorePick(mm.m, v, sc.ag == null ? (v == null ? null : 0) : sc.ag)} />
                    <span style={{ color: C.mute }}>{"–"}</span>
                    <ScoreBox value={sc.ag} disabled={!editable} onChange={(v) => setScorePick(mm.m, sc.hg == null ? (v == null ? null : 0) : sc.hg, v)} />
                  </div>
                </div>
              );
            })}
            {tbl && (
              <div style={{ marginTop: 8, fontSize: 11.5, fontFamily: "'DM Mono', monospace", color: C.mute }}>
                Your table: {tbl.table.map((r, i) => `${i + 1}.${abbr(r.team)}(${r.pts})`).join("  ")}
                {tbl.unresolved.length > 0 && <span style={{ color: C.red }}> · tie to break in Results</span>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function KnockoutPicks({ picks, editable, toggleAdvance, myR32info }) {
  const poolFor = (key) => {
    if (key === "r16") return myR32info.complete ? myR32info.r32 : [];
    const order = { qf: "r16", sf: "qf", final: "sf", champ: "final" };
    return picks.advanced[order[key]] || [];
  };
  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
          <span style={{ fontFamily: "Anton, sans-serif", fontSize: 20 }}>ROUND OF 32</span>
          <span style={{ fontSize: 11.5, color: C.mute, fontFamily: "'DM Mono', monospace" }}>auto from your scores · 2 pts each</span>
        </div>
        {myR32info.complete ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {myR32info.r32.map((t) => (
              <span key={t} style={{ border: `1.5px solid ${C.pitch}`, background: C.pitch, color: C.chalk, padding: "6px 9px", borderRadius: 2, fontSize: 12, fontWeight: 600 }}>{t}</span>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 12.5, color: C.red, background: "#FBEAE7", border: `1px solid ${C.line}`, borderRadius: 3, padding: "10px 12px" }}>
            Enter all 72 group scores first — your Round of 32 fills in automatically once every group is complete.
            {myR32info.pendingTies && myR32info.pendingTies.length > 0 && " (Some groups are tied — break them in the Results tab.)"}
          </div>
        )}
      </div>
      <p style={{ fontSize: 13, color: C.mute, lineHeight: 1.5 }}>For each round below, tap the teams you think will advance. You must fill every slot — leaving picks empty means leaving points on the table.</p>
      {ROUNDS.filter((r) => r.key !== "r32").map((r) => {
        const chosen = new Set(picks.advanced[r.key] || []);
        const pool = poolFor(r.key);
        const prevLabel = { r16: "your Round of 32", qf: "your Round of 16", sf: "your Quarterfinalists", final: "your Semifinalists", champ: "your Finalists" }[r.key];
        const instruction = {
          r16: `Pick ${r.count} teams you think will win their R32 match and advance to the Round of 16`,
          qf: `Pick ${r.count} teams you think will reach the Quarterfinals`,
          sf: `Pick ${r.count} teams you think will reach the Semifinals`,
          final: `Pick ${r.count} teams you think will play in the Final`,
          champ: `Pick your World Cup winner`,
        }[r.key];
        return (
          <div key={r.key} style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
              <span style={{ fontFamily: "Anton, sans-serif", fontSize: 20 }}>{r.label.toUpperCase()}</span>
              <span style={{ fontSize: 11.5, color: C.mute, fontFamily: "'DM Mono', monospace" }}>{chosen.size}/{r.count} picked · {r.pts} pts each</span>
            </div>
            <div style={{ fontSize: 12, color: chosen.size < r.count && pool.length > 0 ? C.red : C.mute, marginBottom: 6, fontWeight: chosen.size < r.count && pool.length > 0 ? 600 : 400 }}>
              {instruction}{chosen.size < r.count && pool.length > 0 ? ` — ${r.count - chosen.size} more needed` : chosen.size === r.count ? " ✓" : ""}
            </div>
            {pool.length === 0 ? (
              <div style={{ fontSize: 12.5, color: C.mute, background: "#F0EBDD", border: `1px solid ${C.line}`, borderRadius: 3, padding: "10px 12px" }}>
                Pick {prevLabel} first — those teams become your options here.
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {pool.map((t) => { const on = chosen.has(t); const full = chosen.size >= r.count && !on;
                  return <button key={t} disabled={!editable || full} onClick={editable ? () => toggleAdvance(r.key, t, r.count) : undefined} style={{ border: `1.5px solid ${on ? C.pitch : C.line}`, background: on ? C.pitch : C.chalk, color: on ? C.chalk : (full ? "#B5AE9E" : C.ink), padding: "6px 9px", borderRadius: 2, fontSize: 12, fontWeight: 600, cursor: editable && !full ? "pointer" : "default", fontFamily: "inherit" }}>{t}</button>;
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Tables({ qual }) {
  return (
    <div style={{ padding: "18px 14px" }}>
      <Eyebrow>Group tables</Eyebrow>
      <p style={{ fontSize: 12, color: C.mute, marginTop: 8, lineHeight: 1.5 }}>Computed from entered scores: points → goal difference → goals scored. Green = top 2 (through). Amber = third place (best 8 advance).</p>
      {Object.keys(GROUPS).map((g) => {
        const r = qual.tables[g];
        return (
          <div key={g} style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: "Anton, sans-serif", fontSize: 20, marginBottom: 4 }}>GROUP {g}{!r.complete && <span style={{ fontSize: 11, color: C.mute, fontFamily: "'DM Sans'", marginLeft: 8 }}>in progress</span>}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 28px 28px 28px 28px 34px 30px", gap: 2, fontSize: 12, fontFamily: "'DM Mono', monospace" }}>
              <div style={{ color: C.mute }}>Team</div><div style={{ color: C.mute, textAlign: "center" }}>P</div><div style={{ color: C.mute, textAlign: "center" }}>W</div><div style={{ color: C.mute, textAlign: "center" }}>D</div><div style={{ color: C.mute, textAlign: "center" }}>L</div><div style={{ color: C.mute, textAlign: "center" }}>GD</div><div style={{ color: C.mute, textAlign: "center" }}>Pt</div>
              {r.table.map((row, i) => {
                const bg = i < 2 ? "#E4F0E8" : i === 2 ? "#FBF1DA" : "transparent";
                return (
                  <React.Fragment key={row.team}>
                    <div style={{ background: bg, padding: "4px 6px", fontWeight: 600 }}>{i + 1}. {row.team}</div>
                    <div style={{ background: bg, textAlign: "center" }}>{row.pld}</div>
                    <div style={{ background: bg, textAlign: "center" }}>{row.w}</div>
                    <div style={{ background: bg, textAlign: "center" }}>{row.d}</div>
                    <div style={{ background: bg, textAlign: "center" }}>{row.l}</div>
                    <div style={{ background: bg, textAlign: "center" }}>{row.gd > 0 ? "+" : ""}{row.gd}</div>
                    <div style={{ background: bg, textAlign: "center", fontWeight: 700 }}>{row.pts}</div>
                  </React.Fragment>
                );
              })}
            </div>
            {r.unresolved.length > 0 && <div style={{ fontSize: 11, color: C.red, marginTop: 6 }}>⚠ Tie needs manual resolution in Results: {r.unresolved.map((x) => x.join(" / ")).join("; ")}</div>}
          </div>
        );
      })}
      {qual.allComplete && (
        <div style={{ marginTop: 8, padding: 12, background: C.ink, color: C.chalk, borderRadius: 3 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Best third-place teams advancing (8 of 12)</div>
          <div style={{ fontSize: 12.5, lineHeight: 1.6 }}>{qual.best8.join(" · ")}</div>
        </div>
      )}
    </div>
  );
}

function Bracket({ advanced, koScores }) {
  const adv = advanced || {};
  const ko = koScores || {};
  const cache = {};
  function sides(num) {
    if (cache[num]) return cache[num];
    const m = KO_BY_NUM[num]; const ks = ko[num];
    let res;
    if (m.r === "r32") res = { a: { team: m.a, seed: m.as }, b: { team: m.b, seed: m.bs } };
    else if (m.r === "third") res = { a: { team: (ks && ks.a) || loserOf(m.l1), ph: "Loser M" + m.l1 }, b: { team: (ks && ks.b) || loserOf(m.l2), ph: "Loser M" + m.l2 } };
    else res = { a: { team: (ks && ks.a) || winnerOf(m.f1), ph: "Winner M" + m.f1 }, b: { team: (ks && ks.b) || winnerOf(m.f2), ph: "Winner M" + m.f2 } };
    cache[num] = res; return res;
  }
  function winnerOf(num) {
    const ks = ko[num]; if (ks && ks.winner) return ks.winner;
    const m = KO_BY_NUM[num]; const s = sides(num);
    const list = adv[KO_NEXT[m.r]] || [];
    if (s.a.team && list.includes(s.a.team)) return s.a.team;
    if (s.b.team && list.includes(s.b.team)) return s.b.team;
    return null;
  }
  function loserOf(num) {
    const s = sides(num); const w = winnerOf(num);
    if (!w) return null;
    return w === s.a.team ? s.b.team : w === s.b.team ? s.a.team : null;
  }
  function teamGoals(ks, team) {
    if (!ks) return null;
    const base = ks.et || ks.ft; if (!base) return null;
    if (ks.a === team) return base[0];
    if (ks.b === team) return base[1];
    return null;
  }
  function teamPens(ks, team) {
    if (!ks || !ks.pen) return null;
    if (ks.a === team) return ks.pen[0];
    if (ks.b === team) return ks.pen[1];
    return null;
  }
  const champ = (adv.champ || [])[0] || null;

  const COLS = [
    { key: "r32", label: "Round of 32", nums: [74, 77, 73, 75, 83, 84, 81, 82, 76, 78, 79, 80, 86, 88, 85, 87] },
    { key: "r16", label: "Round of 16", nums: [89, 90, 93, 94, 91, 92, 95, 96] },
    { key: "qf", label: "Quarterfinals", nums: [97, 98, 99, 100] },
    { key: "sf", label: "Semifinals", nums: [101, 102] },
    { key: "final", label: "Final", nums: [104] },
  ];
  const roundColor = { r32: C.mute, r16: C.ink, qf: C.sun, sf: C.pitch, final: C.red };

  function TeamRow({ side, winner, isR32, goals, pens }) {
    const known = !!side.team;
    const isWinner = winner && side.team === winner;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 7px", background: isWinner ? "#E4F0E8" : "transparent", borderRadius: 3 }}>
        {isR32 && <span style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", color: C.chalk, background: C.ink, borderRadius: 2, padding: "1px 4px", flexShrink: 0 }}>{side.seed}</span>}
        <span style={{ flex: 1, fontSize: 12.5, fontWeight: isWinner ? 700 : known ? 600 : 400, color: known ? C.ink : C.mute, fontStyle: known ? "normal" : "italic", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {known ? side.team : side.ph}
        </span>
        {goals != null && <span style={{ fontSize: 12.5, fontFamily: "'DM Mono', monospace", fontWeight: isWinner ? 700 : 600, color: C.ink, flexShrink: 0 }}>{goals}{pens != null ? ` (${pens})` : ""}</span>}
      </div>
    );
  }
  function MatchCard({ num }) {
    const m = KO_BY_NUM[num]; const s = sides(num); const ks = ko[num];
    const w = winnerOf(num);
    const isR32 = m.r === "r32";
    const decided = ks && (ks.pen || (ks.et && ks.ft && (ks.et[0] !== ks.ft[0] || ks.et[1] !== ks.ft[1])));
    return (
      <div style={{ background: C.chalk, border: `1px solid ${C.line}`, borderLeft: `3px solid ${roundColor[m.r] || C.mute}`, borderRadius: 5, padding: "5px 6px", width: 168, flexShrink: 0 }}>
        <div style={{ fontSize: 9.5, color: C.mute, fontFamily: "'DM Mono', monospace", marginBottom: 3, lineHeight: 1.3 }}>
          M{m.n} · {m.et}<br />{m.v}
        </div>
        <TeamRow side={s.a} winner={w} isR32={isR32} goals={teamGoals(ks, s.a.team)} pens={teamPens(ks, s.a.team)} />
        <div style={{ height: 1, background: C.line, margin: "1px 0" }} />
        <TeamRow side={s.b} winner={w} isR32={isR32} goals={teamGoals(ks, s.b.team)} pens={teamPens(ks, s.b.team)} />
        {decided && <div style={{ fontSize: 9, color: C.mute, fontFamily: "'DM Mono', monospace", marginTop: 2, textAlign: "right" }}>{ks.pen ? "won on penalties" : "after extra time"}</div>}
      </div>
    );
  }

  return (
    <div style={{ padding: "18px 14px" }}>
      <Eyebrow>Knockout bracket</Eyebrow>
      <p style={{ fontSize: 12, color: C.mute, marginTop: 8, lineHeight: 1.5 }}>
        The Round of 32 is locked from the final group tables — seeds show each team's group finish (e.g. <b>1E</b> = Group E winner, <b>3D</b> = Group D third place). Later rounds fill in as results are entered. All times US Eastern. Scroll right to follow the path to the Final →
      </p>
      {champ && (
        <div style={{ margin: "12px 0", padding: 12, background: C.ink, color: C.chalk, borderRadius: 5, textAlign: "center" }}>
          <div style={{ fontSize: 11, letterSpacing: ".15em", color: C.sun, fontWeight: 700 }}>CHAMPION</div>
          <div style={{ fontFamily: "Anton, sans-serif", fontSize: 26 }}>{champ}</div>
        </div>
      )}
      <div style={{ overflowX: "auto", paddingBottom: 12, WebkitOverflowScrolling: "touch" }}>
        <div style={{ display: "flex", gap: 14, alignItems: "stretch", minWidth: "min-content" }}>
          {COLS.map((col) => (
            <div key={col.key} style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontFamily: "Anton, sans-serif", fontSize: 13, color: roundColor[col.key], textAlign: "center", marginBottom: 8, height: 18 }}>{col.label.toUpperCase()}</div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-around", gap: 8 }}>
                {col.nums.map((n) => <MatchCard key={n} num={n} />)}
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Third-place playoff */}
      <div style={{ marginTop: 16 }}>
        <div style={{ fontFamily: "Anton, sans-serif", fontSize: 13, color: C.mute, marginBottom: 6 }}>THIRD-PLACE PLAYOFF</div>
        <MatchCard num={103} />
      </div>
    </div>
  );
}

function Standings({ rows, autoReady }) {
  if (!rows.length) return <div style={{ padding: "30px 18px", color: C.mute }}>No entries yet. Standings appear once players make picks and scores are entered.</div>;
  const max = rows[0]?.total || 1;
  return (
    <div style={{ padding: "18px 14px" }}>
      <Eyebrow>Live standings</Eyebrow>
      {!autoReady && <div style={{ fontSize: 11.5, color: C.mute, margin: "8px 0", lineHeight: 1.5 }}>Round-of-32 points activate automatically once every group game has a score entered.</div>}
      <div style={{ marginTop: 12 }}>
        {rows.map((r, i) => (
          <div key={r.id} style={{ display: "grid", gridTemplateColumns: "28px 1fr auto", gap: 10, alignItems: "center", padding: "11px 0", borderBottom: `1px solid ${C.line}` }}>
            <div style={{ fontFamily: "Anton, sans-serif", fontSize: 22, color: i === 0 ? C.sun : C.ink }}>{i + 1}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{r.name}{!r.locked && <span style={{ color: C.red, fontSize: 11, marginLeft: 6 }}>· not locked</span>}</div>
              <div style={{ height: 6, background: C.line, borderRadius: 3, marginTop: 5, overflow: "hidden" }}><div style={{ width: `${(r.total / max) * 100}%`, height: "100%", background: i === 0 ? C.sun : C.pitch }} /></div>
              <div style={{ fontSize: 10.5, color: C.mute, marginTop: 4, fontFamily: "'DM Mono', monospace" }}>grp {r.breakdown.group} · r32 {r.breakdown.r32} · r16 {r.breakdown.r16} · qf {r.breakdown.qf} · sf {r.breakdown.sf} · F {r.breakdown.final} · 🏆 {r.breakdown.champ}</div>
            </div>
            <div style={{ fontFamily: "Anton, sans-serif", fontSize: 26 }}>{r.total}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LeaguePicks({ entries, revealed }) {
  const [open, setOpen] = useState(null);
  if (!revealed) {
    return (
      <div style={{ padding: "30px 18px", color: C.mute }}>
        <div style={{ fontFamily: "Anton, sans-serif", fontSize: 22, color: C.ink, marginBottom: 8 }}>PICKS ARE SECRET</div>
        <p style={{ fontSize: 13.5, lineHeight: 1.5 }}>Everyone's brackets stay hidden until the commissioner reveals them in the Results tab. Check back after the reveal to see how the league picked.</p>
      </div>
    );
  }
  if (!entries.length) return <div style={{ padding: "30px 18px", color: C.mute }}>No entries yet.</div>;
  return (
    <div style={{ padding: "18px 14px" }}>
      <Eyebrow>Everyone's picks</Eyebrow>
      <p style={{ fontSize: 12, color: C.mute, margin: "8px 0 14px" }}>Tap a player to see their projected group scores and bracket.</p>
      {entries.map((e) => (
        <div key={e.id} style={{ borderBottom: `1px solid ${C.line}`, padding: "10px 0" }}>
          <button onClick={() => setOpen(open === e.id ? null : e.id)} style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>{e.name}</span>
            <span style={{ color: C.mute, fontSize: 12 }}>{open === e.id ? "hide" : "view"}</span>
          </button>
          {open === e.id && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Champion: {(e.picks.advanced.champ || [])[0] || "—"}</div>
              <div style={{ marginBottom: 10 }}>
                {[["Finalists","final"],["Semifinalists","sf"],["Quarterfinalists","qf"],["Round of 16","r16"]].map(([lbl,key]) => (
                  <div key={key} style={{ fontSize: 11.5, color: C.ink, margin: "4px 0", lineHeight: 1.5 }}>
                    <span style={{ color: C.mute, fontWeight: 700 }}>{lbl}: </span>{(e.picks.advanced[key] || []).join(", ") || "—"}
                  </div>
                ))}
                <div style={{ fontSize: 11.5, color: C.ink, margin: "4px 0", lineHeight: 1.5 }}>
                  <span style={{ color: C.mute, fontWeight: 700 }}>Round of 32 (from their scores): </span>{(playerR32(e.picks).r32 || []).join(", ") || "complete all 72 scores"}
                </div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.mute, marginBottom: 4 }}>PROJECTED GROUP SCORES</div>
              <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: C.mute }}>
                {Object.keys(GROUPS).map((g) => {
                  const ms = MATCHES.filter((m) => m.g === g).map((mm) => { const sc = (e.picks.scores || {})[mm.m]; return sc && sc.hg != null ? `${abbr(mm.h)} ${sc.hg}-${sc.ag} ${abbr(mm.a)}` : null; }).filter(Boolean);
                  return <div key={g} style={{ marginBottom: 3 }}><strong>{g}:</strong> {ms.join("  ") || "—"}</div>;
                })}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ScoreBox({ value, onChange, disabled }) {
  return <input type="number" min="0" inputMode="numeric" value={value == null ? "" : value} disabled={disabled}
    onChange={(e) => { const v = e.target.value; onChange(v === "" ? null : Math.max(0, parseInt(v, 10) || 0)); }}
    style={{ width: 42, padding: "8px 4px", textAlign: "center", border: `1.5px solid ${C.ink}`, borderRadius: 2, fontSize: 16, fontFamily: "'DM Mono', monospace" }} />;
}

function Results({ results, setScore, toggleResultAdvance, qual, setManualOrder, setManualThird, feedStatus, feedAt, onToggleReveal, confirmReveal, setConfirmReveal, onToggleEditing }) {
  const [view, setView] = useState("scores");
  const done = Object.keys(results.scores).filter((k) => results.scores[k] && results.scores[k].hg != null).length;
  const [draft, setDraft] = useState({});

  function commit(m) {
    const d = draft[m]; if (!d) return;
    if (d.hg == null && d.ag == null) setScore(m, null, null);
    else if (d.hg != null && d.ag != null) setScore(m, d.hg, d.ag);
  }

  return (
    <div style={{ padding: "18px 14px" }}>
      <div style={{ background: feedStatus === "fail" ? "#FBEAE7" : "#EAF4EE", border: `1px solid ${C.line}`, borderRadius: 3, padding: "10px 12px", fontSize: 12.5, color: C.ink, marginBottom: 14, lineHeight: 1.5 }}>
        {feedStatus === "fail" ? "Auto-feed offline. Enter scores below — your entries always take effect." : `Auto-feed synced ${ago(feedAt)}. It fills scores within ~a day; enter the real score here anytime to update instantly.`}
      </div>
      {(results.revealed || results.editingOpen) && (
        <div style={{ fontSize: 11, color: C.mute, marginBottom: 12, fontFamily: "'DM Mono', monospace" }}>
          {results.revealed ? "picks visible" : ""}{results.revealed && results.editingOpen ? " · " : ""}{results.editingOpen ? "editing open" : ""}
        </div>
      )}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        <SegBtn on={view === "scores"} onClick={() => setView("scores")}>Scores <Count>{done}/72</Count></SegBtn>
        <SegBtn on={view === "ties"} onClick={() => setView("ties")}>Ties</SegBtn>
        <SegBtn on={view === "advance"} onClick={() => setView("advance")}>Knockouts</SegBtn>
      </div>

      {view === "scores" && (
        <div>
          {Object.keys(GROUPS).map((g) => (
            <div key={g} style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: "Anton, sans-serif", fontSize: 18, marginBottom: 4 }}>GROUP {g}</div>
              {MATCHES.filter((m) => m.g === g).map((mm) => {
                const s = results.scores[mm.m];
                const d = draft[mm.m] || (s ? { hg: s.hg, ag: s.ag } : { hg: null, ag: null });
                return (
                  <div key={mm.m} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.line}` }}>
                    <div style={{ fontSize: 13 }}>
                      <span style={{ fontFamily: "'DM Mono', monospace", color: C.mute, fontSize: 11, marginRight: 6 }}>{mm.d}</span><strong>{mm.h}</strong> v <strong>{mm.a}</strong>
                      {s && s.hg != null && <div style={{ fontSize: 10, color: C.mute, fontFamily: "'DM Mono', monospace", marginTop: 2 }}>{s.hg}–{s.ag} · {s.by === "openfootball" ? "auto" : `by ${s.by}`} {ago(s.at)}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <ScoreBox value={d.hg} onChange={(v) => setDraft((p) => ({ ...p, [mm.m]: { ...d, hg: v } }))} />
                      <span style={{ color: C.mute }}>–</span>
                      <ScoreBox value={d.ag} onChange={(v) => setDraft((p) => ({ ...p, [mm.m]: { ...d, ag: v } }))} />
                      {(() => { const canSave = (d.hg != null && d.ag != null); const canClear = (d.hg == null && d.ag == null && s && s.hg != null); return <>
                        <button onClick={() => commit(mm.m)} disabled={!canSave}
                          style={{ background: canSave ? C.pitch : C.line, color: C.chalk, border: "none", borderRadius: 2, padding: "8px 10px", fontWeight: 700, fontSize: 12, cursor: canSave ? "pointer" : "default", fontFamily: "inherit" }}>Save</button>
                        {canClear && <button onClick={() => { setScore(mm.m, null, null); setDraft((p) => { const n = { ...p }; delete n[mm.m]; return n; }); }}
                          style={{ background: C.red, color: C.chalk, border: "none", borderRadius: 2, padding: "8px 10px", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Clear</button>}
                      </>; })()}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {view === "ties" && (
        <div>
          <p style={{ fontSize: 12.5, color: C.mute, lineHeight: 1.5, marginTop: 0 }}>Teams dead-level on points, goal difference, and goals scored appear here. Tap teams in the order they should rank (1st tap = higher place).</p>
          {qual.pendingTies.length === 0 && qual.thirdTies.length === 0 && <div style={{ color: C.mute, fontSize: 13 }}>No unresolved ties. ✓</div>}
          {qual.pendingTies.map((pt) => pt.ties.map((grp, idx) => (
            <TieResolver key={pt.group + idx} label={`Group ${pt.group} tie`} teams={grp} current={(results.manualOrder[pt.group] || []).filter((t) => grp.includes(t))} onSet={(ordered) => setManualOrder(pt.group, ordered)} />
          )))}
          {qual.thirdTies.map((grp, idx) => (
            <TieResolver key={"third" + idx} label="Third-place cutoff tie (decides who's in the best 8)" teams={grp} current={(results.manualThird || []).filter((t) => grp.includes(t))} onSet={(ordered) => setManualThird(ordered)} />
          ))}
        </div>
      )}

      {view === "advance" && (
        <div>
          <div style={{ background: C.ink, color: C.chalk, borderRadius: 3, padding: "10px 12px", marginBottom: 14, fontSize: 11.5, fontFamily: "'DM Mono', monospace", lineHeight: 1.6 }}>
            <div style={{ fontFamily: "'DM Sans'", fontWeight: 700, fontSize: 12, marginBottom: 4 }}>Who advanced (actual)</div>
            <div>R32: {qual.allComplete ? qual.r32.map(abbr).join(" ") : "(complete all group scores)"}</div>
            <div>R16: {(results.advanced.r16 || []).map(abbr).join(" ") || "—"}</div>
            <div>QF: {(results.advanced.qf || []).map(abbr).join(" ") || "—"}</div>
            <div>SF: {(results.advanced.sf || []).map(abbr).join(" ") || "—"}</div>
            <div>Final: {(results.advanced.final || []).map(abbr).join(" ") || "—"} · Champ: {(results.advanced.champ || []).map(abbr).join(" ") || "—"}</div>
          </div>
          {(() => {
            const ks = results.koScores || {};
            const played = KNOCKOUT.filter((m) => ks[m.n]);
            if (!played.length) return null;
            return (
              <div style={{ border: `1px solid ${C.line}`, borderRadius: 3, padding: "10px 12px", marginBottom: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 6 }}>Knockout results (auto-fed)</div>
                {played.map((m) => { const k = ks[m.n]; const rt = koResultText(k); const wname = k.winner;
                  return (
                    <div key={m.n} style={{ fontSize: 11.5, fontFamily: "'DM Mono', monospace", lineHeight: 1.7 }}>
                      M{m.n} {k.a} {rt} {k.b} {wname && <span style={{ color: C.pitch, fontWeight: 700 }}>→ {wname}</span>}
                    </div>
                  );
                })}
              </div>
            );
          })()}
          <p style={{ fontSize: 12.5, color: C.mute, lineHeight: 1.5, marginTop: 0 }}>Round of 32 fills automatically from group scores once all groups are complete{qual.allComplete ? " — done ✓" : " (not yet)"}. Later rounds now auto-fill from the live feed (including extra time and penalties). You can still tap below to override a round manually — a manual edit takes precedence over the feed for that round.</p>
          {ROUNDS.filter((r) => r.key !== "r32").map((r) => {
            const chosen = new Set(results.advanced[r.key] || []); const meta = results.advancedMeta[r.key];
            // Only teams that advanced from the prior round are eligible for this one.
            const priorMap = {
              r16: qual.allComplete ? qual.r32 : [],
              qf: results.advanced.r16 || [],
              sf: results.advanced.qf || [],
              final: results.advanced.sf || [],
              champ: results.advanced.final || [],
            };
            const priorLabel = { r16: "Round of 32", qf: "Round of 16", sf: "Quarterfinals", final: "Semifinals", champ: "Final" }[r.key];
            const pool = [...new Set([...(priorMap[r.key] || []), ...(results.advanced[r.key] || [])])].sort();
            return (
              <div key={r.key} style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontFamily: "Anton, sans-serif", fontSize: 18 }}>{r.label.toUpperCase()}</span>
                  <span style={{ fontSize: 11, color: C.mute, fontFamily: "'DM Mono', monospace" }}>{chosen.size}/{r.count}{meta ? ` · ${meta.by} ${ago(meta.at)}` : ""}</span>
                </div>
                {pool.length === 0
                  ? <div style={{ fontSize: 12, color: C.mute, fontStyle: "italic" }}>Set the {priorLabel} first — only teams that reach it can be picked here.</div>
                  : <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {pool.map((t) => { const on = chosen.has(t); const full = chosen.size >= r.count && !on;
                        return <button key={t} disabled={full} onClick={() => toggleResultAdvance(r.key, t, r.count)} style={{ border: `1.5px solid ${on ? C.ink : C.line}`, background: on ? C.ink : C.chalk, color: on ? C.chalk : (full ? "#B5AE9E" : C.ink), padding: "5px 8px", borderRadius: 2, fontSize: 11.5, fontWeight: 600, cursor: full ? "default" : "pointer", fontFamily: "inherit" }}>{t}</button>;
                      })}
                    </div>}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 40, paddingTop: 16, borderTop: `1px solid ${C.line}` }}>
        <div style={{ fontSize: 10.5, color: C.mute, letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 700, marginBottom: 10 }}>Commissioner controls</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 11.5, color: C.mute }}>{results.revealed ? "Picks visible in League Picks tab." : "Picks hidden from players."}</span>
          <button onClick={() => { if (confirmReveal) { onToggleReveal(); setConfirmReveal(false); } else { setConfirmReveal(true); setTimeout(() => setConfirmReveal(false), 4000); } }} style={{ background: "transparent", color: C.mute, border: `1px solid ${C.line}`, borderRadius: 2, padding: "5px 10px", fontWeight: 600, fontSize: 11, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>{results.revealed ? (confirmReveal ? "Confirm hide" : "Hide picks") : (confirmReveal ? "Confirm reveal" : "Reveal picks")}</button>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11.5, color: C.mute }}>{results.editingOpen ? "Editing is open for all players." : "Picks locked (deadline passed)."}</span>
          <button onClick={onToggleEditing} style={{ background: "transparent", color: C.mute, border: `1px solid ${C.line}`, borderRadius: 2, padding: "5px 10px", fontWeight: 600, fontSize: 11, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>{results.editingOpen ? "Close editing" : "Open editing"}</button>
        </div>
      </div>
    </div>
  );
}

function Updates({ announcements, onPost, onDelete, isCommissioner }) {
  const [text, setText] = useState("");
  return (
    <div style={{ padding: "18px 14px" }}>
      <Eyebrow>Commissioner updates</Eyebrow>
      {isCommissioner && (
        <div style={{ margin: "14px 0 20px" }}>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Write an update for the league..." rows={3} style={{ width: "100%", padding: 12, border: `1.5px solid ${C.ink}`, borderRadius: 2, fontSize: 14, fontFamily: "inherit", resize: "vertical", marginBottom: 8 }} />
          <button onClick={() => { onPost(text); setText(""); }} disabled={!text.trim()} style={{ background: !text.trim() ? C.line : C.ink, color: C.chalk, border: "none", borderRadius: 2, padding: "10px 18px", fontWeight: 700, fontSize: 13, cursor: !text.trim() ? "default" : "pointer", fontFamily: "inherit" }}>Post update</button>
        </div>
      )}
      {!isCommissioner && <p style={{ fontSize: 13, color: C.mute, margin: "10px 0 16px" }}>Enter your name on the My Picks tab to post updates.</p>}
      {announcements.length === 0 ? (
        <div style={{ color: C.mute, fontSize: 13, marginTop: 16 }}>No updates yet.</div>
      ) : (
        <div style={{ marginTop: isCommissioner ? 0 : 8 }}>
          {announcements.map((a, i) => (
            <div key={i} style={{ background: C.chalk, border: `1px solid ${C.line}`, borderLeft: `4px solid ${C.sun}`, borderRadius: 3, padding: "10px 14px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div>
                <div style={{ fontSize: 13.5, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{a.text}</div>
                <div style={{ fontSize: 10.5, color: C.mute, marginTop: 4, fontFamily: "'DM Mono', monospace" }}>{a.by} · {ago(a.at)}</div>
              </div>
              {isCommissioner && <button onClick={() => onDelete(i)} style={{ background: "none", border: "none", color: C.red, fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, whiteSpace: "nowrap" }}>Remove</button>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Horizontal Bar Chart ---------- */
function HBar({ data, maxVal, barColor, height = 28, showPct = false, total = 0 }) {
  const max = maxVal || Math.max(...data.map((d) => d.value), 1);
  return (
    <div>
      {data.map((d, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
          <div style={{ width: 110, fontSize: 12.5, fontWeight: 600, textAlign: "right", paddingRight: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.label}</div>
          <div style={{ flex: 1, position: "relative", height }}>
            <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: `${Math.max(d.value / max * 100, 0)}%`, background: d.color || barColor || C.ink, borderRadius: 3, transition: "width .4s ease" }} />
            <div style={{ position: "absolute", top: 0, left: 0, height: "100%", display: "flex", alignItems: "center", paddingLeft: Math.max(d.value / max * 100, 0) > 30 ? 0 : 8, paddingRight: 8, width: "100%", justifyContent: Math.max(d.value / max * 100, 0) > 30 ? "flex-start" : "flex-start" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: Math.max(d.value / max * 100, 0) > 30 ? C.chalk : C.ink, marginLeft: Math.max(d.value / max * 100, 0) > 30 ? 8 : `calc(${Math.max(d.value / max * 100, 0)}% + 6px)`, position: "absolute" }}>
                {d.value}{showPct && total ? ` (${Math.round(100 * d.value / total)}%)` : ""}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Dot Matrix for match outcomes ---------- */
function DotRow({ label, outcomes, playerNames, total }) {
  const order = { H: 0, D: 1, A: 2 };
  const sorted = [...outcomes].sort((a, b) => order[a.outcome] - order[b.outcome]);
  const colors = { H: C.pitch, D: C.sun, A: C.red };
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{label}</div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {sorted.map((o, i) => (
          <div key={i} title={`${o.name}: ${o.score}`} style={{ width: 24, height: 24, borderRadius: 3, background: colors[o.outcome] || C.mute, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: C.chalk, cursor: "default" }}>
            {o.initials}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Analysis Blog Component ---------- */
function Analysis({ editions }) {
  const [expandedEditions, setExpandedEditions] = useState({});
  if (!editions || editions.length === 0) return <div style={{ padding: "30px 18px", color: C.mute }}>No analysis published yet.</div>;

  const cardStyle = { background: C.chalk, borderRadius: 8, padding: "20px 18px", marginBottom: 20, border: `1px solid ${C.line}` };
  const h2Style = { fontFamily: "Anton, sans-serif", fontWeight: 400, fontSize: 26, margin: "0 0 4px", lineHeight: 1.1 };
  const h3Style = { fontFamily: "Anton, sans-serif", fontWeight: 400, fontSize: 20, margin: "16px 0 8px", lineHeight: 1.1 };
  const pStyle = { fontSize: 13.5, lineHeight: 1.6, margin: "8px 0", color: C.ink };
  const tagStyle = (bg) => ({ display: "inline-block", background: bg, color: C.chalk, borderRadius: 3, padding: "2px 8px", fontSize: 11, fontWeight: 700, marginRight: 6 });

  function toggleEdition(idx) { setExpandedEditions((e) => ({ ...e, [idx]: !e[idx] })); }

  function renderMatchdayReport(playerPicks, actualScores, names, roundMatches, roundPlayed, roundLabel, tagLabel, headline) {
    const roundData = roundPlayed.map((mm) => {
      const actual = actualScores[mm.m];
      const actualOutcome = predOutcome(actual);
      const preds = [];
      let correct = 0;
      const exactMatches = [];
      for (const name of names) {
        const s = (playerPicks[name].scores || {})[mm.m];
        const o = predOutcome(s);
        if (o) preds.push({ name, outcome: o, score: s ? `${s.hg}-${s.ag}` : "?", initials: name.slice(0, 2).toUpperCase() });
        if (o && o === actualOutcome) { correct++; if (s && s.hg === actual.hg && s.ag === actual.ag) exactMatches.push(name); }
      }
      return { mm, actual, actualOutcome, preds, correct, exactMatches, total: preds.length };
    });

    const shockers = roundData.filter((d) => d.correct <= Math.ceil(d.total * 0.15));
    const nailed = roundData.filter((d) => d.correct >= Math.ceil(d.total * 0.85));

    const accuracy = names.map((name) => {
      let c = 0;
      for (const mm of roundPlayed) {
        const s = (playerPicks[name].scores || {})[mm.m];
        if (predOutcome(s) === predOutcome(actualScores[mm.m])) c++;
      }
      return { name, correct: c, pct: roundPlayed.length ? Math.round(100 * c / roundPlayed.length) : 0 };
    }).sort((a, b) => b.correct - a.correct);

    const totalCorrect = roundData.reduce((s, d) => s + d.correct, 0);
    const totalPreds = roundData.reduce((s, d) => s + d.total, 0);
    const poolPct = totalPreds > 0 ? Math.round(100 * totalCorrect / totalPreds) : 0;
    const totalExact = roundData.reduce((s, d) => s + d.exactMatches.length, 0);

    return (
      <div style={cardStyle}>
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          <span style={tagStyle(C.ink)}>{tagLabel}</span>
          <span style={tagStyle(C.sun)}>GROUP STAGE</span>
        </div>
        <h2 style={h2Style}>{headline}</h2>
        <p style={{ fontSize: 12, color: C.mute, fontFamily: "'DM Mono', monospace", margin: "4px 0 14px" }}>{roundLabel} results vs. {names.length} sets of predictions</p>

        <p style={pStyle}>
          All {roundPlayed.length} {roundLabel.toLowerCase()} matches are in the books, and the pool's collective crystal ball has taken a beating.
          Across {names.length} players and {roundPlayed.length} matches, we made {totalPreds} predictions — and got the outcome right just {poolPct}% of the time.
          {shockers.length > 0 && ` A whopping ${shockers.length} result${shockers.length > 1 ? "s" : ""} caught almost everyone off guard.`}
          {nailed.length > 0 && ` On the flip side, ${nailed.length} match${nailed.length > 1 ? "es were" : " was"} so predictable the pool nailed ${nailed.length > 1 ? "them" : "it"} almost unanimously.`}
          {totalExact > 0 && ` There were ${totalExact} exact score predictions across the entire pool — not bad for ${roundPlayed.length} games.`}
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "12px 0" }}>
          {[
            { label: "Matches", value: roundPlayed.length, sub: `${roundLabel.toLowerCase()} complete` },
            { label: "Pool Accuracy", value: `${poolPct}%`, sub: `${totalCorrect}/${totalPreds} correct` },
            { label: "Shockers", value: shockers.length, sub: "almost nobody got right" },
            { label: "Exact Scores", value: totalExact, sub: "nailed it perfectly" },
          ].map((s, i) => (
            <div key={i} style={{ flex: "1 1 140px", background: C.paper, borderRadius: 6, padding: "12px 14px", textAlign: "center", border: `1px solid ${C.line}` }}>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "Anton, sans-serif", color: C.ink }}>{s.value}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.ink, marginTop: 2 }}>{s.label}</div>
              <div style={{ fontSize: 10, color: C.mute }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {shockers.length > 0 && (<>
          <h3 style={h3Style}>NOBODY SAW THAT COMING</h3>
          <p style={pStyle}>
            These results left the pool speechless. When {names.length} people make predictions and nearly zero get it right, that's the beautiful game doing its thing.
            {shockers.filter((d) => d.correct === 0).length > 0 && ` ${shockers.filter((d) => d.correct === 0).length} match${shockers.filter((d) => d.correct === 0).length > 1 ? "es" : ""} had a perfect 0/${names.length} correct rate — literally no one in the pool saw it coming.`}
          </p>
          {shockers.map((d) => (
            <div key={d.mm.m} style={{ background: C.paper, borderRadius: 6, padding: "12px 14px", marginBottom: 8, borderLeft: `4px solid ${C.red}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{d.mm.h} {d.actual.hg} – {d.actual.ag} {d.mm.a}</span>
                  <span style={{ fontSize: 12, color: C.mute, marginLeft: 8 }}>M{d.mm.m} · {d.mm.d}</span>
                </div>
                <span style={tagStyle(C.red)}>{d.correct}/{d.total} correct</span>
              </div>
              {d.correct > 0 && <div style={{ fontSize: 12, color: C.pitch, fontWeight: 600, marginTop: 4 }}>Called it: {d.preds.filter((p) => p.outcome === d.actualOutcome).map((p) => p.name).join(", ")}</div>}
              {d.exactMatches.length > 0 && <div style={{ fontSize: 12, color: C.sun, fontWeight: 700, marginTop: 2 }}>Exact score: {d.exactMatches.join(", ")}</div>}
            </div>
          ))}
        </>)}

        {nailed.length > 0 && (<>
          <h3 style={h3Style}>THE SURE THINGS</h3>
          <p style={pStyle}>
            Not everything was chaos. These matches played out exactly as the crowd expected — the favourites won, the pool collected easy points, and order was restored.
            {nailed.filter((d) => d.exactMatches.length > 0).length > 0 && ` Even better, some people nailed the exact scoreline.`}
          </p>
          {nailed.map((d) => (
            <div key={d.mm.m} style={{ background: C.paper, borderRadius: 6, padding: "12px 14px", marginBottom: 8, borderLeft: `4px solid ${C.pitch}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{d.mm.h} {d.actual.hg} – {d.actual.ag} {d.mm.a}</span>
                  <span style={{ fontSize: 12, color: C.mute, marginLeft: 8 }}>M{d.mm.m} · {d.mm.d}</span>
                </div>
                <span style={tagStyle(C.pitch)}>{d.correct}/{d.total} correct</span>
              </div>
              {d.exactMatches.length > 0 && <div style={{ fontSize: 12, color: C.sun, fontWeight: 700, marginTop: 4 }}>Nailed the exact score: {d.exactMatches.join(", ")}</div>}
            </div>
          ))}
        </>)}

        {/* Match-by-match dot chart */}
        <h3 style={h3Style}>MATCH BY MATCH — WHO GOT IT RIGHT?</h3>
        <p style={pStyle}>
          Each square is a player. <span style={{ color: C.pitch, fontWeight: 700 }}>Green</span> = picked the home team, <span style={{ color: C.sun, fontWeight: 700 }}>Gold</span> = picked a draw, <span style={{ color: C.red, fontWeight: 700 }}>Red</span> = picked the away team. Hover for details.
        </p>
        {roundData.map((d) => {
          const outLabel = d.actualOutcome === "H" ? "Home win" : d.actualOutcome === "A" ? "Away win" : "Draw";
          const outColor = d.actualOutcome === "H" ? C.pitch : d.actualOutcome === "A" ? C.red : C.sun;
          return (
            <div key={d.mm.m} style={{ marginBottom: 10, padding: "8px 0", borderBottom: `1px solid ${C.line}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>M{d.mm.m} {d.mm.h} {d.actual.hg}–{d.actual.ag} {d.mm.a}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: outColor }}>{outLabel} · {d.correct}/{d.total}</span>
              </div>
              <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                {d.preds.map((p, i) => {
                  const isCorrect = p.outcome === d.actualOutcome;
                  const bg = p.outcome === "H" ? C.pitch : p.outcome === "A" ? C.red : C.sun;
                  return (
                    <div key={i} title={`${p.name}: ${p.score}${isCorrect ? " ✓" : ""}`}
                      style={{ width: 26, height: 26, borderRadius: 3, background: bg, display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 8, fontWeight: 700, color: C.chalk, cursor: "default", opacity: isCorrect ? 1 : 0.35,
                        border: isCorrect ? `2px solid ${C.ink}` : "none" }}>
                      {p.initials}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Accuracy leaderboard */}
        {roundPlayed.length > 0 && (<>
          <h3 style={h3Style}>{roundLabel.toUpperCase()} ACCURACY LEADERBOARD</h3>
          <p style={pStyle}>
            Who read {roundLabel.toLowerCase()} best? Out of {roundPlayed.length} matches,{" "}
            {accuracy[0] && `${accuracy[0].name} leads the way with ${accuracy[0].correct} correct (${accuracy[0].pct}%).`}
            {accuracy.length > 1 && accuracy[1].correct === accuracy[0].correct && ` Though it's a tie at the top — ${accuracy.filter((a) => a.correct === accuracy[0].correct).map((a) => a.name).join(", ")} are all knotted up.`}
            {accuracy.length > 0 && accuracy[accuracy.length - 1].correct > 0 && ` At the other end, ${accuracy[accuracy.length - 1].name} is bringing up the rear with ${accuracy[accuracy.length - 1].correct}.`}
            {" "}Remember, this is just group outcomes — the big knockout points haven't kicked in yet.
          </p>
          <HBar
            data={accuracy.map((a) => ({ label: a.name, value: a.correct, color: a.correct >= accuracy[0].correct ? C.pitch : a.correct >= accuracy[Math.floor(accuracy.length / 2)].correct ? C.ink : C.mute }))}
            maxVal={roundPlayed.length}
            height={22}
          />
        </>)}
      </div>
    );
  }

  function renderStandingsMovement(prevEdition, curEdition, names, movementLabel, movementFrom, movementTo, includeR32) {
    const prevPicks = prevEdition.snapshot.playerPicks;
    const prevResults = prevEdition.snapshot.results;
    const curPicks = curEdition.snapshot.playerPicks;
    const curResults = curEdition.snapshot.results;
    const prevScores = prevResults.scores || {};
    const curScores = curResults.scores || {};

    function groupCorrect(picks, scores) {
      let c = 0;
      if (!picks) return 0;
      for (const mm of MATCHES.filter((m) => scores[m.m] && scores[m.m].hg != null)) {
        const s = (picks.scores || {})[mm.m];
        if (predOutcome(s) === predOutcome(scores[mm.m])) c++;
      }
      return c;
    }
    // In R32 mode we rank by total points (group×1 + R32×2) via the real scoring engine,
    // so the board matches the app's Standings tab. Otherwise rank by group outcomes correct.
    function valueFor(picks, results, scores) {
      if (!picks) return { value: 0, group: 0, r32: 0 };
      if (includeR32) {
        const sc = scorePlayer(picks, results);
        return { value: sc.total, group: sc.breakdown.group || 0, r32: sc.breakdown.r32 || 0 };
      }
      const g = groupCorrect(picks, scores);
      return { value: g, group: g, r32: 0 };
    }

    const prevList = names.map((name) => ({ name, ...valueFor(prevPicks[name], prevResults, prevScores) })).sort((a, b) => b.value - a.value);
    const curList = names.map((name) => ({ name, ...valueFor(curPicks[name], curResults, curScores) })).sort((a, b) => b.value - a.value);

    const prevRank = {}; prevList.forEach((a, i) => { prevRank[a.name] = i + 1; });
    const curRank = {}; curList.forEach((a, i) => { curRank[a.name] = i + 1; });

    const movers = names.map((name) => {
      const pr = prevRank[name] || names.length;
      const cr = curRank[name] || names.length;
      return { name, prevRank: pr, curRank: cr, change: pr - cr };
    }).sort((a, b) => b.change - a.change);
    const climbers = movers.filter((m) => m.change > 0);
    const fallers = movers.filter((m) => m.change < 0).sort((a, b) => a.change - b.change);
    const unit = includeR32 ? "pts" : "correct";

    return (
      <div style={cardStyle}>
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          <span style={tagStyle(C.ink)}>STANDINGS</span>
          <span style={tagStyle(C.pitch)}>MOVEMENT</span>
        </div>
        <h2 style={h2Style}>WHO'S CLIMBING, WHO'S SLIDING?</h2>
        <p style={{ fontSize: 12, color: C.mute, fontFamily: "'DM Mono', monospace", margin: "4px 0 14px" }}>{includeR32 ? "Total points (group + Round of 32)" : "Group stage accuracy"}: {movementLabel || `${movementFrom || "Round 1"} → ${movementTo || "Round 2"}`}</p>

        <p style={pStyle}>
          {includeR32
            ? `The final group games are in and the Round-of-32 points (2 per correct team) have landed — so this is the real board now, group picks and bracket combined. `
            : ""}
          After {movementTo || "Round 2"}, the table has shuffled.
          {climbers.length > 0 && ` ${climbers[0].name} made the biggest move, climbing ${climbers[0].change} spot${climbers[0].change > 1 ? "s" : ""} from #${climbers[0].prevRank} to #${climbers[0].curRank}.`}
          {fallers.length > 0 && ` ${fallers[0].name} took the biggest tumble, dropping ${Math.abs(fallers[0].change)} spot${Math.abs(fallers[0].change) > 1 ? "s" : ""}.`}
        </p>

        {curList.map((a, i) => {
          const m = movers.find((x) => x.name === a.name);
          const ch = m ? m.change : 0;
          const arrow = ch > 0 ? "▲" : ch < 0 ? "▼" : "—";
          const arrowColor = ch > 0 ? C.pitch : ch < 0 ? C.red : C.mute;
          return (
            <div key={a.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: `1px solid ${C.line}` }}>
              <div style={{ width: 28, fontWeight: 700, fontSize: 16, fontFamily: "Anton, sans-serif", textAlign: "center", color: C.ink }}>{i + 1}</div>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{a.name}</div>
              <div style={{ fontSize: 12, color: C.mute, fontFamily: "'DM Mono', monospace", textAlign: "right" }}>
                {a.value} {unit}{includeR32 ? <span style={{ color: C.pitch }}> · {a.group}g+{a.r32}r32</span> : null}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: arrowColor, width: 46, textAlign: "right" }}>
                {arrow} {ch !== 0 ? Math.abs(ch) : ""}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function renderKnockoutPreview(playerPicks, results, names) {
    const q = computeQualifiers(results.scores || {}, results.manualOrder || {}, results.manualThird || []);
    const r32 = new Set(q.allComplete ? q.r32 : []);
    const inRound = (team, rk) => names.filter((n) => (playerPicks[n].advanced?.[rk] || []).includes(team)).length;

    // Champion survival + bracket intactness
    const champRows = names.map((n) => {
      const adv = playerPicks[n].advanced || {};
      const champ = (adv.champ || [])[0] || null;
      const sf = adv.sf || [];
      const sfAlive = sf.filter((t) => r32.has(t)).length;
      return { name: n, champ, champAlive: champ ? r32.has(champ) : null, sfTotal: sf.length, sfAlive };
    });
    const champAlive = champRows.filter((r) => r.champAlive === true);
    const champOut = champRows.filter((r) => r.champAlive === false);
    const fullyIntact = champRows.filter((r) => r.sfTotal === 4 && r.sfAlive === 4 && r.champAlive === true);

    // Deep casualties: SF-or-better picks eliminated in the group stage
    const casualties = [];
    for (const n of names) {
      const adv = playerPicks[n].advanced || {};
      const champ = (adv.champ || [])[0];
      const dead = [];
      for (const t of (adv.sf || [])) {
        if (!r32.has(t)) dead.push({ team: t, level: champ === t ? "Champion" : (adv.final || []).includes(t) ? "Finalist" : "Semifinalist" });
      }
      if (dead.length) dead.sort((a, b) => ({ Champion: 0, Finalist: 1, Semifinalist: 2 }[a.level] - { Champion: 0, Finalist: 1, Semifinalist: 2 }[b.level]));
      if (dead.length) casualties.push({ name: n, dead });
    }
    casualties.sort((a, b) => (a.dead[0].level === "Champion" ? -1 : 1) - (b.dead[0].level === "Champion" ? -1 : 1) || b.dead.length - a.dead.length);

    // R32 collisions: matchups that guarantee a popular pick goes home
    const collisions = KNOCKOUT.filter((m) => m.r === "r32").map((m) => {
      const a = m.a, b = m.b;
      const both = names.filter((n) => { const r16 = playerPicks[n].advanced?.r16 || []; return r16.includes(a) && r16.includes(b); }).length;
      const aR16 = inRound(a, "r16"), bR16 = inRound(b, "r16");
      const aDeep = inRound(a, "sf"), bDeep = inRound(b, "sf");
      return { m, a, b, both, aR16, bR16, aDeep, bDeep, heat: both * 3 + Math.min(aR16, bR16) + (aDeep + bDeep) };
    }).filter((c) => c.aR16 > 0 && c.bR16 > 0).sort((x, y) => y.heat - x.heat).slice(0, 6);

    return (
      <div style={cardStyle}>
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          <span style={tagStyle(C.ink)}>KNOCKOUTS</span>
          <span style={tagStyle(C.red)}>PREVIEW</span>
        </div>
        <h2 style={h2Style}>THE BRACKET SURVIVORS</h2>
        <p style={{ fontSize: 12, color: C.mute, fontFamily: "'DM Mono', monospace", margin: "4px 0 14px" }}>Whose knockout picks made it out of the groups — and the collisions ahead</p>

        <p style={pStyle}>
          The 32 survivors are set. Time to check the damage: {champAlive.length} of {names.length} players still have their champion pick alive, {champOut.length} watched theirs crash out before the knockouts even began
          {fullyIntact.length > 0 ? `, and ${fullyIntact.length} ${fullyIntact.length > 1 ? "brackets are" : "bracket is"} still fully intact (champion + all four semifinalists through).` : "."}
        </p>

        <h3 style={h3Style}>TITLE PICKS — STILL ALIVE?</h3>
        {champRows.filter((r) => r.champ).sort((a, b) => (b.champAlive === true) - (a.champAlive === true) || b.sfAlive - a.sfAlive).map((r) => (
          <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0", borderBottom: `1px solid ${C.line}` }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: r.champAlive ? C.pitch : C.red, color: C.chalk, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{r.champAlive ? "✓" : "✗"}</div>
            <div style={{ flex: 1, fontSize: 13 }}><span style={{ fontWeight: 700 }}>{r.name}</span> — {r.champ}</div>
            <div style={{ fontSize: 11, color: C.mute, fontFamily: "'DM Mono', monospace" }}>{r.sfAlive}/{r.sfTotal} SF alive</div>
          </div>
        ))}

        {casualties.length > 0 && (<>
          <h3 style={h3Style}>GONE TOO SOON</h3>
          <p style={pStyle}>Teams backed to reach the semifinals or further that didn't even survive the group stage — points that can never be scored.</p>
          {casualties.map((c) => (
            <div key={c.name} style={{ padding: "6px 0", borderBottom: `1px solid ${C.line}`, fontSize: 13 }}>
              <span style={{ fontWeight: 700 }}>{c.name}</span>: {c.dead.map((d, i) => (
                <span key={i}>{i > 0 ? ", " : " "}<span style={{ color: C.red, fontWeight: 600 }}>{d.team}</span> <span style={{ fontSize: 11, color: C.mute }}>({d.level})</span></span>
              ))}
            </div>
          ))}
        </>)}

        <h3 style={h3Style}>COLLISION COURSE</h3>
        <p style={pStyle}>
          The Round of 32 draw forces some popular teams to meet early — and only one can survive. These matchups are guaranteed to knock out a team plenty of brackets are counting on.
        </p>
        {collisions.map((c) => (
          <div key={c.m.n} style={{ background: C.paper, borderRadius: 6, padding: "10px 12px", marginBottom: 8, borderLeft: `4px solid ${C.red}` }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{c.a} <span style={{ color: C.red }}>vs</span> {c.b}</div>
            <div style={{ fontSize: 11.5, color: C.mute, fontFamily: "'DM Mono', monospace", marginTop: 2 }}>M{c.m.n} · {c.m.et}</div>
            <div style={{ fontSize: 12.5, color: C.ink, marginTop: 4, lineHeight: 1.5 }}>
              {c.both > 0 && <><b>{c.both}</b> {c.both > 1 ? "brackets" : "bracket"} picked <b>both</b> to reach the Round of 16 — guaranteed to lose one. </>}
              {c.a} backed by {c.aR16} to reach the R16{c.aDeep > 0 ? ` (${c.aDeep} to the semis+)` : ""}; {c.b} by {c.bR16}{c.bDeep > 0 ? ` (${c.bDeep} to the semis+)` : ""}.
            </div>
          </div>
        ))}
      </div>
    );
  }

  function computeKO(playerPicks, results, names, stage) {
    stage = stage || DEFAULT_STAGE;
    const q = computeQualifiers(results.scores || {}, results.manualOrder || {}, results.manualThird || []);
    const r32Set = new Set(q.allComplete ? q.r32 : []);
    const adv = results.advanced || {};
    const survivors = new Set(adv[stage.wonKey] || []);
    const ko = results.koScores || {};
    const bracket = names.filter((n) => (playerPicks[n].advanced?.champ || []).length || (playerPicks[n].advanced?.sf || []).length);
    // Upcoming matches = the games of the round the survivors are now in (KNOCKOUT r === wonKey),
    // with teams resolved from the feeder-match winners in koScores.
    const upcoming = KNOCKOUT.filter((m) => m.r === stage.wonKey).map((m) => ({ n: m.n, et: m.et, v: m.v, a: ko[m.f1]?.winner, b: ko[m.f2]?.winner }));
    const countIn = (team, rk) => bracket.filter((n) => (playerPicks[n].advanced?.[rk] || []).includes(team)).length;
    const whoIn = (team, rk) => bracket.filter((n) => (playerPicks[n].advanced?.[rk] || []).includes(team));
    const elimWhere = (team) => {
      if (!r32Set.has(team)) return "out in the groups";
      const labels = { r16: "lost in the Round of 32", qf: "lost in the Round of 16", sf: "lost in the quarterfinals", final: "lost in the semifinals", champ: "lost in the final" };
      for (const rk of KO_SEQ) { if (!(adv[rk] || []).includes(team)) return labels[rk]; }
      return "still alive";
    };
    return { stage, r32Set, adv, survivors, ko, bracket, upcoming, countIn, whoIn, elimWhere };
  }

  function renderSurvivors(playerPicks, results, names, stage) {
    stage = stage || DEFAULT_STAGE;
    const { survivors, bracket, countIn, whoIn } = computeKO(playerPicks, results, names, stage);
    const nB = bracket.length;
    const wk = stage.wonKey;
    const arr = [...survivors].map((t) => ({ t, c: countIn(t, wk) })).sort((a, b) => b.c - a.c);
    const chalk = arr.filter((x) => x.c >= Math.ceil(nB * 0.85));
    const ghosts = arr.filter((x) => x.c === 0);
    const sharp = arr.filter((x) => x.c > 0 && x.c <= Math.max(5, Math.floor(nB * 0.4)));
    return (
      <div style={cardStyle}>
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          <span style={tagStyle(C.ink)}>{stage.gamesTag}</span><span style={tagStyle(C.pitch)}>SURVIVORS</span>
        </div>
        <h2 style={h2Style}>THE SURVIVORS</h2>
        <p style={{ fontSize: 12, color: C.mute, fontFamily: "'DM Mono', monospace", margin: "4px 0 14px" }}>The {survivors.size} teams still standing vs. {nB} brackets</p>
        <p style={pStyle}>
          The favourites did their job.
          {chalk.length > 0 && ` ${chalk.map((x) => x.t).join(", ")} were the chalk — ${chalk.filter((x) => x.c === nB).length > 0 ? `${chalk.filter((x) => x.c === nB).map((x) => x.t).join(", ")} appeared in every single bracket. ` : "backed by nearly everyone. "}`}
          But the beautiful game always leaves a calling card.
        </p>
        {ghosts.length > 0 && (
          <div style={{ background: C.ink, color: C.chalk, borderRadius: 6, padding: "14px 16px", margin: "12px 0" }}>
            <div style={{ fontSize: 11, letterSpacing: ".14em", color: C.sun, fontWeight: 700, marginBottom: 6 }}>NOBODY SAW THIS COMING</div>
            <div style={{ fontFamily: "Anton, sans-serif", fontSize: 24, lineHeight: 1.05, marginBottom: 4 }}>{ghosts.map((x) => x.t).join(" & ")}</div>
            <div style={{ fontSize: 13.5, lineHeight: 1.5, color: "#D7DEE9" }}>
              Not one of the {nB} brackets had {ghosts.length > 1 ? "them" : ghosts[0].t} reaching the {stage.wonLabel}. The tournament's gatecrasher{ghosts.length > 1 ? "s" : ""} — through anyway, and doing it entirely uninvited.
            </div>
          </div>
        )}
        <h3 style={h3Style}>THE CHALK</h3>
        <HBar data={arr.slice(0, 8).map((x) => ({ label: x.t, value: x.c, color: x.c >= Math.ceil(nB * 0.85) ? C.pitch : x.c >= Math.ceil(nB * 0.4) ? C.ink : C.mute }))} maxVal={nB} showPct total={nB} height={22} />
        {sharp.length > 0 && (<>
          <h3 style={h3Style}>THE SHARP FEW</h3>
          <p style={pStyle}>A tip of the cap to the eagle-eyed who saw what others missed:</p>
          {sharp.map((x) => (
            <div key={x.t} style={{ padding: "5px 0", borderBottom: `1px solid ${C.line}`, fontSize: 13 }}>
              <span style={{ fontWeight: 700 }}>{x.t}</span> <span style={{ fontSize: 11, color: C.mute }}>({x.c} {x.c === 1 ? "believer" : "believers"})</span> — {whoIn(x.t, wk).join(", ") || "nobody"}
            </div>
          ))}
        </>)}
      </div>
    );
  }

  function renderBrokenBrackets(playerPicks, results, names, stage) {
    stage = stage || DEFAULT_STAGE;
    const { survivors, bracket, elimWhere } = computeKO(playerPicks, results, names, stage);
    const broken = [];
    const intact = [];
    for (const n of bracket) {
      const a = playerPicks[n].advanced || {};
      const champ = (a.champ || [])[0];
      const dead = [];
      for (const t of (a.sf || [])) {
        if (!survivors.has(t)) dead.push({ t, level: champ === t ? "Champion" : (a.final || []).includes(t) ? "Finalist" : "Semifinalist", where: elimWhere(t) });
      }
      if (dead.length) { dead.sort((x, y) => ({ Champion: 0, Finalist: 1, Semifinalist: 2 }[x.level] - { Champion: 0, Finalist: 1, Semifinalist: 2 }[y.level])); broken.push({ n, dead }); }
      else if ((a.sf || []).length === 4 && champ) intact.push({ n, champ });
    }
    const champAlive = bracket.filter((n) => { const c = (playerPicks[n].advanced?.champ || [])[0]; return c && survivors.has(c); }).length;
    return (
      <div style={cardStyle}>
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          <span style={tagStyle(C.ink)}>{stage.gamesTag}</span><span style={tagStyle(C.red)}>DAMAGE</span>
        </div>
        <h2 style={h2Style}>BROKEN BRACKETS</h2>
        <p style={{ fontSize: 12, color: C.mute, fontFamily: "'DM Mono', monospace", margin: "4px 0 14px" }}>Whose deep picks are already gone</p>
        <p style={pStyle}>
          {broken.length > 0 ? `${broken.length} ${broken.length > 1 ? "brackets are carrying damage" : "bracket is carrying damage"} — a semifinalist or better already eliminated. Painful, but the points still to come are big enough that most are far from done.` : "Remarkably, not a single deep pick has fallen yet."}
          {champAlive === bracket.length && ` And here's the kicker — every player's champion pick is still breathing.`}
        </p>
        {broken.map((b) => (
          <div key={b.n} style={{ padding: "7px 0", borderBottom: `1px solid ${C.line}`, fontSize: 13 }}>
            <span style={{ fontWeight: 700 }}>{b.n}</span>: {b.dead.map((d, i) => (
              <span key={i}>{i > 0 ? "; " : " "}<span style={{ color: C.red, fontWeight: 600 }}>{d.t}</span> <span style={{ fontSize: 11, color: C.mute }}>({d.level}, {d.where})</span></span>
            ))}
          </div>
        ))}
        {intact.length > 0 && (<>
          <h3 style={h3Style}>STILL PERFECT</h3>
          <p style={pStyle}>{intact.length} {intact.length > 1 ? "brackets have" : "bracket has"} a fully intact Final Four with their champion still standing:</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {intact.map((x) => <span key={x.n} style={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 4, padding: "4px 8px", fontSize: 12 }}><b>{x.n}</b> <span style={{ color: C.pitch }}>· {x.champ}</span></span>)}
          </div>
        </>)}
      </div>
    );
  }

  function renderCollisions(playerPicks, results, names, stage, collisionNote) {
    stage = stage || DEFAULT_STAGE;
    const { upcoming, bracket, countIn } = computeKO(playerPicks, results, names, stage);
    const nk = stage.nextKey;
    const cols = upcoming.filter((m) => m.a && m.b).map((m) => {
      const both = bracket.filter((n) => { const nx = playerPicks[n].advanced?.[nk] || []; return nx.includes(m.a) && nx.includes(m.b); });
      return { ...m, both, aN: countIn(m.a, nk), bN: countIn(m.b, nk) };
    }).sort((x, y) => y.both.length - x.both.length);
    const hot = cols.filter((c) => c.both.length > 0);
    return (
      <div style={cardStyle}>
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          <span style={tagStyle(C.ink)}>{stage.wonLabel.toUpperCase()}</span><span style={tagStyle(C.red)}>COLLISIONS</span>
        </div>
        <h2 style={h2Style}>COLLISION COURSE</h2>
        <p style={{ fontSize: 12, color: C.mute, fontFamily: "'DM Mono', monospace", margin: "4px 0 14px" }}>Matchups that pit two of the pool's favourites together</p>
        <p style={pStyle}>{hot.length > 0 ? "The draw forces some popular picks to meet, and only one can go through." : "This time the draw was kind — no two heavily-backed teams are drawn against each other."}</p>
        {hot.map((c) => (
          <div key={c.n} style={{ background: C.paper, borderRadius: 6, padding: "10px 12px", marginBottom: 8, borderLeft: `4px solid ${C.red}` }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{c.a} <span style={{ color: C.red }}>vs</span> {c.b}</div>
            <div style={{ fontSize: 11.5, color: C.mute, fontFamily: "'DM Mono', monospace", marginTop: 2 }}>M{c.n} · {c.et} · {c.v}</div>
            <div style={{ fontSize: 12.5, marginTop: 4, lineHeight: 1.5 }}>
              <b>{c.both.length}</b> {c.both.length > 1 ? "brackets" : "bracket"} picked <b>both</b> into the {stage.nextLabel} — a guaranteed casualty: {c.both.join(", ")}.
            </div>
          </div>
        ))}
        {collisionNote && (
          <div style={{ background: C.ink, color: C.chalk, borderRadius: 6, padding: "12px 14px", marginTop: 8 }}>
            <div style={{ fontSize: 11, letterSpacing: ".12em", color: C.sun, fontWeight: 700, marginBottom: 4 }}>{stage.collisionNoteTitle || "THE SUBPLOT"}</div>
            <div style={{ fontSize: 13, lineHeight: 1.55 }}>{collisionNote}</div>
          </div>
        )}
      </div>
    );
  }

  function renderQuestion(playerPicks, results, names, stage) {
    stage = stage || DEFAULT_STAGE;
    const { survivors, bracket, countIn, whoIn } = computeKO(playerPicks, results, names, stage);
    const nk = stage.nextKey;
    const nextPts = KO_PTS[nk];
    const arr = [...survivors].map((t) => ({ t, c: countIn(t, nk) })).sort((a, b) => b.c - a.c);
    const consensus = arr.slice(0, 5);
    const quiet = arr.filter((x) => x.c <= 2);
    const longshots = arr.filter((x) => x.c > 0 && x.c <= Math.floor(bracket.length * 0.5)).sort((a, b) => a.c - b.c);
    return (
      <div style={cardStyle}>
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          <span style={tagStyle(C.ink)}>{stage.wonLabel.toUpperCase()}</span><span style={tagStyle(C.sun)}>{stage.nextShort} PICKS</span>
        </div>
        <h2 style={h2Style}>THE {stage.nextTitle} QUESTION</h2>
        <p style={{ fontSize: 12, color: C.mute, fontFamily: "'DM Mono', monospace", margin: "4px 0 14px" }}>Who the pool backs to reach the {stage.nextPlace}</p>
        <p style={pStyle}>
          The pool is piling onto the same few horses — {consensus.slice(0, 4).map((x) => `${x.t} (${x.c})`).join(", ")} are the consensus picks for the {stage.nextLabel}.
          {quiet.length > 0 && ` The contrarian gold is hiding among the quiet survivors: almost nobody has ${quiet.slice(0, 3).map((x) => x.t).join(", ")} going deeper, so whoever rides one into the ${stage.nextPlace} banks points the rest of the pool won't.`}
        </p>
        <HBar data={arr.map((x) => ({ label: x.t, value: x.c, color: x.c >= Math.ceil(bracket.length * 0.6) ? C.pitch : x.c >= 3 ? C.ink : C.mute })).slice(0, 12)} maxVal={bracket.length} height={20} />
        {longshots.length > 0 && (<>
          <h3 style={h3Style}>RIDING THE LONGSHOTS</h3>
          <p style={pStyle}>
            With the table bunched this tight, these are the picks that could crack it open. Here's exactly who's still backing each of the quieter survivors into the {stage.nextPlace} — if one lands, it's a {nextPts}-point swing the rest of the pool doesn't get.
          </p>
          {longshots.map((x) => (
            <div key={x.t} style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: `1px solid ${C.line}`, fontSize: 13 }}>
              <div style={{ width: 88, flexShrink: 0, fontWeight: 700 }}>{x.t} <span style={{ fontSize: 11, color: C.mute, fontWeight: 400 }}>({x.c})</span></div>
              <div style={{ flex: 1, color: C.ink }}>{whoIn(x.t, nk).join(", ")}</div>
            </div>
          ))}
        </>)}
      </div>
    );
  }

  function renderTitleRace(playerPicks, results, names, stage) {
    stage = stage || DEFAULT_STAGE;
    const { survivors, bracket } = computeKO(playerPicks, results, names, stage);
    const alive = (t) => survivors.has(t);
    // Remaining scoreable rounds = the rounds after wonKey (everything up to & including it is locked).
    const remaining = KO_SEQ.slice(KO_SEQ.indexOf(stage.wonKey) + 1);
    const ceiling = (p) => {
      const a = p.advanced || {};
      let c = 0;
      for (const rk of remaining) {
        const picks = rk === "champ" ? ((a.champ || [])[0] ? [a.champ[0]] : []) : (a[rk] || []);
        c += picks.filter(alive).length * KO_PTS[rk];
      }
      return c;
    };
    const roundLabels = { qf: "Quarterfinals 5", sf: "Semifinals 8", final: "Final 13", champ: "Champion 21" };
    const rows = names.map((n) => { const cur = scorePlayer(playerPicks[n], results).total; const ceil = bracket.includes(n) ? ceiling(playerPicks[n]) : 0; return { n, cur, ceil, max: cur + ceil, hasBracket: bracket.includes(n) }; }).sort((a, b) => b.cur - a.cur);
    const leader = rows[0];
    const race = rows.filter((r) => r.hasBracket);
    const eliminated = race.filter((r) => r.n !== leader.n && r.max < leader.cur);
    const spread = race[0].cur - race[Math.min(9, race.length - 1)].cur;
    return (
      <div style={cardStyle}>
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          <span style={tagStyle(C.ink)}>STANDINGS</span><span style={tagStyle(C.pitch)}>TITLE RACE</span>
        </div>
        <h2 style={h2Style}>IS IT STILL ALL TO PLAY FOR?</h2>
        <p style={{ fontSize: 12, color: C.mute, fontFamily: "'DM Mono', monospace", margin: "4px 0 14px" }}>{stage.lockedLabel} · what's left to win</p>
        <p style={pStyle}>
          {stage.raceLead !== undefined
            ? stage.raceLead
            : (eliminated.length === 0
              ? "Yes — wildly so. The whole field is still standing: not a single player is mathematically out of catching the leader. "
              : `${race.length - eliminated.length} ${race.length - eliminated.length === 1 ? "player is" : "players are"} still live for the title. `)}
          The points only get bigger from here ({remaining.map((rk, i) => (<React.Fragment key={rk}>{i > 0 ? ", " : ""}{rk === "champ" ? <b>Champion 21</b> : roundLabels[rk]}</React.Fragment>))}), so the board can flip in an afternoon.
          {" "}<b>{leader.n}</b> leads on {leader.cur}, but the top ten are packed inside just {spread} points{spread < 13 ? " — less than a single correct Final pick" : ""}.
          {stage.raceTail ? " " + stage.raceTail : ""}
        </p>
        {eliminated.length > 0 && (
          <p style={{ ...pStyle, color: C.mute }}>Out of reach of the leader, but still playing for pride: {eliminated.map((r) => r.n).join(", ")}.</p>
        )}
        {race.map((r, i) => (
          <div key={r.n} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: `1px solid ${C.line}` }}>
            <div style={{ width: 24, fontWeight: 700, fontSize: 15, fontFamily: "Anton, sans-serif", textAlign: "center" }}>{i + 1}</div>
            <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{r.n}</div>
            <div style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", color: C.ink }}>{r.cur}</div>
            <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: C.mute, width: 78, textAlign: "right" }}>+{r.ceil} left</div>
          </div>
        ))}
      </div>
    );
  }

  function renderOddsEnds(playerPicks, results, names, customTidbits, stage) {
    stage = stage || DEFAULT_STAGE;
    const wk = stage.wonKey;
    const { survivors, bracket, countIn, whoIn } = computeKO(playerPicks, results, names, stage);
    const lowSurv = [...survivors].filter((t) => countIn(t, wk) > 0 && countIn(t, wk) <= 5);
    let maverick = null, mavCount = -1;
    for (const n of bracket) { const c = lowSurv.filter((t) => (playerPicks[n].advanced?.[wk] || []).includes(t)).length; if (c > mavCount) { mavCount = c; maverick = n; } }
    const champByTeam = {};
    for (const n of bracket) { const c = (playerPicks[n].advanced?.champ || [])[0]; if (c && survivors.has(c)) champByTeam[c] = (champByTeam[c] || 0) + 1; }
    const topChamp = Object.entries(champByTeam).sort((a, b) => b[1] - a[1])[0];
    return (
      <div style={cardStyle}>
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          <span style={tagStyle(C.ink)}>ODDS & ENDS</span>
        </div>
        <h2 style={h2Style}>ODDS & ENDS</h2>
        <p style={{ fontSize: 12, color: C.mute, fontFamily: "'DM Mono', monospace", margin: "4px 0 14px" }}>The little stories in the picks</p>
        {(customTidbits || []).map((t, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 2 }}>{t.h}</div>
            <div style={{ fontSize: 13, lineHeight: 1.55, color: C.ink }}>{t.p}</div>
          </div>
        ))}
        {maverick && mavCount >= 2 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 2 }}>{maverick}, the maverick</div>
            <div style={{ fontSize: 13, lineHeight: 1.55 }}>The bracket that zagged when everyone zigged called {mavCount} of the pool's least-fancied survivors into the {stage.wonLabel} — {lowSurv.filter((t) => (playerPicks[maverick].advanced?.[wk] || []).includes(t)).join(", ")}.</div>
          </div>
        )}
        {topChamp && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 2 }}>The people's champion</div>
            <div style={{ fontSize: 13, lineHeight: 1.55 }}>{topChamp[0]} is the most-backed title pick still standing, carried by {topChamp[1]} {topChamp[1] > 1 ? "players" : "player"}: {whoIn(topChamp[0], "champ").join(", ")}.</div>
          </div>
        )}
      </div>
    );
  }

  // Generic remaining-bracket enumerator: enumerates every outcome of the undecided knockout
  // games (from the current frontier forward) and scores each player. Post-R16 that's 128
  // (QF+SF+Final); post-QF it's 8 (SF+Final). Locked rounds are already in `cur`.
  function computeOutcomes(playerPicks, results, names) {
    const ko = results.koScores || {};
    const adv = results.advanced || {};
    const bracket = names.filter((n) => (playerPicks[n].advanced?.champ || []).length || (playerPicks[n].advanced?.sf || []).length);
    const cur = {}; for (const n of bracket) cur[n] = scorePlayer(playerPicks[n], results).total;
    const roundOrder = { r16: 0, qf: 1, sf: 2, final: 3 };
    const feedsKey = { r16: "qf", qf: "sf", sf: "final", final: "champ" };
    const games = KNOCKOUT.filter((m) => roundOrder[m.r] !== undefined);
    const undecided = games.filter((m) => !(ko[m.n] && ko[m.n].winner)).sort((a, b) => roundOrder[a.r] - roundOrder[b.r] || a.n - b.n);
    const openKeys = ["qf", "sf", "final", "champ"].filter((k) => !((adv[k] || []).length));
    const bits = undecided.length;
    if (!bits || bits > 12) return { bracket, cur, scenarios: [] };
    const scenarios = [];
    for (let mask = 0; mask < (1 << bits); mask++) {
      const assign = {};
      for (let i = 0; i < bits; i++) { const m = undecided[i]; const wf = (fn) => (ko[fn] && ko[fn].winner) || assign[fn]; const t = [wf(m.f1), wf(m.f2)]; assign[m.n] = ((mask >> i) & 1) ? t[1] : t[0]; }
      const winnerOf = (n) => (ko[n] && ko[n].winner) || assign[n];
      const ach = { qf: new Set(), sf: new Set(), final: new Set(), champ: new Set() };
      for (const g of games) { const w = winnerOf(g.n); if (w) ach[feedsKey[g.r]].add(w); }
      const tot = {};
      for (const n of bracket) { const a = playerPicks[n].advanced || {}; let x = cur[n]; for (const k of openKeys) { const picks = k === "champ" ? ((a.champ || [])[0] ? [a.champ[0]] : []) : (a[k] || []); for (const t of picks) if (ach[k].has(t)) x += KO_PTS[k]; } tot[n] = x; }
      scenarios.push({ champ: [...ach.champ][0] || null, tot, finalists: [...ach.final], sf: [...ach.sf].sort() });
    }
    return { bracket, cur, scenarios };
  }

  function renderScenarios(playerPicks, results, names, teams, stage) {
    teams = teams && teams.length ? teams : ["France"];
    stage = stage || DEFAULT_STAGE;
    const { bracket, cur, scenarios } = computeOutcomes(playerPicks, results, names);
    const total = scenarios.length;
    if (!total) return null;
    const stat = {}; for (const n of bracket) stat[n] = { win: 0, best: null, bestScore: -1 };
    for (const sc of scenarios) {
      const mx = Math.max(...bracket.map((n) => sc.tot[n]));
      const winners = bracket.filter((n) => sc.tot[n] === mx);
      if (winners.length === 1) { const n = winners[0]; stat[n].win++; if (sc.tot[n] > stat[n].bestScore) { stat[n].bestScore = sc.tot[n]; stat[n].best = { finalists: sc.finalists, champ: sc.champ, score: sc.tot[n] }; } }
    }
    function teamCard(team) {
      const backers = bracket.filter((n) => (playerPicks[n].advanced?.champ || [])[0] === team);
      if (!backers.length) return null;
      const rows = backers.map((n) => ({ n, ...stat[n], cur: cur[n] })).sort((a, b) => b.win - a.win || b.cur - a.cur);
      const live = rows.filter((r) => r.win > 0);
      return (
        <div key={team} style={cardStyle}>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            <span style={tagStyle(C.ink)}>SCENARIOS</span><span style={tagStyle(C.sun)}>ROAD TO GLORY</span>
          </div>
          <h2 style={h2Style}>THE {team.toUpperCase()} FAITHFUL</h2>
          <p style={{ fontSize: 12, color: C.mute, fontFamily: "'DM Mono', monospace", margin: "4px 0 14px" }}>Paths to the overall title for the {backers.length} who backed {team}</p>
          <p style={pStyle}>
            {backers.length} {backers.length > 1 ? "players" : "player"} put the trophy on {team}, still alive in the {stage.wonLabel}. Across the {total} ways the rest of the bracket can fall, here's each one's road to winning the pool — every route runs through a {team} title.
          </p>
          {rows.map((r) => {
            const other = r.best ? r.best.finalists.find((t) => t !== team) : null;
            return (
              <div key={r.n} style={{ padding: "9px 0", borderBottom: `1px solid ${C.line}` }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{r.n}</span>
                  <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: r.win > 0 ? C.pitch : C.mute }}>{r.win > 0 ? `${r.win} of ${total} winning paths` : "no path left"}</span>
                </div>
                <div style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.5, marginTop: 2 }}>
                  {r.win > 0
                    ? <>Best case: {team} win it all{other ? <>, beating <b>{other}</b> in the final</> : ""} — {r.win >= 15 ? "firmly in the box seat, needing little else to break their way" : "a narrower route, but it's live"}. Tops out at <b>{r.best.score}</b>.</>
                    : <>Even a {team} triumph won't be enough now — the other deep picks that would carry them are already out. Cheering {team} on for pride.</>}
                </div>
              </div>
            );
          })}
          <p style={{ ...pStyle, color: C.mute, marginTop: 12 }}>{live.length} of the {backers.length} {team} {backers.length > 1 ? "backers" : "backer"} can still win the whole thing.{rows[0] && rows[0].win > 0 ? ` ${rows[0].n} has the most routes (${rows[0].win}).` : ""}</p>
        </div>
      );
    }
    return <>{teams.map((t) => teamCard(t))}</>;
  }

  // Ledger of every remaining outcome (field result -> pool standings). Only shown when the
  // remaining bracket is small enough to be readable (<= 8 outcomes, i.e. post-QF onward).
  function renderScenarioTable(playerPicks, results, names) {
    const ko = results.koScores || {};
    const { bracket, scenarios } = computeOutcomes(playerPicks, results, names);
    if (!scenarios.length || scenarios.length > 8) return null;
    const sfMatches = KNOCKOUT.filter((m) => m.r === "sf").map((m) => ({ a: ko[m.f1]?.winner, b: ko[m.f2]?.winner }));
    if (sfMatches.some((m) => !m.a || !m.b)) return null;
    const rows = scenarios.map((sc) => {
      const ranked = bracket.map((n) => ({ n, x: sc.tot[n] })).sort((a, b) => b.x - a.x);
      const other = sc.finalists.find((t) => t !== sc.champ);
      const semis = sfMatches.map((m, i) => { const adv = sc.finalists[i]; const lose = adv === m.a ? m.b : m.a; return `${adv} beat ${lose}`; });
      return { finalists: sc.finalists, champ: sc.champ, other, semis, ranked };
    }).sort((a, b) => (a.finalists[0] + a.finalists[1] + a.champ).localeCompare(b.finalists[0] + b.finalists[1] + b.champ));
    return (
      <div style={cardStyle}>
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          <span style={tagStyle(C.ink)}>SCENARIOS</span><span style={tagStyle(C.pitch)}>EVERY ENDING</span>
        </div>
        <h2 style={h2Style}>THE EIGHT ENDINGS</h2>
        <p style={{ fontSize: 12, color: C.mute, fontFamily: "'DM Mono', monospace", margin: "4px 0 14px" }}>Every remaining outcome — on the field and on the leaderboard</p>
        <p style={pStyle}>
          Just two semifinals and a final stand between here and the trophy — {scenarios.length} possible endings in all. Here's what each does to our pool.
        </p>
        {rows.map((r, i) => (
          <div key={i} style={{ background: C.paper, borderRadius: 6, padding: "10px 12px", marginBottom: 8, borderLeft: `4px solid ${C.pitch}` }}>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>{r.champ} beat {r.other} in the final</div>
            <div style={{ fontSize: 11.5, color: C.mute, marginTop: 1 }}>Semis: {r.semis.join(" · ")}</div>
            <div style={{ fontSize: 12.5, marginTop: 4 }}>
              🏆 <b>{r.ranked[0].n}</b> wins the pool on <b>{r.ranked[0].x}</b>
              <span style={{ color: C.mute }}> · 2nd {r.ranked[1].n} {r.ranked[1].x} · 3rd {r.ranked[2].n} {r.ranked[2].x}</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderChaos(playerPicks, results, names) {
    const ko = results.koScores || {};
    const bracket = names.filter((n) => (playerPicks[n].advanced?.champ || []).length || (playerPicks[n].advanced?.sf || []).length);
    const cur = {}; for (const n of bracket) cur[n] = scorePlayer(playerPicks[n], results).total;
    const qf = KNOCKOUT.filter((m) => m.r === "qf").map((m) => ({ n: m.n, a: ko[m.f1]?.winner, b: ko[m.f2]?.winner }));
    const sf = KNOCKOUT.filter((m) => m.r === "sf");
    const fin = KNOCKOUT.find((m) => m.r === "final");
    if (qf.length !== 4 || qf.some((m) => !m.a || !m.b) || sf.length !== 2 || !fin) return null;
    const qfTeams = qf.flatMap((m) => [m.a, m.b]);
    const champBackers = {}; for (const n of bracket) { const c = (playerPicks[n].advanced?.champ || [])[0]; if (c) champBackers[c] = (champBackers[c] || 0) + 1; }
    const darks = qfTeams.filter((t) => !champBackers[t]);
    if (!darks.length) return null;
    const per = {}; darks.forEach((t) => per[t] = { n: 0, byPlayer: {} });
    const chaosWins = {};
    for (let q = 0; q < 16; q++) {
      const qw = {}; qf.forEach((m, i) => { qw[m.n] = ((q >> i) & 1) ? m.b : m.a; });
      const sfSet = new Set(Object.values(qw));
      for (let s = 0; s < 4; s++) {
        const fw = {}; sf.forEach((m, j) => { const cand = [qw[m.f1], qw[m.f2]]; fw[m.n] = ((s >> j) & 1) ? cand[1] : cand[0]; });
        const finSet = new Set(Object.values(fw));
        const finalCand = [fw[fin.f1], fw[fin.f2]];
        for (let fi = 0; fi < 2; fi++) {
          const champ = fi ? finalCand[1] : finalCand[0];
          if (!per[champ]) continue;
          const tot = {};
          for (const n of bracket) { const a = playerPicks[n].advanced || {}; let x = cur[n]; for (const t of (a.sf || [])) if (sfSet.has(t)) x += 8; for (const t of (a.final || [])) if (finSet.has(t)) x += 13; if ((a.champ || [])[0] === champ) x += 21; tot[n] = x; }
          const mx = Math.max(...bracket.map((n) => tot[n]));
          const winners = bracket.filter((n) => tot[n] === mx);
          per[champ].n++;
          if (winners.length === 1) {
            const n = winners[0];
            chaosWins[n] = (chaosWins[n] || 0) + 1;
            const rec = per[champ].byPlayer[n] || (per[champ].byPlayer[n] = { win: 0, bestScore: -1, other: null, sf: [] });
            rec.win++;
            if (tot[n] > rec.bestScore) { rec.bestScore = tot[n]; rec.other = [...finSet].find((x) => x !== champ) || null; rec.sf = [...sfSet].sort(); }
          }
        }
      }
    }
    const deepOn = (t, n) => (playerPicks[n].advanced?.final || []).includes(t) ? "final" : (playerPicks[n].advanced?.sf || []).includes(t) ? "semis" : null;
    const order = darks.slice().sort((a, b) => Math.max(0, ...Object.values(per[b].byPlayer).map((r) => r.win)) - Math.max(0, ...Object.values(per[a].byPlayer).map((r) => r.win)));
    const king = Object.entries(chaosWins).sort((a, b) => b[1] - a[1])[0];
    const totalDark = darks.reduce((s, t) => s + per[t].n, 0);
    return (
      <div style={cardStyle}>
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          <span style={tagStyle(C.ink)}>SCENARIOS</span><span style={tagStyle(C.red)}>CHAOS</span>
        </div>
        <h2 style={h2Style}>THE CHAOS BRACKET</h2>
        <p style={{ fontSize: 12, color: C.mute, fontFamily: "'DM Mono', monospace", margin: "4px 0 14px" }}>Who wins the pool if a team nobody crowned lifts the trophy</p>
        <p style={pStyle}>
          The bracket can still finish 128 ways. In exactly half of them — <b>64</b> — the champion is one of the four teams nobody backed to win it: {order.join(", ")} (16 scenarios each). When that happens the 21 champion points go unclaimed by everyone, and the pool falls to whoever's already ahead plus anyone who caught semifinal or final value on the underdog. Here's each dark horse's title run and who it crowns.
        </p>
        {order.map((t) => {
          const rows = Object.entries(per[t].byPlayer).map(([n, r]) => ({ n, ...r })).sort((a, b) => b.win - a.win || b.bestScore - a.bestScore);
          return (
            <div key={t} style={{ padding: "10px 0", borderBottom: `1px solid ${C.line}` }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 3 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{t} win it all</span>
                <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: C.mute }}>16 scenarios</span>
              </div>
              {rows.map((r) => { const on = deepOn(t, r.n); return (
                <div key={r.n} style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.5, paddingLeft: 2, marginBottom: 3 }}>
                  <b>{r.n}</b> wins the pool in {r.win} of the 16 — best case <b>{r.bestScore}</b>{on ? <span style={{ color: C.pitch }}> (rode {t} to the {on})</span> : ""}. {r.sf.length ? <span style={{ color: C.mute }}>Last four: {r.sf.join(", ")}{r.other ? `; ${t} beats ${r.other} in the final` : ""}.</span> : null}
                </div>
              ); })}
              {!rows.length && <div style={{ fontSize: 12.5, color: C.mute }}>Ends in a tie in every branch.</div>}
            </div>
          );
        })}
        {king && (
          <p style={{ ...pStyle, marginTop: 12 }}>
            <b>{king[0]} is the chaos king</b> — the pool winner in {king[1]} of the {totalDark} dark-horse scenarios. The more the bracket burns, the better {king[0]} does.
          </p>
        )}
      </div>
    );
  }

  function renderConsensusCard(playerPicks, actualScores, names, roundMatches, tagLabel) {
    const consensus = roundMatches.map((mm) => {
      const outcomes = { H: 0, D: 0, A: 0 };
      const exactScores = {};
      for (const name of names) {
        const s = (playerPicks[name].scores || {})[mm.m];
        const o = predOutcome(s);
        if (o) outcomes[o]++;
        if (s && s.hg != null && s.ag != null) {
          const key = `${s.hg}-${s.ag}`;
          exactScores[key] = (exactScores[key] || 0) + 1;
        }
      }
      const total = outcomes.H + outcomes.D + outcomes.A;
      const maxEntry = Object.entries(outcomes).sort((a, b) => b[1] - a[1])[0];
      const topScore = Object.entries(exactScores).sort((a, b) => b[1] - a[1])[0];
      const consensusPct = total > 0 ? Math.round(100 * maxEntry[1] / total) : 0;
      return { mm, outcomes, total, maxEntry, topScore, consensusPct };
    });

    const unanimous = consensus.filter((c) => c.consensusPct === 100).sort((a, b) => b.total - a.total);
    const divided = consensus.filter((c) => c.consensusPct < 60).sort((a, b) => a.consensusPct - b.consensusPct);

    return (
      <div style={cardStyle}>
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          <span style={tagStyle(C.ink)}>{tagLabel}</span>
          <span style={tagStyle(C.sun)}>GROUP STAGE</span>
        </div>
        <h2 style={h2Style}>THE SCORES WE ALL AGREED ON (AND THE ONES WE DIDN'T)</h2>
        <p style={{ fontSize: 12, color: C.mute, fontFamily: "'DM Mono', monospace", margin: "4px 0 14px" }}>{tagLabel.toLowerCase().includes("round") ? tagLabel : "Round"} group match consensus</p>

        <p style={pStyle}>
          Before a ball was kicked, our {names.length} predictors locked in their scores.
          {unanimous.length > 0 && ` ${unanimous.length} match${unanimous.length > 1 ? "es" : ""} had 100% agreement on the outcome — zero debate.`}
          {divided.length > 0 && ` ${divided.length} match${divided.length > 1 ? "es" : ""} split the room with no clear favourite.`}
        </p>

        {unanimous.length > 0 && (<>
          <h3 style={h3Style}>100% AGREEMENT</h3>
          <p style={pStyle}>Every single player predicted the same outcome for these matches. Zero debate.</p>
          {unanimous.map((c) => {
            const label = c.maxEntry[0] === "H" ? `${c.mm.h} win` : c.maxEntry[0] === "A" ? `${c.mm.a} win` : "Draw";
            const actual = actualScores[c.mm.m];
            const gotItRight = actual && predOutcome(actual) === c.maxEntry[0];
            const gotItWrong = actual && predOutcome(actual) !== c.maxEntry[0];
            return (
              <div key={c.mm.m} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.line}` }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: gotItRight ? C.pitch : gotItWrong ? C.red : C.ink, display: "flex", alignItems: "center", justifyContent: "center", color: C.chalk, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                  {gotItRight ? "✓" : gotItWrong ? "✗" : "M" + c.mm.m}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{c.mm.h} vs {c.mm.a}</div>
                  <div style={{ fontSize: 12, color: C.mute }}>All {c.total} picked: {label}{c.topScore ? ` · Most common score: ${c.topScore[0]} (${c.topScore[1]}×)` : ""}</div>
                  {actual && <div style={{ fontSize: 12, fontWeight: 600, color: gotItRight ? C.pitch : C.red }}>Result: {actual.hg}–{actual.ag} {gotItRight ? "— the pool was right!" : "— surprise!"}</div>}
                </div>
              </div>
            );
          })}
        </>)}

        {divided.length > 0 && (<>
          <h3 style={h3Style}>THE TOSS-UPS</h3>
          <p style={pStyle}>These matches genuinely split opinion. No clear favourite emerged from the group.</p>
          {divided.map((c) => {
            const actual = actualScores[c.mm.m];
            return (
              <div key={c.mm.m} style={{ padding: "10px 0", borderBottom: `1px solid ${C.line}` }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>{c.mm.h} vs {c.mm.a} <span style={{ fontSize: 12, color: C.mute, fontWeight: 400 }}>M{c.mm.m}</span></div>
                <div style={{ display: "flex", gap: 4, height: 28, borderRadius: 4, overflow: "hidden" }}>
                  {c.outcomes.H > 0 && <div style={{ flex: c.outcomes.H, background: C.pitch, display: "flex", alignItems: "center", justifyContent: "center", color: C.chalk, fontSize: 11, fontWeight: 700 }}>{c.mm.h.split(" ")[0]} {c.outcomes.H}</div>}
                  {c.outcomes.D > 0 && <div style={{ flex: c.outcomes.D, background: C.sun, display: "flex", alignItems: "center", justifyContent: "center", color: C.chalk, fontSize: 11, fontWeight: 700 }}>Draw {c.outcomes.D}</div>}
                  {c.outcomes.A > 0 && <div style={{ flex: c.outcomes.A, background: C.red, display: "flex", alignItems: "center", justifyContent: "center", color: C.chalk, fontSize: 11, fontWeight: 700 }}>{c.mm.a.split(" ")[0]} {c.outcomes.A}</div>}
                </div>
                {actual && <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4, color: C.mute }}>Result: {actual.hg}–{actual.ag}</div>}
              </div>
            );
          })}
        </>)}

        {/* Lone wolves */}
        <h3 style={h3Style}>LONE WOLF PICKS</h3>
        <p style={pStyle}>
          These brave souls were the only person in the entire pool to pick a particular outcome.
          Being a lone wolf is either prophetic or painful — there is no middle ground. Check marks are geniuses, crosses are... optimists.
        </p>
        {(() => {
          const loneWolves = [];
          for (const mm of roundMatches) {
            for (const name of names) {
              const s = (playerPicks[name].scores || {})[mm.m];
              const o = predOutcome(s);
              if (!o) continue;
              let othersWithSame = 0;
              for (const other of names) {
                if (other === name) continue;
                const os = (playerPicks[other].scores || {})[mm.m];
                if (predOutcome(os) === o) othersWithSame++;
              }
              if (othersWithSame === 0) {
                const label = o === "H" ? `${mm.h} win` : o === "A" ? `${mm.a} win` : "Draw";
                const actual = actualScores[mm.m];
                const wasRight = actual && predOutcome(actual) === o;
                loneWolves.push({ name, mm, label, score: s ? `${s.hg}-${s.ag}` : "?", wasRight, hasResult: !!actual });
              }
            }
          }
          return loneWolves.length > 0 ? (
            <div>
              {loneWolves.map((lw, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: `1px solid ${C.line}` }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: lw.hasResult ? (lw.wasRight ? C.pitch : C.red) : C.ink, display: "flex", alignItems: "center", justifyContent: "center", color: C.chalk, fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                    {lw.hasResult ? (lw.wasRight ? "✓" : "✗") : "?"}
                  </div>
                  <div style={{ flex: 1, fontSize: 13 }}>
                    <span style={{ fontWeight: 700 }}>{lw.name}</span> alone picked <span style={{ fontWeight: 700 }}>{lw.label}</span> in {lw.mm.h} vs {lw.mm.a} ({lw.score})
                    {lw.hasResult && lw.wasRight && <span style={{ color: C.pitch, fontWeight: 600 }}> — genius!</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : <p style={pStyle}>No lone wolves — everyone stuck with the pack.</p>;
        })()}
      </div>
    );
  }

  function renderPreviewCard(playerPicks, actualScores, names, previewMatches, roundLabel, tagLabel) {
    const r2Data = previewMatches.map((mm) => {
      const outcomes = { H: 0, D: 0, A: 0 };
      const exactScores = {};
      const loneWolves = [];
      for (const name of names) {
        const s = (playerPicks[name].scores || {})[mm.m];
        const o = predOutcome(s);
        if (o) outcomes[o]++;
        if (s && s.hg != null && s.ag != null) {
          const key = `${s.hg}-${s.ag}`;
          exactScores[key] = (exactScores[key] || 0) + 1;
        }
      }
      const total = outcomes.H + outcomes.D + outcomes.A;
      const maxEntry = Object.entries(outcomes).sort((a, b) => b[1] - a[1])[0];
      const topScore = Object.entries(exactScores).sort((a, b) => b[1] - a[1])[0];
      const consensusPct = total > 0 ? Math.round(100 * maxEntry[1] / total) : 0;
      for (const name of names) {
        const s = (playerPicks[name].scores || {})[mm.m];
        const o = predOutcome(s);
        if (!o) continue;
        let others = 0;
        for (const other of names) { if (other === name) continue; const os = (playerPicks[other].scores || {})[mm.m]; if (predOutcome(os) === o) others++; }
        if (others === 0) loneWolves.push({ name, outcome: o, score: s ? `${s.hg}-${s.ag}` : "?" });
      }
      const actual = actualScores[mm.m];
      return { mm, outcomes, total, maxEntry, topScore, consensusPct, loneWolves, actual };
    });
    const unanimous = r2Data.filter((d) => d.consensusPct === 100);
    const divided = r2Data.filter((d) => d.consensusPct < 60).sort((a, b) => a.consensusPct - b.consensusPct);
    const contrarian = r2Data.filter((d) => d.loneWolves.length > 0);
    return (
      <div style={cardStyle}>
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          <span style={tagStyle(C.ink)}>{tagLabel}</span>
          <span style={tagStyle(C.sun)}>PREVIEW</span>
        </div>
        <h2 style={h2Style}>WHAT'S COMING IN {roundLabel.toUpperCase()}</h2>
        <p style={{ fontSize: 12, color: C.mute, fontFamily: "'DM Mono', monospace", margin: "4px 0 14px" }}>Matches {previewMatches[0]?.m}–{previewMatches[previewMatches.length - 1]?.m} · How the pool sees the next {previewMatches.length} games</p>

        <p style={pStyle}>
          {unanimous.length > 0 && `${unanimous.length} match${unanimous.length > 1 ? "es have" : " has"} 100% consensus — everyone agrees on the outcome.`}
          {divided.length > 0 && ` ${divided.length} match${divided.length > 1 ? "es are" : " is"} genuinely up for grabs with no clear favourite.`}
          {contrarian.length > 0 && ` And ${contrarian.length} match${contrarian.length > 1 ? "es feature" : " features"} a lone wolf going against the crowd.`}
        </p>

        {unanimous.length > 0 && (<>
          <h3 style={h3Style}>THE POOL AGREES</h3>
          <p style={pStyle}>Everyone picked the same outcome for these matches.</p>
          {unanimous.map((c) => {
            const label = c.maxEntry[0] === "H" ? `${c.mm.h} win` : c.maxEntry[0] === "A" ? `${c.mm.a} win` : "Draw";
            const hasResult = c.actual && c.actual.hg != null;
            const gotRight = hasResult && predOutcome(c.actual) === c.maxEntry[0];
            const gotWrong = hasResult && predOutcome(c.actual) !== c.maxEntry[0];
            return (
              <div key={c.mm.m} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.line}` }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: hasResult ? (gotRight ? C.pitch : C.red) : C.ink, display: "flex", alignItems: "center", justifyContent: "center", color: C.chalk, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                  {hasResult ? (gotRight ? "✓" : "✗") : "M" + c.mm.m}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{c.mm.h} vs {c.mm.a} <span style={{ fontSize: 12, color: C.mute, fontWeight: 400 }}>{c.mm.d}</span></div>
                  <div style={{ fontSize: 12, color: C.mute }}>All {c.total} pick: {label}{c.topScore ? ` · Favourite score: ${c.topScore[0]} (${c.topScore[1]}×)` : ""}</div>
                  {hasResult && <div style={{ fontSize: 12, fontWeight: 600, color: gotRight ? C.pitch : C.red }}>Result: {c.actual.hg}–{c.actual.ag} {gotRight ? "— the pool was right!" : "— surprise!"}</div>}
                </div>
              </div>
            );
          })}
        </>)}

        {divided.length > 0 && (<>
          <h3 style={h3Style}>THE TOSS-UPS</h3>
          <p style={pStyle}>These are the matches splitting the room. No dominant prediction — this is where points will be won and lost.</p>
          {divided.map((c) => (
            <div key={c.mm.m} style={{ padding: "10px 0", borderBottom: `1px solid ${C.line}` }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>{c.mm.h} vs {c.mm.a} <span style={{ fontSize: 12, color: C.mute, fontWeight: 400 }}>M{c.mm.m} · {c.mm.d}</span></div>
              <div style={{ display: "flex", gap: 0, height: 28, borderRadius: 4, overflow: "hidden" }}>
                {c.outcomes.H > 0 && <div style={{ flex: c.outcomes.H, background: C.pitch, display: "flex", alignItems: "center", justifyContent: "center", color: C.chalk, fontSize: 11, fontWeight: 700 }}>{c.mm.h.split(" ")[0]} {c.outcomes.H}</div>}
                {c.outcomes.D > 0 && <div style={{ flex: c.outcomes.D, background: C.sun, display: "flex", alignItems: "center", justifyContent: "center", color: C.chalk, fontSize: 11, fontWeight: 700 }}>Draw {c.outcomes.D}</div>}
                {c.outcomes.A > 0 && <div style={{ flex: c.outcomes.A, background: C.red, display: "flex", alignItems: "center", justifyContent: "center", color: C.chalk, fontSize: 11, fontWeight: 700 }}>{c.mm.a.split(" ")[0]} {c.outcomes.A}</div>}
              </div>
              {c.actual && c.actual.hg != null && <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4, color: C.mute }}>Result: {c.actual.hg}–{c.actual.ag}</div>}
            </div>
          ))}
        </>)}

        {/* All matches overview */}
        <h3 style={h3Style}>FULL {roundLabel.toUpperCase()} — MATCH BY MATCH</h3>
        <p style={pStyle}>Every match with the pool's prediction breakdown. The wider the bar, the stronger the consensus.</p>
        {r2Data.map((d) => {
          const favOutcome = d.maxEntry[0] === "H" ? d.mm.h : d.maxEntry[0] === "A" ? d.mm.a : "Draw";
          const hasResult = d.actual && d.actual.hg != null;
          const poolRight = hasResult && predOutcome(d.actual) === d.maxEntry[0];
          return (
            <div key={d.mm.m} style={{ padding: "8px 0", borderBottom: `1px solid ${C.line}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>M{d.mm.m} {d.mm.h} vs {d.mm.a}</span>
                <span style={{ fontSize: 11, color: C.mute }}>{d.mm.d}</span>
              </div>
              <div style={{ display: "flex", gap: 0, height: 22, borderRadius: 3, overflow: "hidden", marginBottom: 2 }}>
                {d.outcomes.H > 0 && <div style={{ flex: d.outcomes.H, background: C.pitch, display: "flex", alignItems: "center", justifyContent: "center", color: C.chalk, fontSize: 10, fontWeight: 700 }}>{d.outcomes.H}</div>}
                {d.outcomes.D > 0 && <div style={{ flex: d.outcomes.D, background: C.sun, display: "flex", alignItems: "center", justifyContent: "center", color: C.chalk, fontSize: 10, fontWeight: 700 }}>{d.outcomes.D}</div>}
                {d.outcomes.A > 0 && <div style={{ flex: d.outcomes.A, background: C.red, display: "flex", alignItems: "center", justifyContent: "center", color: C.chalk, fontSize: 10, fontWeight: 700 }}>{d.outcomes.A}</div>}
              </div>
              <div style={{ fontSize: 11, color: C.mute }}>
                Favourite: {favOutcome} ({d.consensusPct}%)
                {d.topScore && ` · Most picked score: ${d.topScore[0]} (${d.topScore[1]}×)`}
                {d.loneWolves.length > 0 && <span style={{ color: C.red, fontWeight: 600 }}> · Lone wolf: {d.loneWolves.map((lw) => `${lw.name} (${lw.outcome === "H" ? d.mm.h : lw.outcome === "A" ? d.mm.a : "Draw"})`).join(", ")}</span>}
              </div>
              {hasResult && <div style={{ fontSize: 11, fontWeight: 600, color: poolRight ? C.pitch : C.red }}>Result: {d.actual.hg}–{d.actual.ag}</div>}
            </div>
          );
        })}
      </div>
    );
  }

  function renderKnockoutVision(playerPicks, names) {
    const champPicks = {};
    const champByTeam = {};
    for (const name of names) {
      const champ = (playerPicks[name].advanced?.champ || [])[0] || null;
      champPicks[name] = champ;
      if (champ) champByTeam[champ] = [...(champByTeam[champ] || []), name];
    }
    const champSorted = Object.entries(champByTeam).sort((a, b) => b[1].length - a[1].length);
    const noChamp = names.filter((n) => !champPicks[n]);

    const sfByTeam = {};
    for (const name of names) {
      const sfs = playerPicks[name].advanced?.sf || [];
      for (const t of sfs) sfByTeam[t] = [...(sfByTeam[t] || []), name];
    }
    const sfSorted = Object.entries(sfByTeam).sort((a, b) => b[1].length - a[1].length);

    return (
      <div style={cardStyle}>
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          <span style={tagStyle(C.ink)}>PRE-TOURNAMENT</span>
          <span style={tagStyle(C.pitch)}>KNOCKOUT PICKS</span>
        </div>
        <h2 style={h2Style}>WHERE THE POOL AGREES — AND DOESN'T</h2>
        <p style={{ fontSize: 12, color: C.mute, fontFamily: "'DM Mono', monospace", margin: "4px 0 14px" }}>Champion and semifinal picks across {names.length} players</p>

        <h3 style={h3Style}>THE CHAMPION QUESTION</h3>
        <p style={pStyle}>
          {champSorted.length > 0 && champSorted[0][1].length >= 5
            ? `${champSorted[0][0]} is the runaway favourite to win it all, backed by ${champSorted[0][1].length} of ${names.length} players (${Math.round(100 * champSorted[0][1].length / names.length)}%). That's a lot of eggs in one basket. `
            : "No team dominates the champion picks — the pool is split. "}
          {champSorted.length > 1 && `${champSorted[1][0]} comes in second with ${champSorted[1][1].length} pick${champSorted[1][1].length > 1 ? "s" : ""}.`}
          {noChamp.length > 0 && ` ${noChamp.length} player${noChamp.length > 1 ? "s" : ""} didn't fill out their knockout bracket — ${noChamp.length > 1 ? "they're" : "that's"} leaving up to 21 champion points on the table.`}
          {champSorted.length > 0 && champSorted[champSorted.length - 1][1].length === 1 &&
            ` ${champSorted[champSorted.length - 1][1][0]} is riding solo with ${champSorted[champSorted.length - 1][0]} — if that pays off, nobody else gets those 21 points.`}
        </p>

        <HBar
          data={champSorted.map(([team, pickers]) => ({
            label: team,
            value: pickers.length,
            color: pickers.length >= 5 ? C.pitch : pickers.length >= 3 ? C.ink : C.mute
          }))}
          maxVal={names.length}
          showPct={true}
          total={names.length}
          height={30}
        />
        <div style={{ marginTop: 8 }}>
          {champSorted.map(([team, pickers]) => (
            <div key={team} style={{ fontSize: 12, color: C.mute, marginBottom: 2 }}>
              <span style={{ fontWeight: 700, color: C.ink }}>{team}:</span> {pickers.join(", ")}
            </div>
          ))}
          {noChamp.length > 0 && <div style={{ fontSize: 12, color: C.mute }}><span style={{ fontWeight: 700, color: C.red }}>No pick:</span> {noChamp.join(", ")}</div>}
        </div>

        <h3 style={h3Style}>THE FINAL FOUR — SEMIFINAL PICKS</h3>
        <p style={pStyle}>
          This is where consensus meets chaos. Each player picked 4 teams they think will make the semifinals.
          {sfSorted.length > 0 && ` ${sfSorted[0][0]} leads the pack, appearing in ${sfSorted[0][1].length} of ${names.length} brackets (${Math.round(100 * sfSorted[0][1].length / names.length)}%).`}
          {sfSorted.length > 1 && sfSorted[1][1].length === sfSorted[0][1].length && ` ${sfSorted[1][0]} is right there too at ${sfSorted[1][1].length}.`}
          {sfSorted.filter((s) => s[1].length === 1).length > 0 && ` ${sfSorted.filter((s) => s[1].length === 1).length} team${sfSorted.filter((s) => s[1].length === 1).length > 1 ? "s have" : " has"} just a single believer — that's either genius or delusion.`}
        </p>

        <HBar
          data={sfSorted.map(([team, pickers]) => ({
            label: team,
            value: pickers.length,
            color: pickers.length >= Math.ceil(names.length * 0.5) ? C.pitch : pickers.length >= Math.ceil(names.length * 0.2) ? C.sun : pickers.length >= 2 ? C.ink : C.mute
          }))}
          maxVal={names.length}
          showPct={true}
          total={names.length}
          height={24}
        />
        <div style={{ marginTop: 8 }}>
          {sfSorted.map(([team, pickers]) => (
            <div key={team} style={{ fontSize: 12, color: C.mute, marginBottom: 2 }}>
              <span style={{ fontWeight: 700, color: C.ink }}>{team}:</span> {pickers.join(", ")}
            </div>
          ))}
        </div>

        <h3 style={h3Style}>THE HIVE MIND vs. THE MAVERICKS</h3>
        <p style={pStyle}>
          How much do people's knockout brackets overlap? We compared every pair of semifinal picks.
        </p>
        {(() => {
          const overlaps = [];
          for (let i = 0; i < names.length; i++) {
            const a = new Set(playerPicks[names[i]].advanced?.sf || []);
            let totalOverlap = 0, comparisons = 0;
            for (let j = 0; j < names.length; j++) {
              if (i === j) continue;
              const b = new Set(playerPicks[names[j]].advanced?.sf || []);
              let shared = 0;
              for (const t of a) if (b.has(t)) shared++;
              totalOverlap += shared;
              comparisons++;
            }
            if (a.size > 0) overlaps.push({ name: names[i], avg: comparisons ? totalOverlap / comparisons : 0 });
          }
          overlaps.sort((a, b) => b.avg - a.avg);
          const hiveMind = overlaps.slice(0, 3);
          const mavericks = overlaps.slice(-3).reverse();
          return (
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 8 }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, color: C.pitch }}>Most mainstream brackets</div>
                {hiveMind.map((o) => (
                  <div key={o.name} style={{ fontSize: 13, marginBottom: 2 }}>{o.name} — {o.avg.toFixed(1)} avg shared picks</div>
                ))}
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, color: C.red }}>Most contrarian brackets</div>
                {mavericks.map((o) => (
                  <div key={o.name} style={{ fontSize: 13, marginBottom: 2 }}>{o.name} — {o.avg.toFixed(1)} avg shared picks</div>
                ))}
              </div>
            </div>
          );
        })()}

        <h3 style={h3Style}>FINAL MATCHUP PICKS</h3>
        <p style={pStyle}>
          Every player's predicted final. The two teams they think will play for the trophy.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8, marginTop: 8 }}>
          {names.filter((n) => (playerPicks[n].advanced?.final || []).length >= 2).map((name) => {
            const f = playerPicks[name].advanced?.final || [];
            return (
              <div key={name} style={{ background: C.paper, borderRadius: 6, padding: "10px 14px", border: `1px solid ${C.line}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.mute, marginBottom: 4 }}>{name}</div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{f[0]} <span style={{ color: C.sun }}>vs</span> {f[1]}</div>
                <div style={{ fontSize: 11, color: C.pitch, fontWeight: 600, marginTop: 2 }}>Winner: {(playerPicks[name].advanced?.champ || [])[0] || "?"}</div>
              </div>
            );
          })}
          {names.filter((n) => (playerPicks[n].advanced?.final || []).length < 2).map((name) => (
            <div key={name} style={{ background: C.paper, borderRadius: 6, padding: "10px 14px", border: `1px dashed ${C.line}`, opacity: 0.6 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.mute }}>{name}</div>
              <div style={{ fontSize: 13, color: C.mute, fontStyle: "italic" }}>No final pick</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 14px" }}>
      <Eyebrow>Pool Analytics</Eyebrow>
      <h1 style={{ fontFamily: "Anton, sans-serif", fontWeight: 400, fontSize: 36, lineHeight: 1, margin: "6px 0 4px" }}>THE BREAKDOWN</h1>
      <p style={{ fontSize: 12, color: C.mute, margin: "0 0 24px", fontFamily: "'DM Mono', monospace" }}>Analysis by Claude</p>

      {editions.map((edition, idx) => {
        const isLatest = idx === 0;
        const isExpanded = isLatest || !!expandedEditions[idx];
        const { playerPicks, results: snapResults } = edition.snapshot;
        const names = Object.keys(playerPicks).sort();
        const actualScores = snapResults.scores || {};
        const dateStr = edition.publishedAt ? new Date(edition.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Snapshot";

        return (
          <div key={edition.id || idx}>
            {/* Edition header — collapsible for non-latest */}
            {!isLatest && (
              <div
                onClick={() => toggleEdition(idx)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", background: C.paper, borderRadius: 8, marginBottom: isExpanded ? 16 : 20, cursor: "pointer", border: `1px solid ${C.line}`, userSelect: "none" }}
              >
                <span style={{ fontSize: 18, color: C.ink, fontWeight: 700, transition: "transform 0.2s", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>&#9654;</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "Anton, sans-serif", fontWeight: 400, fontSize: 20, lineHeight: 1.1 }}>{edition.title || "Earlier Analysis"}</div>
                  <div style={{ fontSize: 12, color: C.mute, fontFamily: "'DM Mono', monospace", marginTop: 2 }}>{dateStr}</div>
                </div>
              </div>
            )}

            {isLatest && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: "Anton, sans-serif", fontWeight: 400, fontSize: 22, lineHeight: 1.1, color: C.ink }}>{edition.title || "Latest Analysis"}</div>
                <div style={{ fontSize: 12, color: C.mute, fontFamily: "'DM Mono', monospace", marginTop: 2 }}>{dateStr}</div>
              </div>
            )}

            {isExpanded && (<>
              {(edition.cards || []).map((card, ci) => {
                if (card === "matchday") {
                  const matchRange = edition.matchRange || [1, 24];
                  const roundMatches = MATCHES.filter((mm) => mm.m >= matchRange[0] && mm.m <= matchRange[1]);
                  const roundPlayed = roundMatches.filter((mm) => actualScores[mm.m] && actualScores[mm.m].hg != null);
                  return <React.Fragment key={ci}>{renderMatchdayReport(playerPicks, actualScores, names, roundMatches, roundPlayed, edition.roundLabel || "First round", edition.tagLabel || "MATCHDAY 1-2", edition.headline || "THE CRYSTAL BALL IS CRACKED")}</React.Fragment>;
                }
                if (card === "standings-movement" && idx < editions.length - 1) {
                  return <React.Fragment key={ci}>{renderStandingsMovement(editions[idx + 1], edition, names, edition.movementLabel, edition.movementFrom, edition.movementTo, edition.includeR32)}</React.Fragment>;
                }
                if (card === "knockout-vision") {
                  return <React.Fragment key={ci}>{renderKnockoutVision(playerPicks, names)}</React.Fragment>;
                }
                if (card === "knockout-preview") {
                  return <React.Fragment key={ci}>{renderKnockoutPreview(playerPicks, snapResults, names)}</React.Fragment>;
                }
                if (card === "survivors") {
                  return <React.Fragment key={ci}>{renderSurvivors(playerPicks, snapResults, names, edition.stage)}</React.Fragment>;
                }
                if (card === "broken-brackets") {
                  return <React.Fragment key={ci}>{renderBrokenBrackets(playerPicks, snapResults, names, edition.stage)}</React.Fragment>;
                }
                if (card === "r16-collisions" || card === "collisions") {
                  return <React.Fragment key={ci}>{renderCollisions(playerPicks, snapResults, names, edition.stage, edition.collisionNote)}</React.Fragment>;
                }
                if (card === "qf-question" || card === "question") {
                  return <React.Fragment key={ci}>{renderQuestion(playerPicks, snapResults, names, edition.stage)}</React.Fragment>;
                }
                if (card === "title-race") {
                  return <React.Fragment key={ci}>{renderTitleRace(playerPicks, snapResults, names, edition.stage)}</React.Fragment>;
                }
                if (card === "odds-ends") {
                  return <React.Fragment key={ci}>{renderOddsEnds(playerPicks, snapResults, names, edition.customTidbits, edition.stage)}</React.Fragment>;
                }
                if (card === "scenarios") {
                  return <React.Fragment key={ci}>{renderScenarios(playerPicks, snapResults, names, edition.scenarioTeams || (edition.scenarioTeam ? [edition.scenarioTeam] : ["France"]), edition.stage)}</React.Fragment>;
                }
                if (card === "chaos") {
                  return <React.Fragment key={ci}>{renderChaos(playerPicks, snapResults, names)}</React.Fragment>;
                }
                if (card === "scenario-table") {
                  return <React.Fragment key={ci}>{renderScenarioTable(playerPicks, snapResults, names)}</React.Fragment>;
                }
                if (card === "consensus") {
                  const matchRange = edition.matchRange || [1, 24];
                  const roundMatches = MATCHES.filter((mm) => mm.m >= matchRange[0] && mm.m <= matchRange[1]);
                  return <React.Fragment key={ci}>{renderConsensusCard(playerPicks, actualScores, names, roundMatches, edition.tagLabel || "MATCHDAY 1-2")}</React.Fragment>;
                }
                if (card === "preview") {
                  const previewRange = edition.previewRange || [25, 48];
                  const previewMatches = MATCHES.filter((mm) => mm.m >= previewRange[0] && mm.m <= previewRange[1]);
                  return <React.Fragment key={ci}>{renderPreviewCard(playerPicks, actualScores, names, previewMatches, edition.previewLabel || "Round 2", edition.previewTagLabel || "MATCHDAY 3-4")}</React.Fragment>;
                }
                return null;
              })}
            </>)}
          </div>
        );
      })}

      <div style={{ textAlign: "center", padding: "20px 0 10px", fontSize: 12, color: C.mute }}>
        More analysis coming as the tournament unfolds.
      </div>
    </div>
  );
}

function TieResolver({ label, teams, current, onSet }) {
  const [order, setOrder] = useState(current && current.length === teams.length ? current : []);
  function tap(t) { setOrder((o) => o.includes(t) ? o.filter((x) => x !== t) : [...o, t]); }
  return (
    <div style={{ border: `1.5px solid ${C.red}`, borderRadius: 3, padding: 12, marginBottom: 12 }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        {teams.map((t) => { const pos = order.indexOf(t); const on = pos >= 0;
          return <button key={t} onClick={() => tap(t)} style={{ border: `1.5px solid ${C.ink}`, background: on ? C.ink : C.chalk, color: on ? C.chalk : C.ink, padding: "6px 10px", borderRadius: 2, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{on ? `${pos + 1}. ` : ""}{t}</button>;
        })}
      </div>
      <button onClick={() => onSet(order)} disabled={order.length !== teams.length} style={{ background: order.length === teams.length ? C.pitch : C.line, color: C.chalk, border: "none", borderRadius: 2, padding: "8px 12px", fontWeight: 700, fontSize: 12, cursor: order.length === teams.length ? "pointer" : "default", fontFamily: "inherit" }}>Set order</button>
    </div>
  );
}
