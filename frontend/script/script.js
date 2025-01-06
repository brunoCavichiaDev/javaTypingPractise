document.addEventListener("DOMContentLoaded", function () {
  const gistUrl = "https://api.github.com/gists/24ae9a223732d2f1f038ce23575a186f";
  let codeMirror = null;
  let selectedLines = "";
  let totalWords = 0;
  let correctWords = 0;
  let incorrectWords = 0;
  let startTime = null;
  let timer = 30;
  let timerInterval = null;
  let loadingGist = false;
  let retries = 5;

  const overlay = document.getElementById("completion-overlay");
  const timerElement = document.getElementById("timer");
  const resultElement = document.getElementById("result");
  const continueButton = document.getElementById("continue-btn");
  const wpmResult = document.getElementById("wpm-result");
  const timerModeSelect = document.getElementById("timerMode");

  overlay.classList.add("hidden");

  function cleanCode(code) {
    return code.trim().replace(/\s+/g, " ").replace(/\r/g, "");
  }

  function highlightErrors(sample, userInput) {
    let highlighted = "";
    for (let i = 0; i < sample.length; i++) {
      if (sample[i] === userInput[i]) {
        highlighted += `<span class="correct">${sample[i]}</span>`;
      } else {
        highlighted += `<span class="incorrect">${userInput[i] || " "}</span>`;
      }
    }
    if (userInput.length < sample.length) {
      for (let j = userInput.length; j < sample.length; j++) {
        highlighted += `<span class="incorrect">${sample[j]}</span>`;
      }
    }
    return highlighted;
  }

  function loadCodeFragment() {
    if (loadingGist || retries <= 0) return;

    loadingGist = true;
    fetch(gistUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Error al obtener el Gist");
        }
        return response.json();
      })
      .then((data) => {
        retries = 5;
        loadingGist = false;
        if (data.files["codeJava.java"]) {
          const codeSampleText = data.files["codeJava.java"].content;
          const codeLines = codeSampleText.split("\n");
          const startLine = Math.floor(Math.random() * (codeLines.length - 5));
          selectedLines = codeLines.slice(startLine, startLine + 5).join("\n");

          const codeSampleElement = document.getElementById("code-sample-visible");
          codeSampleElement.textContent = selectedLines;

          if (!codeMirror) {
            codeMirror = CodeMirror.fromTextArea(
              document.getElementById("code-sample"),
              {
                lineNumbers: true,
                mode: "java",
                theme: "dracula",
                autoCloseBrackets: true,
                matchBrackets: true,
                showCursorWhenSelecting: true,
              }
            );
          }

          totalWords = cleanCode(selectedLines).split(/\s+/).length;

          codeMirror.setValue("");
          codeMirror.off("change");
          codeMirror.on("change", function () {
            const userInput = codeMirror.getValue().trim();
            const cleanedCodeSample = cleanCode(selectedLines);
            const cleanedUserInput = cleanCode(userInput);

            if (cleanedUserInput === "") {
              resultElement.innerText = "";
              resultElement.classList.remove('correct-feedback');
              resultElement.style.visibility = 'hidden';
              return;
            }

            const highlightedHTML = highlightErrors(cleanedCodeSample, cleanedUserInput);
            resultElement.innerHTML = highlightedHTML;
            resultElement.style.visibility = 'visible';

            if (cleanedUserInput === cleanedCodeSample) {
              resultElement.innerText = "¡Correcto! Bien hecho.";
              resultElement.classList.add('correct-feedback');
              resultElement.style.visibility = 'visible';

              setTimeout(() => {
                loadCodeFragment();
                codeMirror.setValue("");
                resultElement.classList.remove('correct-feedback');
                resultElement.style.visibility = 'hidden';
              }, 2000);
            }
          });
        } else {
          throw new Error('No se encontró el archivo "codeJava.java" en el Gist.');
        }
      })
      .catch((error) => {
        console.error("Error al obtener el Gist:", error);
        retries--;
        if (retries > 0) {
          console.log(`Reintentando... intentos restantes: ${retries}`);
          setTimeout(loadCodeFragment, 2000);
        } else {
          resultElement.innerText = "Error al cargar el código: " + error.message;
          loadingGist = false;
        }
      });
  }

  function startTimer() {
    if (timerModeSelect.value === "timed") {
      timerElement.textContent = timer;
      startTime = Date.now();

      timerInterval = setInterval(() => {
        timer--;
        timerElement.textContent = timer;

        if (timer <= 0) {
          clearInterval(timerInterval);
          timer = 0;
          timerElement.textContent = timer;
          calculateWPM();
          showCompletionOverlay();
        }
      }, 1000);
    } else {
      timerElement.textContent = "Modo libre";
      clearInterval(timerInterval);
    }
  }

  function resetTimer() {
    clearInterval(timerInterval);
    timer = 15;
    timerElement.textContent = timer;
    startTimer();
  }

  function calculateWPM() {
    const elapsedTime = (Date.now() - startTime) / 60000;
    const editorContent = codeMirror.getValue().trim();
    const sampleWords = cleanCode(selectedLines).split(/\s+/);
    const userWords = cleanCode(editorContent).split(/\s+/);

    correctWords = 0;
    incorrectWords = 0;

    for (let i = 0; i < sampleWords.length; i++) {
      if (userWords[i] === sampleWords[i]) {
        correctWords++;
      } else if (userWords[i]) {
        incorrectWords++;
      }
    }

    if (userWords.length > sampleWords.length) {
      incorrectWords += userWords.length - sampleWords.length;
    }

    const penalty = incorrectWords * 0.5;
    const netWPM = Math.max(correctWords - penalty, 0);
    const wpm = (netWPM / elapsedTime).toFixed(2);

    console.log("WPM: ", wpm, "Correct: ", correctWords, "Incorrect: ", incorrectWords);

    wpmResult.innerText = `Tu velocidad: ${wpm} WPM (Correctas: ${correctWords}, Incorrectas: ${incorrectWords})`;
  }

  function showCompletionOverlay() {
    overlay.classList.remove("hidden");
    const completionModal = document.getElementById("completion-modal");
    completionModal.classList.remove("hidden");
  }

  function hideCompletionOverlay() {
    overlay.classList.add("hidden");
    const completionModal = document.getElementById("completion-modal");
    completionModal.classList.add("hidden");
    loadCodeFragment();
    resetTimer();
  }

  continueButton.addEventListener("click", () => {
    hideCompletionOverlay();
  });

  timerModeSelect.addEventListener("change", function () {
    resetTimer();
  });

  loadCodeFragment();
  startTimer();

  const toggleButton = document.getElementById("toggleMode");
  const body = document.body;

  if (localStorage.getItem("darkMode") === "disabled") {
    body.classList.add("light-mode");
    toggleButton.textContent = "Activar Modo Oscuro";
  } else {
    body.classList.add("dark-mode");
    toggleButton.textContent = "Activar Modo Claro";
  }

  toggleButton.addEventListener("click", function () {
    if (body.classList.contains("dark-mode")) {
      body.classList.remove("dark-mode");
      body.classList.add("light-mode");
      toggleButton.textContent = "Activar Modo Oscuro";
      localStorage.setItem("darkMode", "disabled");
    } else {
      body.classList.remove("light-mode");
      body.classList.add("dark-mode");
      toggleButton.textContent = "Activar Modo Claro";
      localStorage.setItem("darkMode", "enabled");
    }
  });
});

