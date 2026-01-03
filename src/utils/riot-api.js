const axios = require("axios");

const API_KEY = (process.env.RIOT_API_KEY || "").trim();
const PLATFORM_REGION = (process.env.RIOT_API_REGION || "na1")
  .trim()
  .toLowerCase();
const REGIONAL_REGION =
  (process.env.RIOT_API_REGIONAL || "").trim().toLowerCase() ||
  inferRegionalHost(PLATFORM_REGION);

// Cache for champion data
let championCache = null;

function inferRegionalHost(platform) {
  const p = platform.toLowerCase();
  if (["na1", "br1", "la1", "la2", "oc1"].includes(p)) return "americas";
  if (["euw1", "eun1", "tr1", "ru"].includes(p)) return "europe";
  if (["kr", "jp1"].includes(p)) return "asia";
  if (["sg2", "th2", "ph2", "vn2", "tw2"].includes(p)) return "sea";
  if (["me1"].includes(p)) return "europe"; // closest mapping for MENA
  return "americas"; // safe default
}

function getOpggRegion(platformRegion) {
  const mapping = {
    na1: "na",
    br1: "br",
    la1: "lan",
    la2: "las",
    oc1: "oce",
    euw1: "euw",
    eun1: "eun",
    tr1: "tr",
    ru: "ru",
    kr: "kr",
    jp1: "jp",
    sg2: "sg",
    th2: "sg",
    ph2: "sg",
    vn2: "sg",
    tw2: "sg",
    me1: "eu",
  };
  return mapping[platformRegion] || "na";
}

const platformClient = axios.create({
  baseURL: `https://${PLATFORM_REGION}.api.riotgames.com`,
  headers: { "X-Riot-Token": API_KEY },
});

const regionalClient = axios.create({
  baseURL: `https://${REGIONAL_REGION}.api.riotgames.com`,
  headers: { "X-Riot-Token": API_KEY },
});

/**
 * Get summoner info by name
 * @param {string} summonerName
 * @returns {Promise<{id: string, name: string, level: number, accountId: string, puuid: string}>}
 */
async function getSummoner(summonerName) {
  try {
    const resp = await platformClient.get(
      `/lol/summoner/v4/summoners/by-name/${encodeURIComponent(summonerName)}`
    );
    return resp.data;
  } catch (err) {
    if (err.response?.status === 404) return null;
    throw err;
  }
}

/**
 * Get summoner info via Riot ID (gameName + tagLine). Helpful when by-name calls 403.
 * @param {string} gameName
 * @param {string} tagLine
 * @returns {Promise<{id: string, name: string, level: number, accountId: string, puuid: string}>}
 */
async function getSummonerByRiotId(gameName, tagLine) {
  try {
    const accountResp = await regionalClient.get(
      `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(
        gameName
      )}/${encodeURIComponent(tagLine)}`
    );
    const puuid = accountResp.data?.puuid;
    if (!puuid) return null;
    const summResp = await platformClient.get(
      `/lol/summoner/v4/summoners/by-puuid/${puuid}`
    );
    return summResp.data;
  } catch (err) {
    if (err.response?.status === 404) return null;
    throw err;
  }
}

/**
 * Get ranked stats for a summoner by PUUID
 * @param {string} puuid
 * @returns {Promise<Array<{queueType: string, tier: string, rank: string, leaguePoints: number, wins: number, losses: number}>>}
 */
async function getRankedStats(puuid) {
  try {
    const resp = await platformClient.get(
      `/lol/league/v4/entries/by-puuid/${puuid}`
    );
    return resp.data;
  } catch (err) {
    if (err.response?.status === 404) return [];
    throw err;
  }
}

/**
 * Get current game info
 * @param {string} puuid
 * @returns {Promise<{gameId: number, gameMode: string, gameLength: number, participants: Array}>}
 */
async function getCurrentGame(puuid) {
  try {
    const resp = await platformClient.get(
      `/lol/spectator/v5/active-games/by-summoner/${puuid}`
    );
    return resp.data;
  } catch (err) {
    if (err.response?.status === 404) return null; // not in game
    throw err;
  }
}

/**
 * Get match history
 * @param {string} puuid
 * @param {number} count
 * @returns {Promise<string[]>}
 */
async function getMatchHistory(puuid, count = 5) {
  try {
    const resp = await regionalClient.get(
      `/lol/match/v5/matches/by-puuid/${puuid}/ids`,
      {
        params: { start: 0, count },
      }
    );
    return resp.data;
  } catch (err) {
    if (err.response?.status === 404) return [];
    throw err;
  }
}

/**
 * Get match details
 * @param {string} matchId
 * @returns {Promise<{info: {gameMode: string, gameDuration: number, participants: Array}}>}
 */
async function getMatchDetails(matchId) {
  try {
    const resp = await regionalClient.get(`/lol/match/v5/matches/${matchId}`);
    return resp.data;
  } catch (err) {
    throw err;
  }
}

/**
 * Get champion name by ID from Data Dragon
 * @param {number} championId
 * @returns {Promise<string>}
 */
async function getChampionName(championId) {
  try {
    // Load champion data if not cached
    if (!championCache) {
      const versionResp = await axios.get(
        "https://ddragon.leagueoflegends.com/api/versions.json"
      );
      const latestVersion = versionResp.data[0];

      const champResp = await axios.get(
        `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/champion.json`
      );

      // Build ID to name mapping
      championCache = {};
      for (const [name, data] of Object.entries(champResp.data.data)) {
        championCache[data.key] = data.name;
      }
    }

    return championCache[championId] || `Champion ${championId}`;
  } catch (err) {
    console.error("[getChampionName] Error:", err.message);
    return `Champion ${championId}`;
  }
}

/**
 * Get top champion masteries
 * @param {string} puuid
 * @param {number} count
 * @returns {Promise<Array<{championId: number, championLevel: number, championPoints: number}>>}
 */
async function getTopMasteries(puuid, count = 5) {
  try {
    const resp = await platformClient.get(
      `/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/top`,
      { params: { count } }
    );
    return resp.data;
  } catch (err) {
    if (err.response?.status === 404) return [];
    throw err;
  }
}

/**
 * Get total mastery score
 * @param {string} puuid
 * @returns {Promise<number>}
 */
async function getMasteryScore(puuid) {
  try {
    const resp = await platformClient.get(
      `/lol/champion-mastery/v4/scores/by-puuid/${puuid}`
    );
    return resp.data;
  } catch (err) {
    if (err.response?.status === 404) return 0;
    throw err;
  }
}

/**
 * Get free-to-play champion rotation
 * @returns {Promise<{freeChampionIds: Array<number>}>}
 */
async function getChampionRotation() {
  try {
    const resp = await platformClient.get(
      `/lol/platform/v3/champion-rotations`
    );
    return resp.data;
  } catch (err) {
    if (err.response?.status === 404) return { freeChampionIds: [] };
    throw err;
  }
}

/**
 * Get server status
 * @returns {Promise<{incidents: Array, maintenances: Array}>}
 */
async function getPlatformStatus() {
  try {
    const resp = await platformClient.get(`/lol/status/v4/platform-data`);
    return resp.data;
  } catch (err) {
    throw err;
  }
}

/**
 * Get winrate by champion
 * @param {string} puuid
 * @returns {Promise<Array<{championId: number, wins: number, losses: number, winrate: number}>>}
 */
async function getChampionWinrates(puuid) {
  try {
    const matchIds = await getMatchHistory(puuid, 20);
    const champStats = {};

    for (const matchId of matchIds) {
      const match = await getMatchDetails(matchId);
      const participant = match.info.participants.find(
        (p) => p.puuid === puuid
      );
      if (!participant) continue;

      const champId = participant.championId;
      if (!champStats[champId]) {
        champStats[champId] = { wins: 0, losses: 0 };
      }

      if (participant.win) {
        champStats[champId].wins++;
      } else {
        champStats[champId].losses++;
      }
    }

    return Object.entries(champStats)
      .map(([champId, stats]) => ({
        championId: parseInt(champId),
        wins: stats.wins,
        losses: stats.losses,
        winrate: Math.round((stats.wins / (stats.wins + stats.losses)) * 100),
      }))
      .sort((a, b) => b.wins + b.losses - (a.wins + a.losses));
  } catch (err) {
    console.error("[getChampionWinrates] Error:", err.message);
    return [];
  }
}

/**
 * Get current win/loss streak
 * @param {string} puuid
 * @returns {Promise<{streak: number, isWin: boolean}>>}
 */
async function getWinStreak(puuid) {
  try {
    const matchIds = await getMatchHistory(puuid, 10);
    let streak = 0;
    let isWin = null;

    for (const matchId of matchIds) {
      const match = await getMatchDetails(matchId);
      const participant = match.info.participants.find(
        (p) => p.puuid === puuid
      );
      if (!participant) continue;

      if (isWin === null) {
        isWin = participant.win;
        streak = 1;
      } else if (participant.win === isWin) {
        streak++;
      } else {
        break;
      }
    }

    return { streak, isWin };
  } catch (err) {
    console.error("[getWinStreak] Error:", err.message);
    return { streak: 0, isWin: null };
  }
}

module.exports = {
  getSummoner,
  getSummonerByRiotId,
  getRankedStats,
  getCurrentGame,
  getMatchHistory,
  getMatchDetails,
  getTopMasteries,
  getMasteryScore,
  getChampionName,
  getChampionRotation,
  getPlatformStatus,
  getChampionWinrates,
  getWinStreak,
  getOpggRegion,
};
