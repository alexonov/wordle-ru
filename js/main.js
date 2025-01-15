document.addEventListener("DOMContentLoaded", () => {

    const colorCorrect = "rgb(83, 141, 78)";
    const colorPresent = "rgb(181, 159, 59)";
    const colorAbsent = "rgb(58, 58, 60)";

    const colorFilled = "rgb(86, 87, 88)";
    const colorEmpty = "rgb(58, 58, 60)";

    // milisecs
    const revealInterval = 300;

    const letterStates = {
        absent: 0,
        present: 1,
        correct: 2
    };

    const stateColors = {
        [letterStates.absent]: colorAbsent,
        [letterStates.present]: colorPresent,
        [letterStates.correct]: colorCorrect
    };

    const gameStates = {
        progress: 'in_progress',
        won: 'won',
        lost: 'lost'
    }

    // as per https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises#creating_a_promise_around_an_old_callback_api
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

    // wait(0).then(()=>console.log('first')).then(() => wait(1000)).then(()=>console.log('waited'))

    let vocabulary = [];
    let targetWords = [];
    let keyWord = '';
    let guessedWordsArray = [];
    let guessedStateArray = [];
    let currentWordArray = [];
    let keys = [];
    let keyLookup = new Map();
    let guessedKeysMap = new Map();
    let gameCurrentState = '';
    let spoilersShown = true;
    let statistics = {
        gamesPlayed: 0,
        gamesWon: 0,
        currentStreak: 0,
        maxStreak: 0,
        guesses: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
    };


    function showStatsModal() {
        const overlay = document.getElementById("overlay");
        const modal = document.getElementById("stats-modal");
        overlay.classList.add("active");
        modal.classList.add("active");
        updateStatisticsDisplay();
    }

    function hideStatsModal() {
        const overlay = document.getElementById("overlay");
        const modal = document.getElementById("stats-modal");
        overlay.classList.remove("active");
        modal.classList.remove("active");
    }

    function updateStatisticsDisplay() {
        const winPercentage = statistics.gamesPlayed > 0
            ? Math.round((statistics.gamesWon / statistics.gamesPlayed) * 100)
            : 0;

        document.querySelectorAll('.statistic')[0].textContent = statistics.gamesPlayed;
        document.querySelectorAll('.statistic')[1].textContent = winPercentage;
        document.querySelectorAll('.statistic')[2].textContent = statistics.currentStreak;
        document.querySelectorAll('.statistic')[3].textContent = statistics.maxStreak;

        // Update guess distribution
        const maxGuesses = Math.max(...Object.values(statistics.guesses));
        Object.entries(statistics.guesses).forEach(([guess, count]) => {
            const bar = document.querySelector(`.graph-container:nth-child(${guess}) .graph-bar`);
            const numGuesses = document.querySelector(`.graph-container:nth-child(${guess}) .num-guesses`);
            const percentage = maxGuesses > 0 ? (count / maxGuesses) * 100 : 0;

            bar.style.width = `${percentage}%`;
            numGuesses.textContent = count;

            // Highlight current game's guess count
            if (gameCurrentState !== gameStates.progress &&
                guessedWordsArray.length === parseInt(guess)) {
                bar.classList.add('highlight');
            } else {
                bar.classList.remove('highlight');
            }
        });
    }

    function generateShareText() {
        const date = new Date();
        const dayNumber = Math.floor((date - new Date(2022, 0, 1)) / (1000 * 60 * 60 * 24));
        let shareText = `Вордл мол ${dayNumber} ${guessedWordsArray.length}/6\n\n`;

        guessedStateArray.forEach(states => {
            states.forEach(state => {
                switch (state) {
                    case letterStates.correct:
                        shareText += '🟩';
                        break;
                    case letterStates.present:
                        shareText += '🟨';
                        break;
                    case letterStates.absent:
                        shareText += '⬛';
                        break;
                }
            });
            shareText += '\n';
        });

        return shareText;
    }

    async function shareResult() {
        const shareText = generateShareText();

        if (navigator.share && /mobile|android|iphone/i.test(navigator.userAgent)) {
            try {
                await navigator.share({
                    text: shareText
                });
            } catch (err) {
                console.error('Error sharing:', err);
            }
        } else {
            navigator.clipboard.writeText(shareText).then(() => {
                const shareButton = document.getElementById('share-button');
                const originalText = shareButton.innerHTML;
                shareButton.innerHTML = '<i class="fa fa-check"></i> СКОПИРОВАНО';
                setTimeout(() => {
                    shareButton.innerHTML = originalText;
                }, 2000);
            });
        }
    }

    const createScene = async () => {
        guessedWordsArray = [];
        currentWordArray = [];

        // loading vocab
        targetWords = await loadFile('https://alexonov.github.io/wordle-ru/assets/target_words.txt');
        vocabulary = await loadFile('https://alexonov.github.io/wordle-ru/assets/words_5_letters.txt')

        keyWord = generateNewDailyWord();
        // keyWord = 'такси';

        // console.log(`pss.. the word in ${keyWord}`);

        createSquares();

        // getting keys
        keys = document.querySelectorAll('.keyboard-row button');

        // create key lookup
        for (const key of keys) {
            let letter = key.getAttribute("data-key");
            keyLookup.set(letter, key);
        }

        // assigning onclick to keys
        for (let i = 0; i < keys.length; i++) {
            keys[i].onclick = ({
                target
            }) => {

                const letter = target.getAttribute("data-key");

                handleNewLetter(letter);
            };

        }

        gameCurrentState = gameStates.progress;
        loadGame();
        innitButtons();
        syncButtons();
    }

    createScene();

    window.addEventListener('keydown', handleKeyDown);

    function syncButtons() {
        const btnResult = document.getElementById("result");
        const btnDict = document.getElementById("dict");
        const btnStats = document.getElementById("dict");

        if (gameCurrentState === gameStates.progress) {
            btnResult.style.pointerEvents = 'none';
            btnDict.style.pointerEvents = 'none';
        } else {
            btnResult.style.pointerEvents = 'all';
            btnDict.style.pointerEvents = 'all';
        }
    }

    function innitButtons() {
        const btnResult = document.getElementById("result");
        const btnDict = document.getElementById("dict");
        const btnShare = document.getElementById("share-button");
        const closeButtons = document.querySelectorAll(".close-button");

        // When the user clicks on the button, show spoiler free display
        btnResult.addEventListener("click", function () {
            if (spoilersShown) {
                hideSpoilers();
            } else {
                showSpoilers();
            }
        });

        btnDict.addEventListener("click", function () {
            showStatsModal();
        });

        btnShare.addEventListener("click", shareResult);

        closeButtons.forEach(button => {
            button.addEventListener("click", () => {
                hideStatsModal();
            });
        });

        // Close modal when clicking outside
        document.getElementById("overlay").addEventListener("click", (e) => {
            if (e.target.id === "overlay") {
                hideStatsModal();
            }
        });
    }

    function hideSpoilers() {
        guessedWordsArray.forEach((word, i) => {
            word.forEach((letter, j) => {
                const squareId = i * 5 + j + 1
                const color = stateColors[guessedStateArray[i][j]];
                revealSquare(squareId, color, "");
            })
        });
        resetKeyboard();
        spoilersShown = !spoilersShown;
    }

    function showSpoilers() {
        guessedWordsArray.forEach((word, i) => {
            word.forEach((letter, j) => {
                const squareId = i * 5 + j + 1
                const color = stateColors[guessedStateArray[i][j]];
                revealSquare(squareId, color, letter);
            })
        });
        updateKeyboard();
        spoilersShown = !spoilersShown;
    }

    function createSquares() {
        const gameBoard = document.getElementById("board");

        for (let index = 0; index < 30; index++) {
            let square = document.createElement("div");
            square.classList.add("square");
            square.classList.add("animate__animated");
            square.setAttribute("id", index + 1);
            gameBoard.appendChild(square);

        }
    }

    function removeItem(list, index) {
        if (index > -1) {
            list.splice(index, 1);
        }
    }

    // =============================================
    // vocabulary
    // =============================================

    async function loadFile(url) {
        try {
            const response = await fetch(url);
            const data = await response.text();
            return data.split('\n');
        } catch (err) {
            console.error(err);
            return null;
        }
    }

    // function loadFile(url) {
    //     fetch(url)
    //         .then(response => response.text())
    //         .then((data) => {
    //             vocab = data.split('\n');
    //             console.log(vocab);
    //         })
    // }

    function seedRandGenerator(a) {
        return function () {
            var t = a += 0x6D2B79F5;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        }
    }

    function generateNewDailyWord() {
        // chose new daily starting word
        let date = new Date();
        let seed = [date.getYear(), date.getMonth(), date.getDate() * 2].join('');
        let rand = seedRandGenerator(parseInt(seed));
        return targetWords[Math.floor(rand() * targetWords.length)];
    }

    function generateNewWord() {
        // chose new starting word
        let randomIndex = Math.floor(Math.random() * targetWords.length);
        return targetWords[randomIndex];
    }

    function isValidWord(word) {
        return vocabulary.includes(word.toLowerCase());
    }

    // =====================================================
    // events
    // =====================================================

    function handleNewLetter(letter) {
        if (letter === 'enter') {
            submitWord();
        } else if (letter === 'backspace') {
            deleteLetter();
        } else {
            updateCurrentWord(letter);
        }
    }

    function handleKeyDown(e) {
        if (e.ctrlKey || e.metaKey || e.altKey) {
            return;
        }

        const letter = e.key.toLowerCase();
        const regex = /[а-яёй]/i;

        if (regex.test(letter) || letter === 'enter' || letter === 'backspace') {
            handleNewLetter(letter);

        };

    }

    // ===================================================
    // guessing logic
    // ===================================================

    function getLetterStates(word) {

        let states = [
            letterStates.absent,
            letterStates.absent,
            letterStates.absent,
            letterStates.absent,
            letterStates.absent
        ];

        // here we store letters that were not guessed yet
        // every time we have a green guess - it is removed
        // need to make sure we don't count letter twice
        let notGuessedletters = keyWord.split('');
        let remainingIndexes = [];
        for (let i = 0; i < notGuessedletters.length; i++) {
            remainingIndexes.push(i);

        }

        let guessIndexes = [];

        // first get all greens (to prevent counting twice)
        for (let i = 0; i < keyWord.length; i++) {
            if (word[i] === keyWord[i]) {
                states[i] = letterStates.correct;
                guessIndexes.push(i);
            }
        }

        // remove guesses lertters
        for (var i = guessIndexes.length - 1; i >= 0; i--) {
            notGuessedletters.splice(guessIndexes[i], 1);
            remainingIndexes.splice(guessIndexes[i], 1);
        }

        // now get all yellows
        // go through our guess and -
        // 1. check if we already guessed the letter
        // 2. check if that letter matched the remaining unguessed letters
        for (let i = 0; i < word.length; i++) {
            if (remainingIndexes.includes(i) && notGuessedletters.includes(word[i])) {
                states[i] = letterStates.present;
                let index = notGuessedletters.indexOf(word[i]);
                removeItem(notGuessedletters, index);
            }
        }

        return states;
    }

    function submitWord() {

        let word = currentWordArray.join('');

        // if too short or if not a word
        if (word.length !== 5 || !isValidWord(word)) {
            shakeSquares();
            return;
        }

        guessedWordsArray.push(currentWordArray);

        let wordStates = getLetterStates(word);
        guessedStateArray.push(wordStates);

        // as per https://stackoverflow.com/questions/44955463/creating-a-promise-chain-in-a-for-loop
        let chain = wait(0);

        // reveal squares
        for (let i = 0; i < currentWordArray.length; i++) {
            chain = chain.then(() => {
                const id = (guessedWordsArray.length - 1) * 5 + i + 1;
                const state = guessedStateArray[guessedStateArray.length - 1][i];
                const color = stateColors[state];
                revealSquare(id, color)
            })
                .then(() => wait(revealInterval))
        }

        chain = chain.then(() => wait(revealInterval * 2))
            .then(() => {
                guessedWordsArray[guessedWordsArray.length - 1].forEach((letter, index) => {
                    const oldState = guessedKeysMap.get(letter) || letterStates.absent;
                    guessedKeysMap.set(letter, Math.max(oldState, wordStates[index]))
                });

                updateKeyboard();

                if (word === keyWord) {
                    gameWon();
                } else if (guessedWordsArray.length === 6) {
                    gameLost();
                }

                saveGame();
                syncButtons();

            })

        currentWordArray = []

    }

    function updateKeyboard() {
        guessedKeysMap.forEach((state, letter) => {
            keyLookup.get(letter).style.background = stateColors[state];
            keyLookup.get(letter).style.borderColor = stateColors[state];
        })
    }

    function resetKeyboard() {
        for (const key of keys) {
            key.style.background = "rgb(128, 131, 132)";
            key.style.borderColor = "rgb(128, 131, 132)";
        }
    }

    // ==============================================
    // game state
    // ==============================================

    function updateStatistics(won) {
        statistics.gamesPlayed++;

        if (won) {
            statistics.gamesWon++;
            statistics.currentStreak++;
            statistics.maxStreak = Math.max(statistics.currentStreak, statistics.maxStreak);
            statistics.guesses[guessedWordsArray.length]++;
        } else {
            statistics.currentStreak = 0;
        }

        localStorage.setItem('statistics', JSON.stringify(statistics));
    }

    function gameWon() {
        let bounceInterval = 100;

        gameCurrentState = gameStates.won;

        chain = wait(0);
        for (let i = 0; i < keyWord.length; i++) {
            chain = chain.then(() => bounnceLetter(i))
                .then(() => wait(bounceInterval))
        }
        chain = chain.then(() => wait(1000))
            .then(() => {
                hideSpoilers();
                updateStatistics(true);
                showStatsModal();
            });
    }

    function gameLost() {
        gameCurrentState = gameStates.lost;
        updateStatistics(false);
        showStatsModal();
        window.alert(`Все пропало!\n (слово было: ${keyWord.toUpperCase()})`);
    }



    // ==============================================
    // square behavior
    // ==============================================

    function updateCurrentWord(letter) {

        if (currentWordArray && currentWordArray.length < 5) {
            currentWordArray.push(letter);

            const index = guessedWordsArray.length * 5 + currentWordArray.length

            const nextSquareElement = document.getElementById(String(index));

            nextSquareElement.style.borderColor = colorFilled;
            animateCSS(nextSquareElement, 'pulse');

            nextSquareElement.textContent = letter;
        }
    }

    function deleteLetter() {
        if (currentWordArray && currentWordArray.length > 0) {
            currentWordArray.pop();
            const index = guessedWordsArray.length * 5 + (currentWordArray.length + 1)
            const currentSquareElement = document.getElementById(String(index));
            currentSquareElement.textContent = '';
            currentSquareElement.style.borderColor = colorEmpty;
        }
    }

    function shakeSquares() {
        currentWordArray.forEach((letter, index) => {
            const squareId = guessedWordsArray.length * 5 + index + 1;
            const squareElement = document.getElementById(String(squareId));
            // squareElement.classList.add("animate__headShake");
            animateCSS(squareElement, 'headShake');
        })
    }

    function revealSquare(id, color, letter = null) {
        // const squareId = (guessedWordsArray.length - 1) * 5 + index + 1;
        const squareElement = document.getElementById(String(id));
        animateCSS(squareElement, 'flipInX');
        squareElement.style.background = color;
        squareElement.style.borderColor = color;
        if (letter !== null) {
            squareElement.textContent = letter;
        }
    }

    function bounnceLetter(i) {
        const squareId = (guessedWordsArray.length - 1) * 5 + i + 1;
        const squareElement = document.getElementById(String(squareId));
        animateCSS(squareElement, 'bounce');
    }

    const animateCSS = (node, animation, prefix = 'animate__') =>
        // We create a Promise and return it
        new Promise((resolve, reject) => {
            const animationName = `${prefix}${animation}`;
            // const node = document.querySelector(element);

            node.classList.add(`${prefix}animated`, animationName);

            // When the animation ends, we clean the classes and resolve the Promise
            function handleAnimationEnd(event) {
                event.stopPropagation();
                node.classList.remove(`${prefix}animated`, animationName);
                resolve('Animation ended');
            }

            node.addEventListener('animationend', handleAnimationEnd, {
                once: true
            });
        });


    // ==============================================
    // save load
    // ==============================================

    function restoreState(data) {
        currentWordArray = [];
        guessedStateArray = data.guessedStateArray;
        keyWord = data.keyWord;
        gameCurrentState = data.gameCurrentState;
        guessedKeysMap = new Map(data.guessedKeysMapArray);
        guessedWordsArray = data.guessedWordsArray;

        guessedWordsArray.forEach((word, i) => {
            word.forEach((letter, j) => {
                const squareId = i * 5 + j + 1
                const color = stateColors[guessedStateArray[i][j]];
                revealSquare(squareId, color, letter);
            })
        })
        updateKeyboard();
    };

    function loadGame() {
        let data;
        try {
            data = JSON.parse(localStorage.getItem('data'));
            const savedStats = JSON.parse(localStorage.getItem('statistics'));
            if (savedStats) {
                statistics = savedStats;
            }
        } catch { }

        if (data != null && data.keyWord === keyWord) {
            restoreState(data);
        }
    };

    function saveGame() {
        let guessedKeysMapArray = [...guessedKeysMap]
        let data = JSON.stringify({
            guessedWordsArray,
            guessedStateArray,
            keyWord,
            gameCurrentState,
            guessedKeysMapArray
        })
        try {
            localStorage.setItem('data', data)
        } catch { }
    };
})
