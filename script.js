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

const menuBtn         = document.getElementById("menu-btn");
const menuBtnGameover = document.getElementById("menu-btn-gameover");
const restartBtn      = document.getElementById("restart-btn");
const checkBtn        = document.getElementById("check-btn");

const scoreLabel    = document.getElementById("score-label");
const imageWrapper  = document.getElementById("image-wrapper");
const levelImage    = document.getElementById("level-image");
const sentenceEl    = document.getElementById("sentence");
const letterPanelEl = document.getElementById("letter-panel");
const feedbackEl    = document.getElementById("feedback");
const resultText    = document.getElementById("result-text");
const topicListEl   = document.getElementById("topic-list");

// ── State ───────────────────────────────────────────────────────
let allTopicsData  = [];
let currentTopic   = null;
let order          = [];
let currentIndex   = 0;
let score          = 0;
let attempts       = 0;
let mode           = "normal";
let busy           = false;
let learnRevealed  = false;

// Per-level answer state (arrays to support multiple blanks)
let answerSlots    = []; // [{el: span, expected: string}]
let userAnswerParts = []; // [string]
let tileSets       = []; // [[{char, el, used}]] — one array per blank

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

// ── Game flow ───────────────────────────────────────────────────
function startGame(topicData, selectedMode) {
  currentTopic = topicData;
  mode = selectedMode || "normal";
  score = 0;
  currentIndex = 0;
  order = shuffle(topicData.levels);
  scoreLabel.textContent = mode === "learn" ? "1/" + order.length : "Score: 0";
  showScreen(gameScreen);
  loadLevel();
}

function updateScoreLabel() {
  scoreLabel.textContent = "Score: " + score;
}

function finishGame(completedAll) {
  if (completedAll) {
    resultText.textContent = "Congratulations! You completed all " + order.length + " levels!";
  } else {
    resultText.textContent = "You scored " + score + " out of " + order.length + ".";
  }
  showScreen(gameoverScreen);
}

// ── Answer slots ────────────────────────────────────────────────
function updateSlotDisplay(partIdx) {
  if (answerSlots[partIdx]) {
    answerSlots[partIdx].el.textContent = userAnswerParts[partIdx] || "···";
  }
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

// ── Load level ──────────────────────────────────────────────────
function loadLevel() {
  busy = false;
  attempts = 0;
  learnRevealed = false;
  feedbackEl.textContent = "";
  feedbackEl.className = "feedback";

  const level = order[currentIndex % order.length];
  levelImage.src = level.image;
  levelImage.alt = level.phrasal_verb;

  // Normalise answer to array
  const answers = Array.isArray(level.answer) ? level.answer : [level.answer];

  // Build sentence with answer slots
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

  checkBtn.textContent = mode === "learn" ? "Show Answer" : "Check";
  if (mode === "learn") {
    scoreLabel.textContent = (currentIndex + 1) + "/" + order.length;
  }
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

  // ── Play / Practice mode ──
  if (!allSlotsCorrect(level)) {
    attempts++;
    answerSlots.forEach(slot => slot.el.classList.add("incorrect"));
    feedbackEl.className = "feedback feedback-wrong";
    feedbackEl.textContent = level.hint;

    if (mode === "practice") {
      busy = true;
      setTimeout(() => {
        answerSlots.forEach(slot => slot.el.classList.remove("incorrect"));
        resetTiles();
        busy = false;
      }, 1500);
      return;
    }

    // Normal mode
    if (attempts >= 2) {
      busy = true;
      const answers = Array.isArray(level.answer) ? level.answer : [level.answer];
      feedbackEl.textContent = "Correct answer: " + answers.join(" … ") + " — " + level.hint;
      setTimeout(() => finishGame(false), 5000);
    } else {
      busy = true;
      setTimeout(() => {
        answerSlots.forEach(slot => slot.el.classList.remove("incorrect"));
        resetTiles();
        busy = false;
      }, 1500);
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
  score++;
  updateScoreLabel();

  setTimeout(() => {
    currentIndex++;
    if (mode === "normal" && currentIndex >= order.length) {
      finishGame(true);
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

// ── Event listeners ─────────────────────────────────────────────
menuBtn.addEventListener("click", () => showScreen(startScreen));
menuBtnGameover.addEventListener("click", () => showScreen(startScreen));
restartBtn.addEventListener("click", () => startGame(currentTopic, mode));
checkBtn.addEventListener("click", checkAnswer);

loadLevels();
