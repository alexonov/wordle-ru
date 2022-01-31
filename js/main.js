document.addEventListener("DOMContentLoaded", () => {

    const colorCorrect = "rgb(83, 141, 78)";
    const colorPresent = "rgb(181, 159, 59)";
    const colorWrong = "rgb(58, 58, 60)";

    let vocab = [];
    let keyWord = '';
    let guessedWords = [
        []
    ];
    let keys = [];
    let keyLookup = {};

    var nextSquareIndex = 1;

    const createScene = async () => {
        guessedWords = [
            []
        ];
        nextSquareIndex = 1;

        // loading vocab
        await loadFile('https://alexonov.github.io/wordle-ru/assets/words_5_letters.txt');

        keyWord = generateNewWord();
        // keyWord = 'козон';

        // console.log(`pss.. the word in ${keyWord}`);

        createSquares();

        // getting keys
        keys = document.querySelectorAll('.keyboard-row button');

        // create key lookup
        for (const key of keys) {
            let letter = key.getAttribute("data-key");
            keyLookup[letter] = key;
        }

        // assigning onclick to keys
        for (let i = 0; i < keys.length; i++) {
            keys[i].onclick = ({
                target
            }) => {

                const letter = target.getAttribute("data-key");

                if (letter === 'enter') {
                    submitWord();
                    return;
                } else if (letter === 'del') {
                    deleteLetter();
                    return;
                }
                updateGuessedWords(letter);
            };

        }

    }

    createScene();

    async function loadFile(url) {
        try {
            const response = await fetch(url);
            const data = await response.text();
            vocab = data.split('\n');
        } catch (err) {
            console.error(err);
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
        console.log('here');

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
        let seed = [date.getYear(), date.getMonth(), date.getDate()].join('');
        let rand = seedRandGenerator(parseInt(seed));
        return vocab[Math.floor(rand() * vocab.length)];
    }

    function generateNewWord() {
        // chose new starting word
        let randomIndex = Math.floor(Math.random() * vocab.length);
        return vocab[randomIndex];
    }

    function isValidWord(word) {
        return vocab.includes(word.toLowerCase());
    }

    function removeItem(list, index) {
        if (index > -1) {
            return list.splice(index, 1);
        } else {
            return list;
        }
    }

    function getLetterColors(word) {

        let colors = [colorWrong, colorWrong, colorWrong, colorWrong, colorWrong];

        // here we store letters that were not guessed yet
        // every time we have a green guess - it is removed
        // need to make sure we don't count letter twice
        let notGuessedletters = keyWord.split('');
        let remainingGuesses = word.split('');

        // first get all greens (to prevent counting twice)
        // remove everytime we have a match
        for (let i = 0; i < keyWord.length; i++) {
            if (word[i] === keyWord[i]) {
                colors[i] = colorCorrect;
                notGuessedletters = removeItem(notGuessedletters, i);
                remainingGuesses = removeItem(remainingGuesses, i);
            }
        }
        console.log(notGuessedletters.toString())

        // now get all yellows
        for (let i = 0; i < remainingGuesses.length; i++) {
            if (notGuessedletters.includes(remainingGuesses[i])) {
                colors[i] = colorPresent;
                notGuessedletters = removeItem(notGuessedletters,i);
            }
        }
        console.log(notGuessedletters.toString())

        return colors;
    }

    function gameWon() {
        let currentWordArray = getCurrentWordArray();

        let bounceInterval = 100;

        currentWordArray.forEach((letter, index) => {
            setTimeout(() => {
                const squareId = (guessedWords.length - 1) * 5 + index + 1;
                const squareElement = document.getElementById(String(squareId));
                squareElement.classList.remove("animate__flipInX");
                squareElement.classList.add("animate__bounce");
            }, index * bounceInterval);
        })

        setTimeout(() => {
            window.alert('Ура мол!');
        }, bounceInterval * 10)
    }

    function gameLost() {
        window.alert(`Все пропало! (слово было: ${keyWord.toUpperCase()})`);
    }

    function shakeSquares() {
        let currentWordArray = getCurrentWordArray();

        currentWordArray.forEach((letter, index) => {
            const squareId = (guessedWords.length - 1) * 5 + index + 1;
            const squareElement = document.getElementById(String(squareId));
            squareElement.classList.add("animate__headShake");
        })
    }

    function resetAnimationClass() {
        let currentWordArray = getCurrentWordArray();

        currentWordArray.forEach((letter, index) => {
            const squareId = (guessedWords.length - 1) * 5 + index + 1;
            const squareElement = document.getElementById(String(squareId));
            squareElement.classList.remove("animate__headShake");
        })
    }

    function submitWord() {

        let currentWordArray = getCurrentWordArray();
        let word = currentWordArray.join('');

        // if too short
        if (word.length !== 5) {
            shakeSquares();
            setTimeout(() => {
                window.alert('Слово должно состоять из пяти букв мол');
            }, 100)
            setTimeout(() => {
                resetAnimationClass();
            }, 500)
            return;

            // if not a word
        } else if (!isValidWord(word)) {
            shakeSquares();
            setTimeout(() => {
                window.alert('Такого слова мол не знаю');
            }, 100)
            setTimeout(() => {
                resetAnimationClass();
            }, 500)
            return;

        }

        let colors = getLetterColors(word);

        // milisecs
        const revealInterval = 400;

        // reveal squares
        currentWordArray.forEach((letter, index) => {
            setTimeout(() => {

                const squareColor = colors[index];
                const squareId = (guessedWords.length - 1) * 5 + index + 1;
                const squareElement = document.getElementById(String(squareId));

                // console.log(`tile ${squareId} with letter ${letter} gets color ${squareColor}`);

                squareElement.classList.add("animate__flipInX");

                squareElement.style.background = squareColor;
                squareElement.style.borderColor = squareColor;

            }, revealInterval * index);
        })

        // finish game or continue
        setTimeout(() => {
            // set colors on keyboard 
            // need to do it in acsending order: gray, yellow, green
            for (const color of [colorWrong, colorPresent, colorCorrect]) {
                currentWordArray.forEach((letter, index) => {
                    if (colors[index] == color) {
                        keyLookup[letter].style.background = colors[index];
                        keyLookup[letter].style.borderColor = colors[index];
                    }
                });
            }

            if (word === keyWord) {
                gameWon();
            } else if (guessedWords.length === 6) {
                gameLost();
            } else {
                guessedWords.push([]);
            }
        }, revealInterval * 5)

    }

    function deleteLetter() {
        let currentWordArray = getCurrentWordArray();
        if (currentWordArray && currentWordArray.length > 0) {
            currentWordArray.pop();

            const currentSquareElement = document.getElementById(String(nextSquareIndex - 1));
            currentSquareElement.textContent = '';

            nextSquareIndex -= 1;
        }
    }

    function getCurrentWordArray() {
        const numberOfGuessedWords = guessedWords.length;
        return guessedWords[numberOfGuessedWords - 1];
    }

    function updateGuessedWords(letter) {
        const currentWordArray = getCurrentWordArray();

        if (currentWordArray && currentWordArray.length < 5) {
            currentWordArray.push(letter);


            const nextSquareElement = document.getElementById(String(nextSquareIndex));
            nextSquareElement.textContent = letter;

            nextSquareIndex += 1;
        }
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
})