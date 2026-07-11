const TOPIC_NAMES = [
  "People and things",
  "Family",
  "Relationships",
  "Visiting people",
  "Socializing",
  "Clothing",
  "Before and after",
  "Everyday life",
  "Transportation",
  "Shopping",
  "The weather",
  "Technology",
  "Crime, the law, and politics",
  "Money",
  "Time",
  "Past and future",
  "Making plans",
  "The senses",
  "Movement and progress",
  "Studying and research",
  "At school",
  "At work",
  "Careers",
  "Business",
  "Numbers and amounts",
  "Success and failure",
  "At home",
  "Chores",
  "Cooking",
  "Food and drink",
  "Free time",
  "Health",
  "Sports and exercise",
  "The arts",
  "Travel",
  "Talking",
  "Reading and writing",
  "Keeping in touch",
  "Thoughts and ideas",
  "Explaining things",
  "Truth and lies",
  "Encouragement",
  "Agreeing and disagreeing",
  "Opinions and arguments",
  "Emotions",
  "Negative emotions",
  "Making decisions",
  "Making mistakes",
  "Accidents and damage",
  "Problems and solutions",
  "Secrets and surprises",
  '"Come," "make," and "do"',
  '"Get" and "set"',
  '"Go"',
  '"Put," "take," and "give"',
  "Exclamations"
];

// ── DOM references ──────────────────────────────────────────────
const startScreen    = document.getElementById("start-screen");
const gameScreen     = document.getElementById("game-screen");
const gameoverScreen = document.getElementById("gameover-screen");

const menuBtn             = document.getElementById("menu-btn");
const menuBtnGameover     = document.getElementById("menu-btn-gameover");
const restartBtn          = document.getElementById("restart-btn");
const checkBtn            = document.getElementById("check-btn");
const skipBtn             = document.getElementById("skip-btn");
const showLetterBtn       = document.getElementById("show-letter-btn");

const progressLabel       = document.getElementById("progress-label");
const correctLabel        = document.getElementById("correct-label");
const wrongLabel          = document.getElementById("wrong-label");
const imageWrapper        = document.getElementById("image-wrapper");
const levelImage          = document.getElementById("level-image");
const sentenceEl          = document.getElementById("sentence");
const letterPanelEl       = document.getElementById("letter-panel");
const feedbackEl          = document.getElementById("feedback");
const statsSummaryEl      = document.getElementById("stats-summary");
const wrongWordsSectionEl = document.getElementById("wrong-words-section");
const wrongWordsListEl    = document.getElementById("wrong-words-list");
const topicListEl         = document.getElementById("topic-list");

// ── State ───────────────────────────────────────────────────────
let allTopicsData = [];
let currentTopic  = null;
let order         = [];
let currentIndex  = 0;
let correctCount  = 0;
let wrongCount    = 0;
let wrongWords    = [];
let attempts      = 0;
let mode          = "normal";
let busy          = false;
let learnRevealed = false;
let activePartIdx = 0;

// Per-level answer state (arrays to support multiple blanks)
let answerSlots     = []; // [{el: span, expected: string}]
let userAnswerParts = []; // [string]
let tileSets        = []; // [[{char, el, used}]] — one array per blank

// ── Helpers ─────────────────────────────────────────────────────
function shuffle(array) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getSelectedMode() {
  const radio = document.querySelector('input[name="mode"]:checked');
  return radio ? radio.value : "normal";
}

function showScreen(screen) {
  [startScreen, gameScreen, gameoverScreen].forEach(s => s.classList.add("hidden"));
  screen.classList.remove("hidden");
}

// ── Topic menu ──────────────────────────────────────────────────
function buildTopicMenu() {
  topicListEl.innerHTML = "";
  const topicMap = {};
  allTopicsData.forEach(t => { topicMap[t.id] = t; });

  TOPIC_NAMES.forEach((name, i) => {
    const id = i + 1;
    const topicData = topicMap[id];
    const hasLevels = topicData && topicData.levels && topicData.levels.length > 0;

    const btn = document.createElement("button");
    btn.className = "topic-btn" + (hasLevels ? "" : " topic-btn-locked");
    btn.disabled = !hasLevels;
    btn.innerHTML = `<span class="topic-num">${id}</span><span class="topic-name">${name}</span>`;
    if (hasLevels) {
      btn.addEventListener("click", () => startGame(topicData, getSelectedMode()));
    }
    topicListEl.appendChild(btn);
  });
}

// ── Stats display ────────────────────────────────────────────────
function updateStatsDisplay() {
  const total = order.length;
  const pos = (currentIndex % total) + 1;
  progressLabel.textContent = pos + "/" + total;

  if (mode === "learn") {
    correctLabel.textContent = "";
    wrongLabel.textContent   = "";
  } else {
    correctLabel.textContent  = "✓ " + correctCount;
    wrongLabel.textContent    = "✗ " + wrongCount;
  }
}

// ── Game flow ───────────────────────────────────────────────────
function startGame(topicData, selectedMode) {
  currentTopic = topicData;
  mode         = selectedMode || "normal";
  correctCount = 0;
  wrongCount   = 0;
  wrongWords   = [];
  currentIndex = 0;
  order        = shuffle(topicData.levels);
  showScreen(gameScreen);
  loadLevel();
}

function finishGame() {
  statsSummaryEl.innerHTML =
    `<p>Completed: <strong>${order.length}</strong></p>` +
    `<p>Correct: <strong>${correctCount}</strong></p>` +
    `<p>Incorrect: <strong>${wrongCount}</strong></p>`;

  if (wrongWords.length > 0) {
    wrongWordsListEl.innerHTML = wrongWords.map(w => `<li>${w}</li>`).join("");
    wrongWordsSectionEl.classList.remove("hidden");
  } else {
    wrongWordsSectionEl.classList.add("hidden");
  }
  showScreen(gameoverScreen);
}

// ── Answer slots ────────────────────────────────────────────────
function updateSlotDisplay(partIdx) {
  if (answerSlots[partIdx]) {
    answerSlots[partIdx].el.textContent = userAnswerParts[partIdx] || "···";
  }
}

function updateActiveSlot() {
  answerSlots.forEach((slot, i) => {
    slot.el.classList.toggle("active-slot", i === activePartIdx);
  });
}

function allSlotsCorrect(level) {
  const answers = Array.isArray(level.answer) ? level.answer : [level.answer];
  return answers.every((ans, i) =>
    (userAnswerParts[i] || "").trim().toLowerCase() === ans.trim().toLowerCase()
  );
}

// ── Letter tiles ────────────────────────────────────────────────
function buildLetterTiles(answers) {
  letterPanelEl.innerHTML = "";
  tileSets = [];
  userAnswerParts = answers.map(() => "");

  answers.forEach((answer, partIdx) => {
    if (partIdx > 0) {
      const sep = document.createElement("div");
      sep.className = "tile-separator";
      letterPanelEl.appendChild(sep);
    }

    const row = document.createElement("div");
    row.className = "tile-row";

    const chars = shuffle(answer.split("").map((char, i) => ({ char, i })));
    const tiles = [];

    chars.forEach(({ char }) => {
      const isSpace = char === " ";
      const tile = document.createElement("button");
      tile.className = "letter-tile" + (isSpace ? " tile-space" : "");
      tile.textContent = isSpace ? "·" : char;

      const tileData = { char, el: tile, used: false };
      tiles.push(tileData);

      tile.addEventListener("click", () => {
        if (tileData.used || busy) return;
        tileData.used = true;
        tile.classList.add("used");
        userAnswerParts[partIdx] += char;
        updateSlotDisplay(partIdx);
      });

      row.appendChild(tile);
    });

    // Backspace for this blank
    const backBtn = document.createElement("button");
    backBtn.className = "tile-backspace";
    backBtn.textContent = "⌫";
    backBtn.addEventListener("click", () => {
      const current = userAnswerParts[partIdx];
      if (!current.length || busy) return;
      const lastChar = current[current.length - 1];
      userAnswerParts[partIdx] = current.slice(0, -1);
      for (let i = tiles.length - 1; i >= 0; i--) {
        if (tiles[i].used && tiles[i].char === lastChar) {
          tiles[i].used = false;
          tiles[i].el.classList.remove("used");
          break;
        }
      }
      updateSlotDisplay(partIdx);
    });
    row.appendChild(backBtn);

    tileSets.push(tiles);
    letterPanelEl.appendChild(row);
  });
}

function resetTiles() {
  tileSets.forEach((tiles, partIdx) => {
    userAnswerParts[partIdx] = "";
    tiles.forEach(t => {
      t.used = false;
      t.el.classList.remove("used");
    });
    updateSlotDisplay(partIdx);
  });
}

function lockTiles() {
  tileSets.forEach(tiles => {
    tiles.forEach(t => { t.el.style.pointerEvents = "none"; });
  });
}

// ── Skip level ───────────────────────────────────────────────────
function skipLevel() {
  if (busy) return;

  const level = order[currentIndex % order.length];
  const answers = Array.isArray(level.answer) ? level.answer : [level.answer];

  answers.forEach((ans, i) => {
    userAnswerParts[i] = ans;
    updateSlotDisplay(i);
    answerSlots[i].el.classList.remove("incorrect");
    answerSlots[i].el.classList.add("correct");
  });
  lockTiles();
  feedbackEl.className = "feedback feedback-correct";
  feedbackEl.textContent = level.phrasal_verb + " — " + level.hint;

  wrongCount++;
  if (!wrongWords.includes(level.phrasal_verb)) {
    wrongWords.push(level.phrasal_verb);
  }
  updateStatsDisplay();

  busy = true;
  setTimeout(() => {
    currentIndex++;
    if (currentIndex >= order.length) {
      finishGame();
    } else {
      loadLevel();
    }
  }, 5000);
}

// ── Image preloading ─────────────────────────────────────────────
function preloadNext() {
  const nextIdx = currentIndex + 1;
  if (nextIdx < order.length) {
    const img = new Image();
    img.src = order[nextIdx].image;
  }
}

// ── Load level ──────────────────────────────────────────────────
function loadLevel() {
  busy = false;
  attempts = 0;
  learnRevealed = false;
  feedbackEl.textContent = "";
  feedbackEl.className = "feedback";

  const level = order[currentIndex % order.length];

  imageWrapper.classList.add("loading");
  levelImage.onload = () => {
    imageWrapper.classList.remove("loading");
    preloadNext();
  };
  levelImage.onerror = () => imageWrapper.classList.remove("loading");
  levelImage.src = level.image;
  if (levelImage.complete) {
    imageWrapper.classList.remove("loading");
    preloadNext();
  }

  levelImage.alt = level.phrasal_verb;

  const answers = Array.isArray(level.answer) ? level.answer : [level.answer];

  sentenceEl.innerHTML = "";
  answerSlots = [];
  const parts = level.sentence.split("___");

  parts.forEach((part, i) => {
    sentenceEl.appendChild(document.createTextNode(part));
    if (i < parts.length - 1) {
      const slot = document.createElement("span");
      slot.className = "answer-slot";
      slot.textContent = "···";
      answerSlots.push({ el: slot, expected: answers[i] || "" });
      sentenceEl.appendChild(slot);
    }
  });

  buildLetterTiles(answers);

  activePartIdx = 0;
  updateActiveSlot();

  checkBtn.textContent = mode === "learn" ? "Show Answer" : "Check";
  skipBtn.classList.toggle("hidden", mode === "learn");
  showLetterBtn.classList.toggle("hidden", mode !== "learn");
  updateStatsDisplay();
}

// ── Check answer ────────────────────────────────────────────────
function checkAnswer() {
  if (busy) return;

  const level = order[currentIndex % order.length];

  // ── Learn mode ──
  if (mode === "learn") {
    if (!learnRevealed) {
      const answers = Array.isArray(level.answer) ? level.answer : [level.answer];
      answers.forEach((ans, i) => {
        userAnswerParts[i] = ans;
        updateSlotDisplay(i);
        answerSlots[i].el.classList.add("correct");
      });
      lockTiles();
      feedbackEl.className = "feedback feedback-correct";
      feedbackEl.textContent = level.phrasal_verb + " — " + level.hint;
      const isLast = currentIndex + 1 >= order.length;
      checkBtn.textContent = isLast ? "Finish" : "Next →";
      learnRevealed = true;
      showLetterBtn.classList.add("hidden");
    } else {
      if (currentIndex + 1 >= order.length) {
        showScreen(startScreen);
      } else {
        currentIndex++;
        loadLevel();
      }
    }
    return;
  }

  // ── Play (normal) mode ──
  if (!allSlotsCorrect(level)) {
    attempts++;
    answerSlots.forEach(slot => slot.el.classList.add("incorrect"));
    feedbackEl.className = "feedback feedback-wrong";

    if (attempts === 1) {
      // 1st wrong — shake + show hint
      feedbackEl.textContent = level.hint;
      busy = true;
      setTimeout(() => {
        answerSlots.forEach(slot => slot.el.classList.remove("incorrect"));
        resetTiles();
        busy = false;
      }, 1500);

    } else if (attempts === 2) {
      // 2nd wrong — auto-fill first letter of each blank
      feedbackEl.textContent = level.hint;
      const answers = Array.isArray(level.answer) ? level.answer : [level.answer];
      answers.forEach((ans, i) => {
        const firstChar = ans[0];
        userAnswerParts[i] = firstChar;
        updateSlotDisplay(i);
        for (let j = 0; j < tileSets[i].length; j++) {
          if (!tileSets[i][j].used && tileSets[i][j].char === firstChar) {
            tileSets[i][j].used = true;
            tileSets[i][j].el.classList.add("used");
            break;
          }
        }
      });
      answerSlots.forEach(slot => slot.el.classList.remove("incorrect"));
      busy = false;

    } else {
      // 4th wrong — auto-fill all, show answer, freeze 5s, then next level
      const answers = Array.isArray(level.answer) ? level.answer : [level.answer];
      answers.forEach((ans, i) => {
        userAnswerParts[i] = ans;
        updateSlotDisplay(i);
        answerSlots[i].el.classList.remove("incorrect");
        answerSlots[i].el.classList.add("correct");
      });
      lockTiles();
      feedbackEl.className = "feedback feedback-correct";
      feedbackEl.textContent = level.phrasal_verb + " — " + level.hint;
      wrongCount++;
      if (!wrongWords.includes(level.phrasal_verb)) {
        wrongWords.push(level.phrasal_verb);
      }
      updateStatsDisplay();
      busy = true;
      setTimeout(() => {
        currentIndex++;
        if (currentIndex >= order.length) {
          finishGame();
        } else {
          loadLevel();
        }
      }, 5000);
    }
    return;
  }

  // Correct!
  busy = true;
  answerSlots.forEach(slot => {
    slot.el.classList.remove("incorrect");
    slot.el.classList.add("correct");
  });
  lockTiles();
  feedbackEl.className = "feedback feedback-correct";
  feedbackEl.textContent = level.phrasal_verb + " — " + level.hint;
  correctCount++;
  updateStatsDisplay();

  setTimeout(() => {
    currentIndex++;
    if (currentIndex >= order.length) {
      finishGame();
    } else {
      loadLevel();
    }
  }, 1800);
}

// ── Data loading ────────────────────────────────────────────────
async function loadLevels() {
  try {
    const response = await fetch("levels.json");
    if (!response.ok) throw new Error("Bad response");
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error("Empty");
    allTopicsData = data;
  } catch (err) {
    allTopicsData = [];
  }
  buildTopicMenu();
}

// ── Show next letter (Learn mode) ───────────────────────────────
function showNextLetter() {
  if (busy || learnRevealed) return;

  const level = order[currentIndex % order.length];
  const answers = Array.isArray(level.answer) ? level.answer : [level.answer];

  for (let i = 0; i < answers.length; i++) {
    const current = userAnswerParts[i] || "";
    if (current.length < answers[i].length) {
      const nextChar = answers[i][current.length];
      const tiles = tileSets[i];
      for (let j = 0; j < tiles.length; j++) {
        if (!tiles[j].used && tiles[j].char === nextChar) {
          tiles[j].used = true;
          tiles[j].el.classList.add("used");
          break;
        }
      }
      userAnswerParts[i] = current + nextChar;
      updateSlotDisplay(i);
      activePartIdx = i;
      updateActiveSlot();

      const allComplete = answers.every((ans, idx) =>
        (userAnswerParts[idx] || "").length === ans.length
      );
      if (allComplete) {
        answers.forEach((ans, idx) => {
          answerSlots[idx].el.classList.add("correct");
        });
        lockTiles();
        feedbackEl.className = "feedback feedback-correct";
        feedbackEl.textContent = level.phrasal_verb + " — " + level.hint;
        const isLast = currentIndex + 1 >= order.length;
        checkBtn.textContent = isLast ? "Finish" : "Next →";
        learnRevealed = true;
        showLetterBtn.classList.add("hidden");
      }
      return;
    }
  }
}

// ── Keyboard input ───────────────────────────────────────────────
document.addEventListener("keydown", e => {
  if (gameScreen.classList.contains("hidden")) return;

  if (e.key === "Enter") {
    e.preventDefault();
    checkAnswer();
    return;
  }

  if (busy) return;

  if (e.key === "Tab") {
    e.preventDefault();
    if (tileSets.length > 1) {
      activePartIdx = (activePartIdx + 1) % tileSets.length;
      updateActiveSlot();
    }
    return;
  }

  if (e.key === "Backspace") {
    e.preventDefault();
    const current = userAnswerParts[activePartIdx];
    if (!current.length) return;
    const lastChar = current[current.length - 1];
    userAnswerParts[activePartIdx] = current.slice(0, -1);
    const tiles = tileSets[activePartIdx];
    for (let i = tiles.length - 1; i >= 0; i--) {
      if (tiles[i].used && tiles[i].char === lastChar) {
        tiles[i].used = false;
        tiles[i].el.classList.remove("used");
        break;
      }
    }
    updateSlotDisplay(activePartIdx);
    return;
  }

  if (/^[a-zA-Z ]$/.test(e.key)) {
    e.preventDefault();
    const char = e.key.toLowerCase();
    const tiles = tileSets[activePartIdx];
    if (!tiles) return;
    const tile = tiles.find(t => !t.used && t.char === char);
    if (!tile) return;
    tile.used = true;
    tile.el.classList.add("used");
    userAnswerParts[activePartIdx] += char;
    updateSlotDisplay(activePartIdx);
    // Auto-advance to next blank when current is full
    if (userAnswerParts[activePartIdx].length === tiles.length && activePartIdx < tileSets.length - 1) {
      activePartIdx++;
      updateActiveSlot();
    }
  }
});

// ── Event listeners ─────────────────────────────────────────────
menuBtn.addEventListener("click", () => showScreen(startScreen));
menuBtnGameover.addEventListener("click", () => showScreen(startScreen));
restartBtn.addEventListener("click", () => startGame(currentTopic, mode));
checkBtn.addEventListener("click", checkAnswer);
skipBtn.addEventListener("click", skipLevel);
showLetterBtn.addEventListener("click", showNextLetter);

loadLevels();
