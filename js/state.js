/* ═══════════════════════════════════════
   STATE — localStorage persistence
   ═══════════════════════════════════════ */

const State = (function () {
  const KEY = 'edugamings-state-v1';

  const defaults = {
    totalRoundsPlayed: 0,
    currentSpectrumHue: 210,
    currentPhase: 'cool',
    gameRoundCounts: {
      numbers: 0, colors: 0, shapes: 0,
      puzzle: 0, memory: 0, patterns: 0,
      letters: 0, add: 0
    },
    starsPerGame: {
      numbers: 0, colors: 0, shapes: 0,
      puzzle: 0, memory: 0, patterns: 0,
      letters: 0, add: 0
    },
    totalPlayTime: 0,
    lastSessionDate: '',
    contentRotationIndex: 0
  };

  let data = deepCopy(defaults);

  function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        data = {
          ...deepCopy(defaults),
          ...parsed,
          gameRoundCounts: { ...defaults.gameRoundCounts, ...(parsed.gameRoundCounts || {}) },
          starsPerGame:    { ...defaults.starsPerGame,    ...(parsed.starsPerGame    || {}) }
        };
      }
    } catch (e) {
      data = deepCopy(defaults);
    }

    const today = new Date().toDateString();
    if (data.lastSessionDate && data.lastSessionDate !== today) {
      // New day: advance hue +20°
      data.currentSpectrumHue = ((data.currentSpectrumHue + 20) % 360 + 360) % 360;
    }
    data.lastSessionDate = today;
    save();
    return data;
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) { /* storage full — ignore */ }
  }

  function get(key) {
    return key ? data[key] : data;
  }

  function set(key, value) {
    data[key] = value;
    save();
  }

  function incrementTotal(amount) {
    data.totalRoundsPlayed = (data.totalRoundsPlayed || 0) + (amount || 1);
    save();
  }

  function incrementGameRound(gameId) {
    data.gameRoundCounts[gameId] = (data.gameRoundCounts[gameId] || 0) + 1;
    save();
  }

  function addStar(gameId) {
    data.starsPerGame[gameId] = Math.min((data.starsPerGame[gameId] || 0) + 1, 5);
    save();
  }

  function incrementRotation() {
    data.contentRotationIndex = (data.contentRotationIndex || 0) + 1;
    save();
  }

  function incrementPlayTime(seconds) {
    data.totalPlayTime = (data.totalPlayTime || 0) + seconds;
    save();
  }

  return { load, save, get, set, incrementTotal, incrementGameRound, addStar, incrementRotation, incrementPlayTime };
})();
