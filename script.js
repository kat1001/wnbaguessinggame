const maxGuesses = 8;

let players = [];
let targetPlayer = null;
let guessesUsed = 0;
let gameOver = false;
let hintLevel = 0;
let gameMode = "daily";


let timerInterval = null;
let startTime = null;
let elapsedSeconds = 0;
let dailyScoreSubmitted = false;

const modeToggleBtn = document.getElementById("mode-toggle-btn");
const timerDisplay = document.getElementById("timer-display");

const playerGuessInput = document.getElementById("player-guess");
const submitGuessBtn = document.getElementById("submit-guess-btn");
const hintBtn = document.getElementById("hint-btn");
const restartBtn = document.getElementById("restart-btn");

const feedbackGrid = document.getElementById("feedback-grid");
const gameMessage = document.getElementById("game-message");
const guessCounter = document.getElementById("guess-counter");

const playerImage = document.getElementById("player-image");
const imageCaption = document.getElementById("image-caption");

const resultBox = document.getElementById("result-box");
const resultTitle = document.getElementById("result-title");
const resultText = document.getElementById("result-text");

const suggestionsBox = document.getElementById("suggestions-box");

const leaderboardModal = document.getElementById("leaderboard-modal");
const leaderboardList = document.getElementById("leaderboard-list");
const dailyScoreSummary = document.getElementById("daily-score-summary");
const closeLeaderboardBtn = document.getElementById("close-leaderboard-btn");

const extraCategoryPool = [
  { key: "draft", label: "Draft" },
  { key: "ppg_2025", label: "2025 PPG" },
  { key: "rpg_2025", label: "2025 RPG" },
  { key: "apg_2025", label: "2025 APG" },
  { key: "all_star", label: "All-Star" },
  { key: "eoy_awards", label: "Awards" }
];

let selectedExtraCategory = null;

function getTodayKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDailyPlayer() {
  if (players.length === 0) {
    return null;
  }

  const todayKey = getTodayKey();
  let total = 0;

  for (let i = 0; i < todayKey.length; i++) {
    total += todayKey.charCodeAt(i);
  }

  const dailyIndex = total % players.length;
  return players[dailyIndex];
}

function updateModeButton() {
  if (!modeToggleBtn) return;

  if (gameMode === "daily") {
    modeToggleBtn.textContent = "Mode: Daily";
  } else {
    modeToggleBtn.textContent = "Mode: Practice";
  }
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function updateTimerDisplay() {
  if (!timerDisplay) return;

  if (gameMode === "daily") {
    timerDisplay.textContent = `Time: ${formatTime(elapsedSeconds)}`;
    timerDisplay.style.display = "block";
  } else {
    timerDisplay.style.display = "none";
  }
}

function startTimer() {
  stopTimer();

  elapsedSeconds = 0;
  startTime = Date.now();

  updateTimerDisplay();

  timerInterval = setInterval(() => {
    elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    updateTimerDisplay();
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function calculateDailyScore() {
  const timePenalty = elapsedSeconds * 25;
  const guessPenalty = (guessesUsed - 1) * 8000;

  let score = 100000 - timePenalty - guessPenalty;

  if (score < 0) {
    score = 0;
  }

  return score;
}

function getLeaderboardStorageKey() {
  return "wnba_poeltl_daily_scores";
}

function getSavedDailyScores() {
  const saved = localStorage.getItem(getLeaderboardStorageKey());

  if (!saved) {
    return [];
  }

  try {
    return JSON.parse(saved);
  } catch (error) {
    console.error("Could not parse saved daily scores:", error);
    return [];
  }
}

function saveDailyScores(scores) {
  localStorage.setItem(getLeaderboardStorageKey(), JSON.stringify(scores));
}

function hasCompletedDailyGame(todayKey) {
  const scores = getSavedDailyScores();
  return scores.some(entry => entry.date === todayKey);
}

function saveOfficialDailyScore() {
  const todayKey = getTodayKey();

  if (hasCompletedDailyGame(todayKey)) {
    dailyScoreSubmitted = true;
    return null;
  }

  const score = calculateDailyScore();

  const entry = {
    date: todayKey,
    score: score,
    guesses: guessesUsed,
    timeSeconds: elapsedSeconds,
    player: targetPlayer.name,
    won: true
  };

  const scores = getSavedDailyScores();
  scores.push(entry);
  saveDailyScores(scores);

  dailyScoreSubmitted = true;
  return entry;
}

function getTop10Scores() {
  const scores = getSavedDailyScores();

  return scores
    .filter(entry => entry.won)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

async function loadPlayers() {
  try {
    const response = await fetch("players.json");
    players = await response.json();

    updateModeButton();
    startNewGame();
  } catch (error) {
    console.error("Error loading players.json:", error);
    gameMessage.textContent = "Could not load player data. Use Live Server and check players.json.";
  }
}


function showLeaderboardModal(latestEntry = null) {
  if (!leaderboardModal || !leaderboardList || !dailyScoreSummary) {
    return;
  }

  const topScores = getTop10Scores();
  leaderboardList.innerHTML = "";

  if (latestEntry) {
    dailyScoreSummary.textContent =
      `Today’s score: ${latestEntry.score} | Guesses: ${latestEntry.guesses} | Time: ${formatTime(latestEntry.timeSeconds)}`;
  } else {
    dailyScoreSummary.textContent = "You already completed today’s daily game.";
  }

  if (topScores.length === 0) {
    leaderboardList.innerHTML = "<p>No saved daily scores yet.</p>";
  } else {
    topScores.forEach((entry, index) => {
      const row = document.createElement("div");
      row.classList.add("leaderboard-row");

      row.innerHTML = `
        <span>#${index + 1}</span>
        <span>${entry.date}</span>
        <span>${entry.score}</span>
        <span>${entry.guesses} guesses</span>
        <span>${formatTime(entry.timeSeconds)}</span>
      `;

      leaderboardList.appendChild(row);
    });
  }

  leaderboardModal.classList.remove("hidden");
}

function hideLeaderboardModal() {
  if (leaderboardModal) {
    leaderboardModal.classList.add("hidden");
  }
}


function startNewGame() {
  hintLevel = 0;

  if (players.length === 0) {
    return;
  }

  if (gameMode === "daily") {
    targetPlayer = getDailyPlayer();
  } else {
    targetPlayer = players[Math.floor(Math.random() * players.length)];
  }

  pickRandomExtraCategory();

  guessesUsed = 0;
  gameOver = false;
  dailyScoreSubmitted = false;

  feedbackGrid.innerHTML = "";
  playerGuessInput.value = "";
  suggestionsBox.innerHTML = "";

  playerImage.src = "";
  playerImage.style.display = "none";
  playerImage.classList.remove("blurred", "silhouette");
  imageCaption.textContent = "Stuck? Press show hint!";

  resultBox.classList.add("hidden");
  resultTitle.textContent = "";
  resultText.textContent = "";

  guessCounter.textContent = `Guesses Used: ${guessesUsed} / ${maxGuesses}`;

  updateExtraHeader();
  updateModeButton();

  if (gameMode === "daily") {
    const todayKey = getTodayKey();

    if (hasCompletedDailyGame(todayKey)) {
      gameMessage.textContent = "Daily mode. You already completed today’s official game.";
      elapsedSeconds = 0;
      updateTimerDisplay();
      stopTimer();
    } else {
      gameMessage.textContent = "Daily mode. You have 8 guesses.";
      startTimer();
    }
  } else {
    gameMessage.textContent = "Practice mode. You have 8 guesses.";
    stopTimer();
    elapsedSeconds = 0;
    updateTimerDisplay();
  }

  console.log("Game mode:", gameMode);
  console.log("Target player:", targetPlayer.name);
  console.log("Extra category:", selectedExtraCategory.label);
}



function pickRandomExtraCategory() {
  const randomIndex = Math.floor(Math.random() * extraCategoryPool.length);
  selectedExtraCategory = extraCategoryPool[randomIndex];
}

function updateExtraHeader() {
  const extraHeaderCell = document.getElementById("extra-header");

  if (extraHeaderCell && selectedExtraCategory) {
    extraHeaderCell.textContent = selectedExtraCategory.label;
  }
}

function normalizeText(text) {
  return String(text).trim().toLowerCase();
}

function heightToInches(heightStr) {
  if (!heightStr) return 0;

  const parts = heightStr.split("'");
  const feet = parseInt(parts[0]);
  const inches = parseInt(parts[1].replace('"', ""));

  return feet * 12 + inches;
}

function findPlayerByName(name) {
  return players.find(player => normalizeText(player.name) === normalizeText(name));
}

function compareExact(guessValue, targetValue) {
  return guessValue === targetValue ? "correct" : "wrong";
}

function comparePosition(guessPos, targetPos) {
  if (guessPos === targetPos) {
    return "correct";
  }

  const guessParts = guessPos.split("/").map(part => part.trim());
  const targetParts = targetPos.split("/").map(part => part.trim());

  const hasOverlap = guessParts.some(part => targetParts.includes(part));

  if (hasOverlap) {
    return "close";
  }

  return "wrong";
}

function compareNumeric(guessValue, targetValue, closeRange, displayValue) {
  let status = "wrong";
  let arrow = "";

  if (guessValue === targetValue) {
    status = "correct";
  } else if (Math.abs(guessValue - targetValue) <= closeRange) {
    status = "close";
    arrow = guessValue < targetValue ? "↑" : "↓";
  } else {
    status = "wrong";
    arrow = guessValue < targetValue ? "↑" : "↓";
  }

  return {
    status: status,
    text: `${displayValue}${arrow ? " " + arrow : ""}`
  };
}

function getDraftYear(draftStr) {
  if (!draftStr) return null;

  const match = draftStr.match(/\d{4}/);
  return match ? parseInt(match[0]) : null;
}

function compareDraft(guessDraft, targetDraft) {
  if (!guessDraft || !targetDraft) {
    return {
      status: "wrong",
      text: guessDraft || "N/A"
    };
  }

  if (guessDraft === targetDraft) {
    return {
      status: "correct",
      text: guessDraft
    };
  }

  const guessYear = getDraftYear(guessDraft);
  const targetYear = getDraftYear(targetDraft);

  if (guessYear && targetYear && guessYear === targetYear) {
    return {
      status: "close",
      text: guessDraft
    };
  }

  return {
    status: "wrong",
    text: guessDraft
  };
}

function projectSignature() {
  return "kat1001_WNBAGuessinggame";
}

function compareStat(guessValue, targetValue, closeRange = 1, decimals = 1) {
  if (guessValue == null || targetValue == null || guessValue === "" || targetValue === "") {
    return {
      status: "wrong",
      text: "N/A"
    };
  }

  let status = "wrong";
  let arrow = "";

  if (Number(guessValue) === Number(targetValue)) {
    status = "correct";
  } else if (Math.abs(Number(guessValue) - Number(targetValue)) <= closeRange) {
    status = "close";
    arrow = Number(guessValue) < Number(targetValue) ? "↑" : "↓";
  } else {
    status = "wrong";
    arrow = Number(guessValue) < Number(targetValue) ? "↑" : "↓";
  }

  return {
    status,
    text: `${Number(guessValue).toFixed(decimals)}${arrow ? " " + arrow : ""}`
  };
}

function normalizeAwardName(awardText) {
  if (!awardText) return "";

  return awardText
    .toLowerCase()
    .replace(/\b\d{4}\b/g, "")
    .replace(/,+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toTitleCase(text) {
  return text.replace(/\b\w/g, char => char.toUpperCase());
}

function extractAwardTags(awardsStr) {
  if (!awardsStr) {
    return [];
  }

  const cleanedWholeString = awardsStr.trim().toLowerCase();

  if (
    cleanedWholeString === "" ||
    cleanedWholeString === "—" ||
    cleanedWholeString === "-" ||
    cleanedWholeString === "no awards" ||
    cleanedWholeString === "none" ||
    cleanedWholeString === "n/a" ||
    cleanedWholeString === "na"
  ) {
    return [];
  }

  return [...new Set(
    awardsStr
      .split(";")
      .map(item => normalizeAwardName(item))
      .filter(item =>
        item !== "" &&
        item !== "—" &&
        item !== "-" &&
        item !== "no awards" &&
        item !== "none" &&
        item !== "n/a" &&
        item !== "na"
      )
  )];
}

function compareAwards(guessAwards, targetAwards) {
  const guessTags = extractAwardTags(guessAwards);
  const targetTags = extractAwardTags(targetAwards);

  const guessHasAwards = guessTags.length > 0;
  const targetHasAwards = targetTags.length > 0;

  if (!guessHasAwards && !targetHasAwards) {
    return {
      status: "correct",
      text: "No awards"
    };
  }

  if (!guessHasAwards && targetHasAwards) {
    return {
      status: "wrong",
      text: "Target has awards"
    };
  }

  if (guessHasAwards && !targetHasAwards) {
    return {
      status: "wrong",
      text: "Target has no awards"
    };
  }

  const sharedAwards = guessTags.filter(tag => targetTags.includes(tag));

  if (sharedAwards.length > 0) {
    const prettyShared = sharedAwards.map(tag => toTitleCase(tag));

    const sharedText =
      prettyShared.length === 1
        ? prettyShared[0]
        : `${prettyShared[0]} +${prettyShared.length - 1}`;

    return {
      status: "correct",
      text: `Shared: ${sharedText}`
    };
  }

  return {
    status: "close",
    text: "Awards, none shared"
  };
}

function compareExtraCategory(guessPlayer, targetPlayer) {
  const key = selectedExtraCategory.key;

  switch (key) {
    case "draft":
      return compareDraft(guessPlayer.draft, targetPlayer.draft);

    case "ppg_2025":
      return compareStat(guessPlayer.ppg_2025, targetPlayer.ppg_2025, 2.0, 1);

    case "rpg_2025":
      return compareStat(guessPlayer.rpg_2025, targetPlayer.rpg_2025, 1.5, 1);

    case "apg_2025":
      return compareStat(guessPlayer.apg_2025, targetPlayer.apg_2025, 1.5, 1);

    case "all_star":
      return compareStat(guessPlayer.all_star, targetPlayer.all_star, 1, 0);

    case "eoy_awards":
      return compareAwards(guessPlayer.eoy_awards, targetPlayer.eoy_awards);

    default:
      return {
        status: "wrong",
        text: "N/A"
      };
  }
}

function createCell(text, className = "") {
  const cell = document.createElement("div");
  cell.classList.add("cell");

  if (className) {
    cell.classList.add(className);
  }

  cell.textContent = text;
  return cell;
}

function addGuessRow(guessedPlayer) {
  const row = document.createElement("div");
  row.classList.add("feedback-row");

  const teamStatus = compareExact(guessedPlayer.team, targetPlayer.team);
  const conferenceStatus = compareExact(guessedPlayer.conference, targetPlayer.conference);
  const positionStatus = comparePosition(guessedPlayer.position, targetPlayer.position);
  const collegeStatus = compareExact(guessedPlayer.college, targetPlayer.college);

  const heightResult = compareNumeric(
    heightToInches(guessedPlayer.height),
    heightToInches(targetPlayer.height),
    3,
    guessedPlayer.height
  );

  const ageResult = compareNumeric(
    guessedPlayer.age,
    targetPlayer.age,
    3,
    guessedPlayer.age
  );

  const jerseyResult = compareNumeric(
    guessedPlayer.jersey,
    targetPlayer.jersey,
    3,
    guessedPlayer.jersey
  );

  const extraResult = compareExtraCategory(guessedPlayer, targetPlayer);

  row.appendChild(createCell(guessedPlayer.name, "name-cell"));
  row.appendChild(createCell(guessedPlayer.team, teamStatus));
  row.appendChild(createCell(guessedPlayer.conference, conferenceStatus));
  row.appendChild(createCell(guessedPlayer.position, positionStatus));
  row.appendChild(createCell(heightResult.text, heightResult.status));
  row.appendChild(createCell(ageResult.text, ageResult.status));
  row.appendChild(createCell(jerseyResult.text, jerseyResult.status));
  row.appendChild(createCell(guessedPlayer.college, collegeStatus));
  row.appendChild(createCell(extraResult.text, extraResult.status));

  feedbackGrid.appendChild(row);
}

function setHintImageState(imagePath, mode) {
  playerImage.src = imagePath;
  playerImage.style.display = "block";
  playerImage.classList.remove("blurred", "silhouette");

  if (mode === "silhouette") {
    playerImage.classList.add("silhouette");
  } else if (mode === "blurred") {
    playerImage.classList.add("blurred");
  }
}

function showWinState() {
  gameOver = true;
  stopTimer();

  setHintImageState(targetPlayer.c_photo, "normal");
  imageCaption.textContent = `Correct! ${targetPlayer.name}`;

  resultBox.classList.remove("hidden");
  resultTitle.textContent = "You got it!";

  if (gameMode === "daily") {
    const todayKey = getTodayKey();

    if (!hasCompletedDailyGame(todayKey)) {
      const savedEntry = saveOfficialDailyScore();

      resultText.textContent =
        `The hidden player was ${targetPlayer.name}. Score: ${savedEntry.score}. Time: ${formatTime(savedEntry.timeSeconds)}.`;

      gameMessage.textContent = "Nice job. Your daily score has been saved.";
      showLeaderboardModal(savedEntry);
    } else {
      resultText.textContent = `The hidden player was ${targetPlayer.name}.`;
      gameMessage.textContent = "Nice job. Today’s daily score was already completed.";
      showLeaderboardModal();
    }
  } else {
    resultText.textContent = `The hidden player was ${targetPlayer.name}.`;
    gameMessage.textContent = "Nice job. You guessed the player.";
  }
}

function showLoseState() {
  gameOver = true;
  stopTimer();

  setHintImageState(targetPlayer.c_photo, "normal");
  imageCaption.textContent = `The player was ${targetPlayer.name}`;

  resultBox.classList.remove("hidden");
  resultTitle.textContent = "Game Over";

  if (gameMode === "daily") {
    resultText.textContent =
      `You used all ${maxGuesses} guesses. The hidden player was ${targetPlayer.name}. No official score was saved.`;

    gameMessage.textContent = "No more guesses left.";
    showLeaderboardModal();
  } else {
    resultText.textContent =
      `You used all ${maxGuesses} guesses. The hidden player was ${targetPlayer.name}.`;

    gameMessage.textContent = "No more guesses left.";
  }
}

function handleGuess() {
  if (gameOver) {
    return;
  }

  if (gameMode === "daily" && hasCompletedDailyGame(getTodayKey())) {
  gameMessage.textContent = "You already completed today’s official daily game.";
  return;
}

  const guessedName = playerGuessInput.value.trim();

  if (guessedName === "") {
    gameMessage.textContent = "Please enter a player name.";
    return;
  }

  const guessedPlayer = findPlayerByName(guessedName);

  if (!guessedPlayer) {
    gameMessage.textContent = "That player was not found in the dataset.";
    return;
  }

  const alreadyGuessed = Array.from(feedbackGrid.children).some(row => {
    return row.firstChild.textContent.toLowerCase() === guessedPlayer.name.toLowerCase();
  });

  if (alreadyGuessed) {
    gameMessage.textContent = "You already guessed that player.";
    return;
  }

  guessesUsed++;
  guessCounter.textContent = `Guesses Used: ${guessesUsed} / ${maxGuesses}`;

  addGuessRow(guessedPlayer);

  playerGuessInput.value = "";
  suggestionsBox.innerHTML = "";

  if (normalizeText(guessedPlayer.name) === normalizeText(targetPlayer.name)) {
    showWinState();
    return;
  }

  if (guessesUsed >= maxGuesses) {
    showLoseState();
    return;
  }

  gameMessage.textContent = "Keep going.";
}

function showHint() {
  if (!targetPlayer || gameOver) {
    return;
  }

  if (hintLevel >= 2) {
    imageCaption.textContent = "No more hints available.";
    return;
  }

  hintLevel++;

  if (hintLevel === 1) {
    setHintImageState(targetPlayer.c_photo, "silhouette");
    imageCaption.textContent = "Hint 1";
  } else if (hintLevel === 2) {
    setHintImageState(targetPlayer.c_photo, "blurred");
    imageCaption.textContent = "Hint 2";
  }
}

function updateSuggestions() {
  const inputValue = normalizeText(playerGuessInput.value);

  suggestionsBox.innerHTML = "";

  if (inputValue === "") {
    return;
  }

  const matches = players
    .filter(player => normalizeText(player.name).includes(inputValue))
    .slice(0, 5);

  matches.forEach(player => {
    const suggestion = document.createElement("div");
    suggestion.textContent = player.name;
    suggestion.style.padding = "10px 12px";
    suggestion.style.border = "1px solid #dddddd";
    suggestion.style.cursor = "pointer";
    suggestion.style.backgroundColor = "#ffffff";

    suggestion.addEventListener("click", () => {
      playerGuessInput.value = player.name;
      suggestionsBox.innerHTML = "";
    });

    suggestion.addEventListener("mouseover", () => {
      suggestion.style.backgroundColor = "#f2f2f2";
    });

    suggestion.addEventListener("mouseout", () => {
      suggestion.style.backgroundColor = "#ffffff";
    });

    suggestionsBox.appendChild(suggestion);
  });
}

modeToggleBtn.addEventListener("click", function () {
  if (gameMode === "daily") {
    gameMode = "practice";
  } else {
    gameMode = "daily";
  }

  updateModeButton();
  startNewGame();
});



submitGuessBtn.addEventListener("click", handleGuess);
hintBtn.addEventListener("click", showHint);
restartBtn.addEventListener("click", startNewGame);
playerGuessInput.addEventListener("input", updateSuggestions);
if (closeLeaderboardBtn) {
  closeLeaderboardBtn.addEventListener("click", hideLeaderboardModal);
}

playerGuessInput.addEventListener("keypress", function (event) {
  if (event.key === "Enter") {
    handleGuess();
  }
});

document.addEventListener("click", function (event) {
  if (!suggestionsBox.contains(event.target) && event.target !== playerGuessInput) {
    suggestionsBox.innerHTML = "";
  }
});

loadPlayers();