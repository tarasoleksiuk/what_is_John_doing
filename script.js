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

const FALLBACK_TOPICS = [
  {
    id: 3,
    title: "Relationships",
    levels: [
      {
        image: "images/fit_in_with.png",
        sentence: "John finds it really hard to ___ his art class, because everyone else there is much younger than him.",
        answer: "fit in with",
        phrasal_verb: "fit in with",
        hint: "feel like you belong in a group"
      },
      {
        image: "images/gang_up_on.png",
        sentence: "Some of the older children ___ John, surrounding him and calling him names.",
        answer: "ganged up on",
        phrasal_verb: "gang up on",
        hint: "form a group to hurt someone"
      },
      {
        image: "images/look_down_on.png",
        sentence: "John's neighbours ___ him because his house is smaller than theirs.",
        answer: "look down on",
        phrasal_verb: "look down on",
        hint: "think you are better than another person"
      },
      {
        image: "images/wear_down.png",
        sentence: "John's little son asked for a puppy every day and eventually ___ his dad.",
        answer: "wore down",
        phrasal_verb: "wear down",
        hint: "convince someone to do what you want (often by asking many times)"
      }
    ]
  },
  {
    id: 5,
    title: "Socializing",
    levels: [
      {
        image: "images/ask_after.png",
        sentence: "John bumped into Sandra at the park, and she was ___ him.",
        answer: "asking after",
        phrasal_verb: "ask after",
        hint: "ask for news about someone"
      }
    ]
  },
  {
    id: 19,
    title: "Movement and progress",
    levels: [
      {
        image: "images/pack_into.png",
        sentence: "John ___ the crowded town hall together with hundreds of other people to watch the debate.",
        answer: "packed into",
        phrasal_verb: "pack into",
        hint: "fit into a place in large numbers"
      },
      {
        image: "images/flood_into.png",
        sentence: "John ___ the stadium with thousands of other fans to watch the singer perform.",
        answer: "flooded into",
        phrasal_verb: "flood into",
        hint: "enter a space in large numbers"
      },
      {
        image: "images/spill_out_of.png",
        sentence: "After the concert, John ___ the stadium with the crowd and headed to the train station.",
        answer: "spilled out of",
        phrasal_verb: "spill out of",
        hint: "leave a space in large numbers"
      }
    ]
  }
];

const startScreen    = document.getElementById("start-screen");
const gameScreen     = document.getElementById("game-screen");
const gameoverScreen = document.getElementById("gameover-screen");

const menuBtn         = document.getElementById("menu-btn");
const menuBtnGameover = document.getElementById("menu-btn-gameover");
const restartBtn      = document.getElementById("restart-btn");
const checkBtn        = document.getElementById("check-btn");
const toggleBtn       = document.getElementById("toggle-btn");

const scoreLabel   = document.getElementById("score-label");
const imageWrapper = document.getElementById("image-wrapper");
const levelImage   = document.getElementById("level-image");
const sentenceEl   = document.getElementById("sentence");
const feedbackEl   = document.getElementById("feedback");
const resultText   = document.getElementById("result-text");
const topicListEl  = document.getElementById("topic-list");

let allTopicsData = [];
let currentTopic  = null;
let order         = [];
let currentIndex  = 0;
let score         = 0;
let attempts      = 0;
let mode          = "normal";
let answerInput   = null;
let busy          = false;

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

function startGame(topicData, selectedMode) {
  currentTopic = topicData;
  mode = selectedMode || "normal";
  score = 0;
  currentIndex = 0;
  order = shuffle(topicData.levels);
  scoreLabel.textContent = "Score: 0";
  showScreen(gameScreen);
  loadLevel();
}

function updateScoreLabel() {
  scoreLabel.textContent = "Score: " + score;
}

function setSentenceVisible(visible) {
  sentenceEl.style.visibility = visible ? "visible" : "hidden";
  feedbackEl.style.visibility = visible ? "visible" : "hidden";
  toggleBtn.textContent = visible ? "Hide" : "Show";
}

function loadLevel() {
  busy = false;
  attempts = 0;
  feedbackEl.textContent = "";
  feedbackEl.className = "feedback";
  setSentenceVisible(true);

  const level = order[currentIndex % order.length];
  levelImage.src = level.image;
  levelImage.alt = level.phrasal_verb;

  sentenceEl.innerHTML = "";
  const parts = level.sentence.split("___");

  sentenceEl.appendChild(document.createTextNode(parts[0]));

  answerInput = document.createElement("input");
  answerInput.type = "text";
  answerInput.autocomplete = "off";
  answerInput.autocapitalize = "off";
  answerInput.spellcheck = false;

  answerInput.addEventListener("keydown", e => {
    if (e.key === "Enter") checkAnswer();
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
  const userValue  = answerInput.value.trim().toLowerCase();
  const correctValue = level.answer.trim().toLowerCase();

  if (userValue === correctValue) {
    busy = true;
    answerInput.classList.remove("incorrect");
    answerInput.classList.add("correct");
    answerInput.disabled = true;
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
    return;
  }

  attempts++;
  answerInput.classList.remove("correct");
  answerInput.classList.add("incorrect");
  feedbackEl.className = "feedback feedback-wrong";
  feedbackEl.textContent = level.hint;

  if (mode === "practice") {
    busy = true;
    setTimeout(() => {
      answerInput.classList.remove("incorrect");
      answerInput.value = "";
      answerInput.focus();
      busy = false;
    }, 1500);
    return;
  }

  // Normal mode
  if (attempts >= 2) {
    busy = true;
    feedbackEl.textContent = "Correct answer: " + level.answer + " — " + level.hint;
    setTimeout(() => finishGame(false), 2000);
  } else {
    busy = true;
    setTimeout(() => {
      answerInput.classList.remove("incorrect");
      answerInput.value = "";
      answerInput.focus();
      busy = false;
    }, 1500);
  }
}

function finishGame(completedAll) {
  if (completedAll) {
    resultText.textContent = "Congratulations! You completed all " + order.length + " levels!";
  } else {
    resultText.textContent = "You scored " + score + " out of " + order.length + ".";
  }
  showScreen(gameoverScreen);
}

async function loadLevels() {
  try {
    const response = await fetch("levels.json");
    if (!response.ok) throw new Error("Bad response");
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error("Empty");
    allTopicsData = data;
  } catch (err) {
    allTopicsData = FALLBACK_TOPICS;
  }
  buildTopicMenu();
}

menuBtn.addEventListener("click", () => showScreen(startScreen));
menuBtnGameover.addEventListener("click", () => showScreen(startScreen));
restartBtn.addEventListener("click", () => startGame(currentTopic, mode));
checkBtn.addEventListener("click", checkAnswer);
toggleBtn.addEventListener("click", () => {
  const isVisible = sentenceEl.style.visibility !== "hidden";
  setSentenceVisible(!isVisible);
});

loadLevels();
