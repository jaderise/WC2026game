import React, { useState, useEffect, useMemo } from "react";
import { db } from "./firebase";
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, onSnapshot } from "firebase/firestore";

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
    const snap = await getDocs(collection(db, "pool"));
    const pfx = docId(prefix);
    return snap.docs.map(d => d.id).filter(id => id.startsWith(pfx)).map(id => id.replaceAll("__", ":"));
  } catch (e) { console.error(e); return []; }
}
async function sDelete(key) {
  try { await deleteDoc(doc(db, "pool", docId(key))); return true; }
  catch (e) { console.error(e); return false; }
}

/* ---------- Live updates via Firestore onSnapshot ---------- */
const LIVE_ENABLED = true;
function liveSubscribe(onChange) {
  return onSnapshot(collection(db, "pool"), () => onChange());
}

const K_RESULTS = NS + "results";
const playerKey = (id) => `${NS}player:${id}`;
const K_PLAYERS = NS + "players";

const emptyResults = () => ({ scores: {}, advanced: { r32: [], r16: [], qf: [], sf: [], final: [], champ: [] }, advancedMeta: {}, manualOrder: {}, manualThird: [], revealed: false, feedAt: null });
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
        const cur = (await sGet(K_RESULTS)) || emptyResults();
        cur.scores = cur.scores || {};
        for (const [mid, sc] of Object.entries(parsed)) {
          const ex = cur.scores[mid];
          if (ex && ex.by && ex.by !== "openfootball") continue;
          if (!ex || ex.hg !== sc.hg || ex.ag !== sc.ag) cur.scores[mid] = { ...sc, by: "openfootball", at: new Date().toISOString() };
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
      {tab === "standings" && <Standings rows={standRows} autoReady={qual.allComplete} />}
      {tab === "league" && <LeaguePicks entries={leagueEntries} revealed={results.revealed} />}
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
  const tabs = [["play", "My Picks"], ["tables", "Group Tables"], ["standings", "Standings"], ["league", "League Picks"], ["updates", "Updates"], ["results", "Results"]];
  return (
    <div style={{ background: C.ink, color: C.chalk, padding: "22px 14px 0" }}>
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
      <div style={{ display: "flex", gap: 2 }}>
        {tabs.map(([k, lbl]) => (
          <button key={k} onClick={() => setTab(k)} style={{ flex: 1, background: tab === k ? C.paper : "transparent", color: tab === k ? C.ink : "#C7D0DE", border: "none", borderTopLeftRadius: 6, borderTopRightRadius: 6, padding: "10px 4px", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>{lbl}</button>
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
      <p style={{ fontSize: 13, color: C.mute, lineHeight: 1.5 }}>Each round below offers only the teams you advanced from the round before it. Narrow your bracket down to a champion.</p>
      {ROUNDS.filter((r) => r.key !== "r32").map((r) => {
        const chosen = new Set(picks.advanced[r.key] || []);
        const pool = poolFor(r.key);
        const prevLabel = { r16: "your Round of 32", qf: "your Round of 16", sf: "your Quarterfinalists", final: "your Semifinalists", champ: "your Finalists" }[r.key];
        return (
          <div key={r.key} style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
              <span style={{ fontFamily: "Anton, sans-serif", fontSize: 20 }}>{r.label.toUpperCase()}</span>
              <span style={{ fontSize: 11.5, color: C.mute, fontFamily: "'DM Mono', monospace" }}>{chosen.size}/{r.count} · {r.pts} pts each</span>
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
      <div style={{ background: results.revealed ? "#EAF4EE" : "#F0EBDD", border: `1px solid ${C.line}`, borderRadius: 3, padding: "10px 12px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 12.5, color: C.ink }}>{results.revealed ? "Everyone's picks are visible in the League Picks tab." : "Picks are secret. Reveal them once everyone has locked in."}</span>
        <button onClick={() => { if (confirmReveal) { onToggleReveal(); setConfirmReveal(false); } else { setConfirmReveal(true); setTimeout(() => setConfirmReveal(false), 4000); } }} style={{ background: results.revealed ? C.red : C.ink, color: C.chalk, border: "none", borderRadius: 2, padding: "7px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>{results.revealed ? (confirmReveal ? "Confirm hide" : "Hide picks") : (confirmReveal ? "Confirm reveal" : "Reveal all picks")}</button>
      </div>
      <div style={{ background: results.editingOpen ? "#FBEAE7" : "#F0EBDD", border: `1.5px solid ${results.editingOpen ? C.red : C.line}`, borderRadius: 3, padding: "10px 12px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 12.5, color: C.ink }}>{results.editingOpen ? "Editing is OPEN — all players can change their picks right now." : "Picks are locked (deadline passed). Open editing temporarily to let players fix their brackets."}</span>
        <button onClick={onToggleEditing} style={{ background: results.editingOpen ? C.red : C.ink, color: C.chalk, border: "none", borderRadius: 2, padding: "7px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>{results.editingOpen ? "Close editing" : "Open editing"}</button>
      </div>
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
          <p style={{ fontSize: 12.5, color: C.mute, lineHeight: 1.5, marginTop: 0 }}>Round of 32 fills automatically from group scores once all groups are complete{qual.allComplete ? " — done ✓" : " (not yet)"}. Enter who reaches the later rounds here as the knockouts play out.</p>
          {ROUNDS.filter((r) => r.key !== "r32").map((r) => {
            const chosen = new Set(results.advanced[r.key] || []); const meta = results.advancedMeta[r.key];
            return (
              <div key={r.key} style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontFamily: "Anton, sans-serif", fontSize: 18 }}>{r.label.toUpperCase()}</span>
                  <span style={{ fontSize: 11, color: C.mute, fontFamily: "'DM Mono', monospace" }}>{chosen.size}/{r.count}{meta ? ` · ${meta.by} ${ago(meta.at)}` : ""}</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {ALL_TEAMS.map((t) => { const on = chosen.has(t); const full = chosen.size >= r.count && !on;
                    return <button key={t} disabled={full} onClick={() => toggleResultAdvance(r.key, t, r.count)} style={{ border: `1.5px solid ${on ? C.ink : C.line}`, background: on ? C.ink : C.chalk, color: on ? C.chalk : (full ? "#B5AE9E" : C.ink), padding: "5px 8px", borderRadius: 2, fontSize: 11.5, fontWeight: 600, cursor: full ? "default" : "pointer", fontFamily: "inherit" }}>{t}</button>;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

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
