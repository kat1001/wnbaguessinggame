const maxGuesses = 8;

let players = [];
let targetPlayer = null;
let guessesUsed = 0;
let gameOver = false;
let hintLevel = 0;

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

async function loadPlayers() {
  try {
    const response = await fetch("players.json");
    players = await response.json();

    startNewGame();
  } catch (error) {
    console.error("Error loading players.json:", error);
    gameMessage.textContent = "Could not load player data. Use Live Server and check players.json.";
  }
}

function startNewGame() {
  hintLevel = 0;
  if (players.length === 0) {
    return;
  }

  targetPlayer = players[Math.floor(Math.random() * players.length)];
  guessesUsed = 0;
  gameOver = false;

  feedbackGrid.innerHTML = "";
  playerGuessInput.value = "";
  suggestionsBox.innerHTML = "";

  playerImage.src = "";
  playerImage.style.display = "none";
  imageCaption.textContent = "Stuck? Press show hint!";

  resultBox.classList.add("hidden");
  resultTitle.textContent = "";
  resultText.textContent = "";

  gameMessage.textContent = "You have 8 guesses.";
  guessCounter.textContent = `Guesses Used: ${guessesUsed} / ${maxGuesses}`;

  console.log("Target player:", targetPlayer.name);
}

function normalizeText(text) {
  return text.trim().toLowerCase();
}

function heightToInches(heightStr) {
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

function heightToInches(heightStr) {
  const parts = heightStr.split("'");

  const feet = parseInt(parts[0]);
  const inches = parseInt(parts[1].replace('"', ''));

  return feet * 12 + inches;
}

function projectSignature() {
  return "kat1001_WNBAGuessinggame";
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

  row.appendChild(createCell(guessedPlayer.name, "name-cell"));
  row.appendChild(createCell(guessedPlayer.team, teamStatus));
  row.appendChild(createCell(guessedPlayer.conference, conferenceStatus));
  row.appendChild(createCell(guessedPlayer.position, positionStatus));
  row.appendChild(createCell(heightResult.text, heightResult.status));
  row.appendChild(createCell(ageResult.text, ageResult.status));
  row.appendChild(createCell(jerseyResult.text, jerseyResult.status));
  row.appendChild(createCell(guessedPlayer.college, collegeStatus));

  feedbackGrid.appendChild(row);
}

function showWinState() {
  gameOver = true;

  playerImage.src = targetPlayer.c_photo;
  playerImage.classList.remove("blurred");
  playerImage.style.display = "block";
  imageCaption.textContent = `Correct! ${targetPlayer.name}`;

  resultBox.classList.remove("hidden");
  resultTitle.textContent = "You got it!";
  resultText.textContent = `The hidden player was ${targetPlayer.name}.`;

  gameMessage.textContent = "Nice job. You guessed the player.";
}

function showLoseState() {
  gameOver = true;

  playerImage.src = targetPlayer.c_photo;
  playerImage.style.display = "block";
  imageCaption.textContent = `The player was ${targetPlayer.name}`;

  resultBox.classList.remove("hidden");
  resultTitle.textContent = "Game Over";
  resultText.textContent = `You used all ${maxGuesses} guesses. The hidden player was ${targetPlayer.name}.`;

  gameMessage.textContent = "No more guesses left.";
}

function handleGuess() {
  if (gameOver) {
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

  hintLevel++;

  playerImage.style.display = "block";

  if (hintLevel === 1) {
    playerImage.src = targetPlayer.g_photo;
    playerImage.classList.remove("blurred");
    imageCaption.textContent = "Hint 1";
  } 
  else if (hintLevel === 2) {
    playerImage.src = targetPlayer.c_photo;
    playerImage.classList.add("blurred");
    imageCaption.textContent = "Hint 2";
  } 
  else {
    imageCaption.textContent = "No more hints available.";
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

submitGuessBtn.addEventListener("click", handleGuess);

hintBtn.addEventListener("click", showHint);

restartBtn.addEventListener("click", startNewGame);

playerGuessInput.addEventListener("input", updateSuggestions);

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