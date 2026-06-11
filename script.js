// Fallback data in case levels.json can't be loaded via fetch
// (e.g. when the page is opened directly from disk with file://)
const FALLBACK_LEVELS = [
  { image: "images/building.png", sentence: "John is ___ a birdhouse.", answer: "building" },
  { image: "images/cooking.png", sentence: "John is ___ dinner.", answer: "cooking" },
  { image: "images/planting.png", sentence: "John is ___ a small green plant.", answer: "planting" },
  { image: "images/listening.png", sentence: "John is ___ to music.", answer: "listening" },
  { image: "images/painting.png", sentence: "John is ___ a picture.", answer: "painting" },
  { image: "images/reading.png", sentence: "John is ___ a book.", answer: "reading" },
  { image: "images/running.png", sentence: "John is ___ in the park.", answer: "running" },
  { image: "images/writing.png", sentence: "John is ___ in his notebook.", answer: "writing" }
];

const startScreen = document.getElementById("start-screen");
const gameScreen = document.getElementById("game-screen");
const gameoverScreen = document.getElementById("gameover-screen");

const playBtn = document.getElementById("play-btn");
const practiceBtn = document.getElementById("practice-btn");
const restartBtn = document.getElementById("restart-btn");
const checkBtn = document.getElementById("check-btn");

const modeLabel = document.getElementById("mode-label");
const scoreLabel = document.getElementById("score-label");
const imageWrapper = document.getElementById("image-wrapper");
const levelImage = document.getElementById("level-image");
const sentenceEl = document.getElementById("sentence");
const feedbackEl = document.getElementById("feedback");
const resultText = document.getElementById("result-text");

let allLevels = [];
let order = [];
let currentIndex = 0;
let score = 0;
let attempts = 0;
let mode = "normal"; // "normal" or "practice"
let answerInput = null;
let busy = false; // blocks input while feedback animation is running

function shuffle(array) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function showScreen(screen) {
  [startScreen, gameScreen, gameoverScreen].forEach(s => s.classList.add("hidden"));
  screen.classList.remove("hidden");
}

function startGame(selectedMode) {
  mode = selectedMode;
  score = 0;
  currentIndex = 0;
  order = shuffle(allLevels);
  modeLabel.textContent = mode === "practice" ? "Practice" : "Game";
  updateScoreLabel();
  showScreen(gameScreen);
  loadLevel();
}

function updateScoreLabel() {
  scoreLabel.textContent = "Score: " + score;
}

function loadLevel() {
  busy = false;
  attempts = 0;
  feedbackEl.textContent = "";

  const level = order[currentIndex % order.length];
  levelImage.src = level.image;
  levelImage.alt = "John";

  sentenceEl.innerHTML = "";
  const parts = level.sentence.split("___");

  sentenceEl.appendChild(document.createTextNode(parts[0]));

  answerInput = document.createElement("input");
  answerInput.type = "text";
  answerInput.autocomplete = "off";
  answerInput.autocapitalize = "off";
  answerInput.spellcheck = false;
  answerInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      checkAnswer();
    }
  });
  answerInput.addEventListener("focus", () => {
    imageWrapper.classList.add("focused");
  });
  answerInput.addEventListener("blur", () => {
    imageWrapper.classList.remove("focused");
  });
  sentenceEl.appendChild(answerInput);

  sentenceEl.appendChild(document.createTextNode(parts[1] || ""));

  answerInput.focus();
}

function checkAnswer() {
  if (busy || !answerInput) return;

  const level = order[currentIndex % order.length];
  const userValue = answerInput.value.trim().toLowerCase();
  const correctValue = level.answer.trim().toLowerCase();

  if (userValue === correctValue) {
    busy = true;
    answerInput.classList.remove("incorrect");
    answerInput.classList.add("correct");
    answerInput.disabled = true;
    feedbackEl.style.color = "#1e6e2f";
    feedbackEl.textContent = "Correct!";
    score++;
    updateScoreLabel();

    setTimeout(() => {
      currentIndex++;
      if (mode === "normal" && currentIndex >= order.length) {
        finishGame(true);
      } else {
        loadLevel();
      }
    }, 900);
    return;
  }

  // Wrong answer
  attempts++;
  answerInput.classList.remove("correct");
  answerInput.classList.add("incorrect");
  feedbackEl.style.color = "#e0392c";

  if (mode === "practice") {
    feedbackEl.textContent = "Try again. Hint: starts with \"" + level.answer[0].toUpperCase() + "\"";
    busy = true;
    setTimeout(() => {
      answerInput.classList.remove("incorrect");
      answerInput.value = "";
      answerInput.focus();
      busy = false;
    }, 1200);
    return;
  }

  // Normal mode
  if (attempts >= 2) {
    busy = true;
    feedbackEl.textContent = "Correct answer: " + level.answer;
    setTimeout(() => {
      finishGame(false);
    }, 1500);
  } else {
    feedbackEl.textContent = "Try again. Hint: starts with \"" + level.answer[0].toUpperCase() + "\"";
    busy = true;
    setTimeout(() => {
      answerInput.classList.remove("incorrect");
      answerInput.value = "";
      answerInput.focus();
      busy = false;
    }, 1200);
  }
}

function finishGame(completedAll) {
  if (completedAll) {
    resultText.textContent = "Congratulations! You guessed all " + order.length + " pictures!";
  } else {
    resultText.textContent = "You guessed " + score + " out of " + order.length + " pictures.";
  }
  showScreen(gameoverScreen);
}

async function loadLevels() {
  try {
    const response = await fetch("levels.json");
    if (!response.ok) throw new Error("Bad response");
    allLevels = await response.json();
    if (!Array.isArray(allLevels) || allLevels.length === 0) throw new Error("Empty levels");
  } catch (err) {
    allLevels = FALLBACK_LEVELS;
  }
}

playBtn.addEventListener("click", () => startGame("normal"));
practiceBtn.addEventListener("click", () => startGame("practice"));
restartBtn.addEventListener("click", () => showScreen(startScreen));
checkBtn.addEventListener("click", checkAnswer);

loadLevels();
