const STORAGE_KEY = "bolao-copa-2026-v1";
const ADMIN_PIN = "2026";
let adminUnlocked = sessionStorage.getItem("bolao-admin-unlocked") === "true";

const GROUPS = {
  A: ["Mexico", "Africa do Sul", "Coreia do Sul", "Tchequia"],
  B: ["Canada", "Bosnia e Herzegovina", "Qatar", "Suica"],
  C: ["Brasil", "Marrocos", "Haiti", "Escocia"],
  D: ["Estados Unidos", "Paraguai", "Australia", "Turquia"],
  E: ["Alemanha", "Curacao", "Costa do Marfim", "Equador"],
  F: ["Paises Baixos", "Japao", "Suecia", "Tunisia"],
  G: ["Belgica", "Egito", "Ira", "Nova Zelandia"],
  H: ["Espanha", "Cabo Verde", "Arabia Saudita", "Uruguai"],
  I: ["Franca", "Senegal", "Israel", "Noruega"],
  J: ["Argentina", "Argelia", "Austria", "Jordania"],
  K: ["Portugal", "RD Congo", "Uzbequistao", "Colombia"],
  L: ["Inglaterra", "Croacia", "Gana", "Panama"],
};

const TEAM_FLAGS = {
  "Africa do Sul": "za",
  Alemanha: "de",
  Argelia: "dz",
  Argentina: "ar",
  Arabia: "sa",
  "Arabia Saudita": "sa",
  Australia: "au",
  Austria: "at",
  Belgica: "be",
  "Bosnia e Herzegovina": "ba",
  Brasil: "br",
  Canada: "ca",
  "Cabo Verde": "cv",
  Colombia: "co",
  "Coreia do Sul": "kr",
  "Costa do Marfim": "ci",
  Croacia: "hr",
  Curacao: "cw",
  Egito: "eg",
  Equador: "ec",
  Escocia: "gb-sct",
  Espanha: "es",
  "Estados Unidos": "us",
  Franca: "fr",
  Gana: "gh",
  Haiti: "ht",
  Inglaterra: "gb-eng",
  Ira: "ir",
  Israel: "il",
  Japao: "jp",
  Jordania: "jo",
  Marrocos: "ma",
  Mexico: "mx",
  Noruega: "no",
  "Nova Zelandia": "nz",
  Paises: "nl",
  "Paises Baixos": "nl",
  Panama: "pa",
  Paraguai: "py",
  Portugal: "pt",
  Qatar: "qa",
  "RD Congo": "cd",
  Senegal: "sn",
  Suecia: "se",
  Suica: "ch",
  Tchequia: "cz",
  Tunisia: "tn",
  Turquia: "tr",
  Uruguai: "uy",
  Uzbequistao: "uz",
};

const ROUND_NAMES = ["32 avos", "Oitavas", "Quartas", "Semifinais", "Final"];
const THIRD_PLACE_ROUND = "Disputa do 3o lugar";
const GROUP_MATCHES = Object.entries(GROUPS).flatMap(([group, teams]) => {
  const pairings = [
    [0, 1],
    [2, 3],
    [0, 2],
    [3, 1],
    [3, 0],
    [1, 2],
  ];
  return pairings.map(([a, b], index) => ({
    id: `${group}${index + 1}`,
    group,
    a: teams[a],
    b: teams[b],
  }));
});

const AVAILABLE_GROUP_RESULTS = [
  { id: "I4", a: 3, b: 2, label: "Noruega 3 x 2 Senegal" },
  { id: "J3", a: 2, b: 0, label: "Argentina 2 x 0 Austria" },
  { id: "J4", a: 1, b: 2, label: "Jordania 1 x 2 Argelia" },
  { id: "K1", a: 1, b: 1, label: "Portugal 1 x 1 RD Congo" },
  { id: "K3", a: 5, b: 0, label: "Portugal 5 x 0 Uzbequistao" },
  { id: "L1", a: 4, b: 2, label: "Inglaterra 4 x 2 Croacia" },
  { id: "L3", a: 0, b: 0, label: "Inglaterra 0 x 0 Gana" },
  { id: "L4", a: 0, b: 1, label: "Panama 0 x 1 Croacia" },
];

const state = loadState();

function loadState() {
  const fallback = { players: [], activePlayerId: "", results: blankEntry() };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return migrateState(saved ? { ...fallback, ...saved } : fallback);
  } catch {
    return fallback;
  }
}

function migrateState(savedState) {
  const replacements = { Suriname: "Israel", Jamaica: "RD Congo" };
  const replaceTeam = (team) => replacements[team] || team;
  const migrateEntry = (entry) => {
    if (!entry) return;
    entry.bracket?.flat()?.forEach((match) => {
      match.a = replaceTeam(match.a);
      match.b = replaceTeam(match.b);
    });
    entry.thirdPlace?.forEach((match) => {
      match.a = replaceTeam(match.a);
      match.b = replaceTeam(match.b);
    });
    Object.keys(entry.placements || {}).forEach((key) => {
      entry.placements[key] = replaceTeam(entry.placements[key]);
    });
  };

  savedState.results ||= blankEntry();
  migrateEntry(savedState.results);
  savedState.players?.forEach((player) => migrateEntry(player.bet));
  applyAvailableResults(savedState.results, false);
  return savedState;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function blankEntry() {
  return {
    groupScores: {},
    bracket: [],
    thirdPlace: [],
    placements: { champion: "", runnerUp: "", third: "", fourth: "" },
  };
}

function activePlayer() {
  return state.players.find((player) => player.id === state.activePlayerId);
}

function activeBet() {
  const player = activePlayer();
  if (!player) return null;
  player.bet ||= blankEntry();
  player.bet.groupScores ||= {};
  player.bet.bracket ||= [];
  player.bet.thirdPlace ||= [];
  player.bet.placements ||= { champion: "", runnerUp: "", third: "", fourth: "" };
  return player.bet;
}

function byId(id) {
  return document.getElementById(id);
}

function scoreValue(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function scoreKey(matchId, side) {
  return `${matchId}-${side}`;
}

function matchWinner(match, scores) {
  const a = scores?.[scoreKey(match.id, "a")];
  const b = scores?.[scoreKey(match.id, "b")];
  if (a === undefined || b === undefined || a === null || b === null || a === b) return "";
  return a > b ? match.a : match.b;
}

function matchLoser(match, scores) {
  const winner = matchWinner(match, scores);
  if (!winner) return "";
  return winner === match.a ? match.b : match.a;
}

function renderAll() {
  renderPlayers();
  renderBetArea();
  renderResultsArea();
  renderLeaderboard();
  renderAdmin();
  renderHeroFlags();
  renderSelectionPassport();
}

function renderPlayers() {
  const list = byId("playersList");
  const select = byId("activePlayer");
  list.innerHTML = "";
  select.innerHTML = "";

  if (!state.players.length) {
    list.classList.add("empty-state");
    list.textContent = "Nenhum jogador cadastrado ainda.";
    select.innerHTML = '<option value="">Cadastre um jogador</option>';
    return;
  }

  list.classList.remove("empty-state");
  state.players.forEach((player) => {
    const row = document.createElement("div");
    row.className = "player-row";
    row.innerHTML = `<strong>${escapeHtml(player.name)}</strong>`;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ghost";
    button.textContent = player.id === state.activePlayerId ? "Ativo" : "Usar";
    button.addEventListener("click", () => {
      state.activePlayerId = player.id;
      saveState();
      renderAll();
    });
    row.appendChild(button);
    list.appendChild(row);

    const option = document.createElement("option");
    option.value = player.id;
    option.textContent = player.name;
    option.selected = player.id === state.activePlayerId;
    select.appendChild(option);
  });
}

function renderBetArea() {
  const bet = activeBet();
  byId("noPlayerBet").classList.toggle("hidden", Boolean(bet));
  byId("betArea").classList.toggle("hidden", !bet);
  if (!bet) return;

  renderGroupGrid(byId("groupBetGrid"), bet.groupScores, "bet");
  renderBracket(byId("bracketBet"), bet, "bet");
  populatePlacements("bet", bet);
}

function renderResultsArea() {
  state.results ||= blankEntry();
  renderGroupGrid(byId("groupResultGrid"), state.results.groupScores, "result");
  renderBracket(byId("bracketResults"), state.results, "result");
  populatePlacements("result", state.results);
  syncResultAdminAccess();
}

function renderGroupGrid(container, scores, scope) {
  container.innerHTML = "";
  Object.keys(GROUPS).forEach((group) => {
    const card = document.createElement("article");
    card.className = "group-card";
    card.innerHTML = `<header>Grupo ${group}</header><div class="matches"></div>`;
    const matchesWrap = card.querySelector(".matches");
    GROUP_MATCHES.filter((match) => match.group === group).forEach((match) => {
      matchesWrap.appendChild(createMatchRow(match, scores, `${scope}-group`));
    });
    card.appendChild(createStandingsTable(groupStandings(group, scores)));
    container.appendChild(card);
  });
}

function createMatchRow(match, scores, scope) {
  const row = document.importNode(byId("matchTemplate").content, true).querySelector(".match-row");
  row.dataset.matchId = match.id;
  row.dataset.scope = scope;
  row.querySelector(".team-a").innerHTML = teamMarkup(match.a, true);
  row.querySelector(".team-b").innerHTML = teamMarkup(match.b);
  const inputA = row.querySelector(".score-a");
  const inputB = row.querySelector(".score-b");
  inputA.value = scores?.[scoreKey(match.id, "a")] ?? "";
  inputB.value = scores?.[scoreKey(match.id, "b")] ?? "";
  inputA.addEventListener("change", handleScoreInput);
  inputB.addEventListener("change", handleScoreInput);
  return row;
}

function handleScoreInput(event) {
  const row = event.target.closest(".match-row");
  if (row.dataset.scope.startsWith("result") && !adminUnlocked) {
    event.target.value = "";
    toast("Entre como administrador para alterar resultados.");
    renderResultsArea();
    return;
  }
  const entry = entryFromScope(row.dataset.scope);
  const side = event.target.classList.contains("score-a") ? "a" : "b";
  entry.groupScores ||= {};
  if (row.dataset.scope.includes("bracket")) {
    updateBracketScore(row, entry, side, scoreValue(event.target.value));
  } else {
    entry.groupScores[scoreKey(row.dataset.matchId, side)] = scoreValue(event.target.value);
  }
  saveState();
  refreshScope(row.dataset.scope);
}

function updateBracketScore(row, entry, side, value) {
  const roundIndex = Number(row.dataset.roundIndex);
  const matchIndex = Number(row.dataset.matchIndex);
  const source = row.dataset.thirdPlace === "true" ? entry.thirdPlace : entry.bracket?.[roundIndex];
  if (!source?.[matchIndex]) return;
  source[matchIndex].scores ||= {};
  source[matchIndex].scores[side] = value;
  rebuildNextRounds(entry);
}

function entryFromScope(scope) {
  if (scope.startsWith("result")) return state.results;
  return activeBet();
}

function refreshScope(scope) {
  if (scope.startsWith("bet")) renderBetArea();
  if (scope.startsWith("result")) renderResultsArea();
  renderLeaderboard();
}

function groupStandings(group, scores) {
  const table = GROUPS[group].map((team) => ({
    team,
    played: 0,
    points: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDiff: 0,
  }));

  GROUP_MATCHES.filter((match) => match.group === group).forEach((match) => {
    const aGoals = scores?.[scoreKey(match.id, "a")];
    const bGoals = scores?.[scoreKey(match.id, "b")];
    if (aGoals === undefined || bGoals === undefined || aGoals === null || bGoals === null) return;
    const a = table.find((team) => team.team === match.a);
    const b = table.find((team) => team.team === match.b);
    a.played += 1;
    b.played += 1;
    a.goalsFor += aGoals;
    a.goalsAgainst += bGoals;
    b.goalsFor += bGoals;
    b.goalsAgainst += aGoals;
    if (aGoals > bGoals) a.points += 3;
    else if (bGoals > aGoals) b.points += 3;
    else {
      a.points += 1;
      b.points += 1;
    }
  });

  table.forEach((team) => {
    team.goalDiff = team.goalsFor - team.goalsAgainst;
  });

  return table.sort((a, b) =>
    b.points - a.points ||
    b.goalDiff - a.goalDiff ||
    b.goalsFor - a.goalsFor ||
    a.team.localeCompare(b.team)
  );
}

function createStandingsTable(standings) {
  const table = document.createElement("table");
  table.className = "standings";
  table.innerHTML = `
    <thead><tr><th>Selecao</th><th>Pts</th><th>SG</th><th>GP</th></tr></thead>
    <tbody></tbody>
  `;
  const body = table.querySelector("tbody");
  standings.forEach((item, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${index + 1}. ${teamMarkup(item.team)}</td><td>${item.points}</td><td>${item.goalDiff}</td><td>${item.goalsFor}</td>`;
    body.appendChild(row);
  });
  return table;
}

function qualifiers(scores) {
  const groupTables = Object.keys(GROUPS).map((group) => ({ group, standings: groupStandings(group, scores) }));
  const automatic = groupTables.flatMap(({ group, standings }) =>
    standings.slice(0, 2).map((item, index) => ({ ...item, group, seed: `${index + 1}${group}` }))
  );
  const thirds = groupTables
    .map(({ group, standings }) => ({ ...standings[2], group, seed: `3${group}` }))
    .sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor || a.team.localeCompare(b.team))
    .slice(0, 8);
  return [...automatic, ...thirds];
}

function buildInitialBracket(scores) {
  const teams = qualifiers(scores).map((item) => item.team);
  if (teams.length < 32) return [];
  const seeded = [];
  for (let index = 0; index < 16; index += 1) {
    seeded.push({ id: `r32-${index}`, a: teams[index], b: teams[31 - index], scores: {} });
  }
  return [seeded, [], [], [], []];
}

function rebuildNextRounds(entry) {
  if (!entry.bracket?.length) entry.bracket = buildInitialBracket(entry.groupScores);
  for (let roundIndex = 0; roundIndex < 4; roundIndex += 1) {
    const current = entry.bracket[roundIndex] || [];
    const winners = current.map((match) => bracketWinner(match)).filter(Boolean);
    const next = [];
    for (let index = 0; index < winners.length; index += 2) {
      next.push({
        id: `r${roundIndex + 1}-${Math.floor(index / 2)}`,
        a: winners[index],
        b: winners[index + 1] || "",
        scores: entry.bracket[roundIndex + 1]?.[Math.floor(index / 2)]?.scores || {},
      });
    }
    entry.bracket[roundIndex + 1] = next;
  }

  const semifinalLosers = (entry.bracket[3] || []).map((match) => bracketLoser(match)).filter(Boolean);
  entry.thirdPlace = semifinalLosers.length === 2
    ? [{ id: "third-place", a: semifinalLosers[0], b: semifinalLosers[1], scores: entry.thirdPlace?.[0]?.scores || {} }]
    : [];
}

function bracketWinner(match) {
  const a = match?.scores?.a;
  const b = match?.scores?.b;
  if (!match?.a || !match?.b || a === undefined || b === undefined || a === null || b === null || a === b) return "";
  return a > b ? match.a : match.b;
}

function bracketLoser(match) {
  const winner = bracketWinner(match);
  if (!winner) return "";
  return winner === match.a ? match.b : match.a;
}

function renderBracket(container, entry, scope) {
  if (!entry.bracket?.length) entry.bracket = buildInitialBracket(entry.groupScores);
  rebuildNextRounds(entry);
  container.innerHTML = "";

  entry.bracket.forEach((round, roundIndex) => {
    const card = document.createElement("article");
    card.className = "round-card";
    card.innerHTML = `<header>${ROUND_NAMES[roundIndex]}</header><div class="matches"></div>`;
    const wrap = card.querySelector(".matches");
    if (!round.length) {
      wrap.innerHTML = '<p class="hint">Preencha a fase anterior.</p>';
    }
    round.forEach((match, matchIndex) => {
      wrap.appendChild(createBracketRow(match, entry, scope, roundIndex, matchIndex, false));
    });
    container.appendChild(card);
  });

  const thirdCard = document.createElement("article");
  thirdCard.className = "round-card";
  thirdCard.innerHTML = `<header>${THIRD_PLACE_ROUND}</header><div class="matches"></div>`;
  const thirdWrap = thirdCard.querySelector(".matches");
  if (!entry.thirdPlace?.length) {
    thirdWrap.innerHTML = '<p class="hint">Definido depois das semifinais.</p>';
  } else {
    entry.thirdPlace.forEach((match, matchIndex) => {
      thirdWrap.appendChild(createBracketRow(match, entry, scope, 0, matchIndex, true));
    });
  }
  container.appendChild(thirdCard);
}

function createBracketRow(match, entry, scope, roundIndex, matchIndex, thirdPlace) {
  const fakeScores = {
    [`${match.id}-a`]: match.scores?.a ?? "",
    [`${match.id}-b`]: match.scores?.b ?? "",
  };
  const row = createMatchRow(match, fakeScores, `${scope}-bracket`);
  row.dataset.roundIndex = roundIndex;
  row.dataset.matchIndex = matchIndex;
  row.dataset.thirdPlace = String(thirdPlace);
  row.querySelector(".score-a").value = match.scores?.a ?? "";
  row.querySelector(".score-b").value = match.scores?.b ?? "";
  return row;
}

function populatePlacements(prefix, entry) {
  const allTeams = Object.values(GROUPS).flat().sort((a, b) => a.localeCompare(b));
  const ids = {
    champion: `${prefix}Champion`,
    runnerUp: `${prefix}RunnerUp`,
    third: `${prefix}Third`,
    fourth: `${prefix}Fourth`,
  };

  Object.entries(ids).forEach(([key, id]) => {
    const select = byId(id);
    const current = entry.placements?.[key] || "";
    select.innerHTML = '<option value="">Nao definido</option>';
    allTeams.forEach((team) => {
      const option = document.createElement("option");
      option.value = team;
      option.textContent = team;
      option.selected = current === team;
      select.appendChild(option);
    });
    select.onchange = () => {
      if (prefix === "result" && !adminUnlocked) {
        toast("Entre como administrador para alterar resultados.");
        populatePlacements(prefix, entry);
        return;
      }
      entry.placements[key] = select.value;
      saveState();
      renderLeaderboard();
    };
  });
}

function saveVisibleScores(scope) {
  if (scope === "result" && !adminUnlocked) {
    toast("Entre como administrador para salvar resultados.");
    return;
  }
  const entry = scope === "result" ? state.results : activeBet();
  if (!entry) return;
  document.querySelectorAll(`[data-scope="${scope}-group"]`).forEach((row) => {
    entry.groupScores[scoreKey(row.dataset.matchId, "a")] = scoreValue(row.querySelector(".score-a").value);
    entry.groupScores[scoreKey(row.dataset.matchId, "b")] = scoreValue(row.querySelector(".score-b").value);
  });
  document.querySelectorAll(`[data-scope="${scope}-bracket"]`).forEach((row) => {
    const sideA = scoreValue(row.querySelector(".score-a").value);
    const sideB = scoreValue(row.querySelector(".score-b").value);
    updateBracketScore(row, entry, "a", sideA);
    updateBracketScore(row, entry, "b", sideB);
  });
  saveState();
  renderAll();
  toast(scope === "result" ? "Resultados salvos." : "Palpites salvos.");
}

function syncResultAdminAccess() {
  const panel = byId("results");
  if (!panel) return;
  panel.classList.toggle("admin-locked", !adminUnlocked);
  byId("adminLoginForm").classList.toggle("hidden", adminUnlocked);
  byId("adminLogout").classList.toggle("hidden", !adminUnlocked);
  panel.querySelectorAll("input, select, button").forEach((control) => {
    if (control.closest("#resultAdminGate")) {
      control.disabled = false;
      return;
    }
    control.disabled = !adminUnlocked;
  });
}

function playerScore(player) {
  const bet = player.bet || blankEntry();
  const real = state.results || blankEntry();
  let groupExact = 0;
  let groupWinner = 0;
  let groupDraw = 0;
  let knockout = 0;
  let placements = 0;

  GROUP_MATCHES.forEach((match) => {
    const realA = real.groupScores?.[scoreKey(match.id, "a")];
    const realB = real.groupScores?.[scoreKey(match.id, "b")];
    const betA = bet.groupScores?.[scoreKey(match.id, "a")];
    const betB = bet.groupScores?.[scoreKey(match.id, "b")];
    if ([realA, realB, betA, betB].some((value) => value === undefined || value === null)) return;
    if (realA === betA && realB === betB) groupExact += 5;
    else if (realA === realB && betA === betB) groupDraw += 1;
    else if ((realA > realB && betA > betB) || (realB > realA && betB > betA)) groupWinner += 3;
  });

  real.bracket?.forEach((round, roundIndex) => {
    round.forEach((match, matchIndex) => {
      const realWinner = bracketWinner(match);
      const betWinner = bracketWinner(bet.bracket?.[roundIndex]?.[matchIndex]);
      if (realWinner && betWinner && realWinner === betWinner) knockout += 10;
    });
  });

  real.thirdPlace?.forEach((match, matchIndex) => {
    const realWinner = bracketWinner(match);
    const betWinner = bracketWinner(bet.thirdPlace?.[matchIndex]);
    if (realWinner && betWinner && realWinner === betWinner) knockout += 10;
  });

  const placementPoints = { champion: 50, runnerUp: 40, third: 30, fourth: 20 };
  Object.entries(placementPoints).forEach(([key, points]) => {
    if (real.placements?.[key] && bet.placements?.[key] && real.placements[key] === bet.placements[key]) {
      placements += points;
    }
  });

  return {
    total: groupExact + groupWinner + groupDraw + knockout + placements,
    groupExact,
    groupWinner,
    groupDraw,
    knockout,
    placements,
  };
}

function renderLeaderboard() {
  const container = byId("leaderboardTable");
  container.innerHTML = "";
  if (!state.players.length) {
    container.className = "leaderboard empty-state";
    container.textContent = "Cadastre jogadores para montar a classificacao.";
    return;
  }
  container.className = "leaderboard";
  const rows = state.players
    .map((player) => ({ player, score: playerScore(player) }))
    .sort((a, b) => b.score.total - a.score.total || a.player.name.localeCompare(b.player.name));

  rows.forEach(({ player, score }, index) => {
    const row = document.createElement("div");
    row.className = "leader-row";
    row.innerHTML = `
      <span class="rank">${index + 1}</span>
      <strong>${escapeHtml(player.name)}</strong>
      <span class="metric"><strong>${score.total}</strong>Total</span>
      <span class="metric"><strong>${score.groupExact}</strong>Exatos</span>
      <span class="metric"><strong>${score.groupWinner + score.groupDraw}</strong>Jogos</span>
      <span class="metric"><strong>${score.knockout}</strong>Mata-mata</span>
      <span class="metric"><strong>${score.placements}</strong>Premios</span>
    `;
    container.appendChild(row);
  });
}

function competitionTotals() {
  const scores = state.players.map((player) => playerScore(player));
  return scores.reduce((totals, score) => ({
    total: totals.total + score.total,
    groupExact: totals.groupExact + score.groupExact,
    games: totals.games + score.groupWinner + score.groupDraw,
    knockout: totals.knockout + score.knockout,
    placements: totals.placements + score.placements,
  }), { total: 0, groupExact: 0, games: 0, knockout: 0, placements: 0 });
}

function renderAdmin() {
  const summary = byId("adminSummary");
  const players = byId("adminPlayers");
  if (!summary || !players) return;

  const totals = competitionTotals();
  const leader = state.players
    .map((player) => ({ player, score: playerScore(player) }))
    .sort((a, b) => b.score.total - a.score.total || a.player.name.localeCompare(b.player.name))[0];

  summary.innerHTML = `
    <article class="summary-card"><span>Participantes</span><strong>${state.players.length}</strong></article>
    <article class="summary-card"><span>Soma total dos competidores</span><strong>${totals.total}</strong></article>
    <article class="summary-card"><span>Pontos em jogos</span><strong>${totals.groupExact + totals.games}</strong></article>
    <article class="summary-card"><span>Lider atual</span><strong>${leader ? escapeHtml(leader.player.name) : "-"}</strong></article>
  `;

  players.innerHTML = "";
  if (!state.players.length) {
    players.className = "admin-table empty-state";
    players.textContent = "Nenhum participante cadastrado.";
    return;
  }

  players.className = "admin-table";
  state.players
    .map((player) => ({ player, score: playerScore(player) }))
    .sort((a, b) => b.score.total - a.score.total || a.player.name.localeCompare(b.player.name))
    .forEach(({ player, score }) => {
      const row = document.createElement("div");
      row.className = "admin-row";
      row.innerHTML = `
        <div class="admin-name">
          <strong>${escapeHtml(player.name)}</strong>
          <small>ID: ${escapeHtml(player.id)}</small>
        </div>
        <span class="metric"><strong>${score.total}</strong>Total</span>
        <span class="metric"><strong>${score.groupExact}</strong>Exatos</span>
        <span class="metric"><strong>${score.groupWinner + score.groupDraw}</strong>Jogos</span>
        <span class="metric"><strong>${score.knockout}</strong>Mata-mata</span>
        <span class="metric"><strong>${score.placements}</strong>Premios</span>
      `;

      const actions = document.createElement("div");
      actions.className = "admin-actions";
      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "ghost";
      edit.textContent = "Editar";
      edit.addEventListener("click", () => renamePlayer(player.id));

      const clear = document.createElement("button");
      clear.type = "button";
      clear.className = "ghost";
      clear.textContent = "Zerar palpites";
      clear.addEventListener("click", () => clearPlayerBet(player.id));

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "ghost danger";
      remove.textContent = "Remover";
      remove.addEventListener("click", () => removePlayer(player.id));

      actions.append(edit, clear, remove);
      row.appendChild(actions);
      players.appendChild(row);
    });
}

function renderSelectionPassport() {
  const container = byId("selectionPassport");
  if (!container) return;
  const teams = Object.entries(GROUPS).flatMap(([group, teams]) => teams.map((team) => ({ group, team })));
  container.innerHTML = "";
  teams.forEach(({ group, team }) => {
    const card = document.createElement("article");
    card.className = "selection-card";
    card.innerHTML = `
      <img src="${flagUrl(team, 80)}" alt="Bandeira: ${escapeHtml(team)}" loading="lazy" />
      <div>
        <strong>${escapeHtml(team)}</strong>
        <span>Grupo ${group}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderHeroFlags() {
  const container = byId("heroFlags");
  if (!container || container.dataset.ready === "true") return;
  const teams = Object.values(GROUPS).flat();
  const repeatedTeams = [...teams, ...teams.slice(0, 24)];
  container.innerHTML = "";
  repeatedTeams.forEach((team) => {
    const img = document.createElement("img");
    img.className = "hero-flag";
    img.src = flagUrl(team, 80);
    img.alt = "";
    img.loading = "lazy";
    container.appendChild(img);
  });
  container.dataset.ready = "true";
}

function renamePlayer(playerId) {
  const player = state.players.find((item) => item.id === playerId);
  if (!player) return;
  const nextName = prompt("Novo nome do participante:", player.name)?.trim();
  if (!nextName) return;
  player.name = nextName.slice(0, 40);
  saveState();
  renderAll();
  toast("Participante atualizado.");
}

function clearPlayerBet(playerId) {
  const player = state.players.find((item) => item.id === playerId);
  if (!player || !confirm(`Zerar todos os palpites de ${player.name}?`)) return;
  player.bet = blankEntry();
  saveState();
  renderAll();
  toast("Palpites zerados.");
}

function removePlayer(playerId) {
  const player = state.players.find((item) => item.id === playerId);
  if (!player || !confirm(`Remover ${player.name} do bolao?`)) return;
  state.players = state.players.filter((item) => item.id !== playerId);
  if (state.activePlayerId === playerId) {
    state.activePlayerId = state.players[0]?.id || "";
  }
  saveState();
  renderAll();
  toast("Participante removido.");
}

function fillExample(entry) {
  GROUP_MATCHES.forEach((match, index) => {
    const a = (index + match.a.length) % 4;
    const b = (index + match.b.length + 1) % 3;
    entry.groupScores[scoreKey(match.id, "a")] = a;
    entry.groupScores[scoreKey(match.id, "b")] = b;
  });
  entry.bracket = buildInitialBracket(entry.groupScores);
  entry.thirdPlace = [];
  for (let roundIndex = 0; roundIndex < 5; roundIndex += 1) {
    rebuildNextRounds(entry);
    (entry.bracket[roundIndex] || []).forEach((match, matchIndex) => {
      if (!match.a || !match.b) return;
      match.scores = matchIndex % 2 === 0 ? { a: 2, b: 1 } : { a: 1, b: 2 };
    });
  }
  rebuildNextRounds(entry);
  if (entry.thirdPlace?.[0]) entry.thirdPlace[0].scores = { a: 1, b: 0 };
  const final = entry.bracket[4]?.[0];
  entry.placements = {
    champion: bracketWinner(final),
    runnerUp: bracketLoser(final),
    third: bracketWinner(entry.thirdPlace?.[0]),
    fourth: bracketLoser(entry.thirdPlace?.[0]),
  };
}

function clearEntry(entry) {
  entry.groupScores = {};
  entry.bracket = [];
  entry.thirdPlace = [];
  entry.placements = { champion: "", runnerUp: "", third: "", fourth: "" };
}

function applyAvailableResults(entry, overwrite) {
  entry ||= blankEntry();
  entry.groupScores ||= {};
  AVAILABLE_GROUP_RESULTS.forEach((match) => {
    const keyA = scoreKey(match.id, "a");
    const keyB = scoreKey(match.id, "b");
    if (overwrite || entry.groupScores[keyA] === undefined || entry.groupScores[keyA] === null) {
      entry.groupScores[keyA] = match.a;
    }
    if (overwrite || entry.groupScores[keyB] === undefined || entry.groupScores[keyB] === null) {
      entry.groupScores[keyB] = match.b;
    }
  });
}

function loadAvailableResults() {
  applyAvailableResults(state.results, true);
  state.results.bracket = buildInitialBracket(state.results.groupScores);
  rebuildNextRounds(state.results);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char]));
}

function flagUrl(team, size = 40) {
  const code = TEAM_FLAGS[team];
  return code ? `https://flagcdn.com/w${size}/${code}.png` : `https://flagcdn.com/w${size}/un.png`;
}

function teamMarkup(team, reverse = false) {
  if (!team) return '<span class="team-badge">A definir</span>';
  const img = `<img class="flag" src="${flagUrl(team)}" alt="" loading="lazy" />`;
  const name = `<span>${escapeHtml(team)}</span>`;
  return `<span class="team-badge">${reverse ? `${name}${img}` : `${img}${name}`}</span>`;
}

function toast(message) {
  document.querySelector(".toast")?.remove();
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2400);
}

function bindEvents() {
  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("active"));
      document.querySelectorAll(".panel").forEach((panel) => panel.classList.remove("active"));
      button.classList.add("active");
      byId(button.dataset.tab).classList.add("active");
    });
  });

  byId("playerForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const input = byId("playerName");
    const name = input.value.trim();
    if (!name) return;
    const player = { id: makeId(), name, bet: blankEntry() };
    state.players.push(player);
    state.activePlayerId = player.id;
    input.value = "";
    saveState();
    renderAll();
    toast(`${name} entrou no bolao.`);
  });

  byId("activePlayer").addEventListener("change", (event) => {
    state.activePlayerId = event.target.value;
    saveState();
    renderAll();
  });

  byId("resetData").addEventListener("click", () => {
    if (!confirm("Deseja apagar jogadores, palpites e resultados deste navegador?")) return;
    state.players = [];
    state.activePlayerId = "";
    state.results = blankEntry();
    saveState();
    renderAll();
    toast("Bolao limpo.");
  });

  byId("adminLoginForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const pin = byId("adminPin").value.trim();
    if (pin !== ADMIN_PIN) {
      toast("Senha do administrador incorreta.");
      return;
    }
    adminUnlocked = true;
    sessionStorage.setItem("bolao-admin-unlocked", "true");
    byId("adminPin").value = "";
    syncResultAdminAccess();
    toast("Painel de resultados liberado.");
  });

  byId("adminLogout").addEventListener("click", () => {
    adminUnlocked = false;
    sessionStorage.removeItem("bolao-admin-unlocked");
    syncResultAdminAccess();
    toast("Painel de resultados bloqueado.");
  });

  byId("saveBet").addEventListener("click", () => saveVisibleScores("bet"));
  byId("saveResults").addEventListener("click", () => saveVisibleScores("result"));
  byId("refreshLeaderboard").addEventListener("click", () => {
    renderLeaderboard();
    toast("Classificacao recalculada.");
  });

  byId("refreshAdmin").addEventListener("click", () => {
    renderAdmin();
    toast("Painel do administrador atualizado.");
  });

  byId("buildBracket").addEventListener("click", () => {
    const bet = activeBet();
    if (!bet) return;
    bet.bracket = buildInitialBracket(bet.groupScores);
    rebuildNextRounds(bet);
    saveState();
    renderBetArea();
  });

  byId("buildResultBracket").addEventListener("click", () => {
    if (!adminUnlocked) {
      toast("Entre como administrador para alterar resultados.");
      return;
    }
    state.results.bracket = buildInitialBracket(state.results.groupScores);
    rebuildNextRounds(state.results);
    saveState();
    renderResultsArea();
    renderLeaderboard();
  });

  byId("autoFillBet").addEventListener("click", () => {
    const bet = activeBet();
    if (!bet) return;
    fillExample(bet);
    saveState();
    renderAll();
    toast("Exemplo carregado para o jogador ativo.");
  });

  byId("clearBet").addEventListener("click", () => {
    const bet = activeBet();
    if (!bet || !confirm("Limpar os palpites do jogador ativo?")) return;
    clearEntry(bet);
    saveState();
    renderAll();
  });

  byId("autoFillResults").addEventListener("click", () => {
    if (!adminUnlocked) {
      toast("Entre como administrador para carregar resultados.");
      return;
    }
    loadAvailableResults();
    saveState();
    renderAll();
    toast("Resultados disponiveis carregados.");
  });

  byId("clearResults").addEventListener("click", () => {
    if (!adminUnlocked) {
      toast("Entre como administrador para limpar resultados.");
      return;
    }
    if (!confirm("Limpar todos os resultados reais?")) return;
    clearEntry(state.results);
    saveState();
    renderAll();
  });
}

bindEvents();
renderAll();

function makeId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `player-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
