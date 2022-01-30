document.addEventListener("DOMContentLoaded", () => {
    const keyWord = 'балда';

    const vocab = ['балда', 'ааааа', 'ббббб', 'ддддд'];

    createSquares();

    let guessedWords = [
        []
    ];
    let keys = document.querySelectorAll('.keyboard-row button');

    var nextSquareIndex = 1;

    function loadFile(url) {
        console.log(url);
        fetch(url)
            .then(response => response.text())
            .then((data) => {
                console.log(data)
            })
    }

    loadFile('https://alexonov.github.io/balda/assets/vocab.txt');

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

    function isValidWord(word) {
        return vocab.includes(word.toLowerCase());
    }

    function getLetterColors(word) {
        const colorCorrect = "rgb(83, 141, 78)";
        const colorPresent = "rbg(181, 159, 59)";
        const colorWrong = "rgb(58, 58, 60)";

        let colors = [];

        for (let i = 0; i < keyWord.length; i++) {
            if (word[i] === keyWord[i]) {
                colors.push(colorCorrect);
            } else if (keyWord.includes(word[i])) {
                colors.push(colorPresent);
            } else {
                colors.push(colorWrong);
            }
        }
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
        const revealInterval = 600;

        // reveal squares
        currentWordArray.forEach((letter, index) => {
            setTimeout(() => {

                const squareColor = colors[index];
                const squareId = (guessedWords.length - 1) * 5 + index + 1;
                const squareElement = document.getElementById(String(squareId));

                console.log(`tile ${squareId} with letter ${letter} gets color ${squareColor}`);

                squareElement.classList.add("animate__flipInX");

                squareElement.style.background = squareColor;
                squareElement.style.borderColor = squareColor;

            }, revealInterval * index);
        })

        // finish game or continue
        setTimeout(() => {
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