document.addEventListener("DOMContentLoaded", function () {
  const gistUrl = "https://api.github.com/gists/24ae9a223732d2f1f038ce23575a186f";
  let codeMirror = null;
  let selectedLines = "";
  let totalWords = 0;
  let correctWords = 0;
  let incorrectWords = 0;
  let startTime = null;
  let timer = 15;
  let timerInterval = null;
  let loadingGist = false; // Evitar que se cargue un Gist mientras ya está en proceso
  let retries = 5; // Número de intentos para cargar el Gist

  const overlay = document.getElementById("completion-overlay");
  const timerElement = document.getElementById("timer");
  const resultElement = document.getElementById("result");
  const continueButton = document.getElementById("continue-btn");
  const wpmResult = document.getElementById("wpm-result");
  const timerModeSelect = document.getElementById("timerMode"); // Selector del modo

  overlay.classList.add("hidden");

  // Función para limpiar el código (quitar espacios innecesarios)
  function cleanCode(code) {
    return code.trim().replace(/\s+/g, " ").replace(/\r/g, "");
  }

  // NUEVA FUNCIÓN: Resaltar caracteres incorrectos
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

  // Intentar cargar el código desde el Gist con un número máximo de intentos
  function loadCodeFragment() {
    if (loadingGist || retries <= 0) return; // Evitar múltiples peticiones al mismo tiempo

    loadingGist = true;
    fetch(gistUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Error al obtener el Gist");
        }
        return response.json();
      })
      .then((data) => {
        retries = 5; // Resetear los intentos después de una carga exitosa
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

          codeMirror.setValue(""); // Limpiar el editor
          codeMirror.off("change"); // Remover event listener anterior
          codeMirror.on("change", function () {
            const userInput = codeMirror.getValue().trim();
            const cleanedCodeSample = cleanCode(selectedLines);
            const cleanedUserInput = cleanCode(userInput);

            if (cleanedUserInput === "") {
              resultElement.innerText = "";
              resultElement.classList.remove('correct-feedback'); // Eliminar la clase de éxito
              resultElement.style.visibility = 'hidden'; // Ocultar el contenedor de resultados
              return;
            }

            // INTEGRACIÓN: Resaltar caracteres incorrectos
            const highlightedHTML = highlightErrors(cleanedCodeSample, cleanedUserInput);
            resultElement.innerHTML = highlightedHTML; // Mostrar el resultado con resaltado
            resultElement.style.visibility = 'visible';

            if (cleanedUserInput === cleanedCodeSample) {
              resultElement.innerText = "¡Correcto! Bien hecho.";
              resultElement.classList.add('correct-feedback'); // Añadir clase para el éxito
              resultElement.style.visibility = 'visible'; // Mostrar el contenedor de resultados

              setTimeout(() => {
                loadCodeFragment(); // Cargar nuevo fragmento de código
                codeMirror.setValue(""); // Limpiar el editor
                resultElement.classList.remove('correct-feedback'); // Eliminar la clase después de la animación
                resultElement.style.visibility = 'hidden'; // Ocultar el contenedor después de la animación
              }, 2000); // Esperar 2 segundos antes de quitar la clase
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
          setTimeout(loadCodeFragment, 2000); // Reintentar después de 2 segundos
        } else {
          resultElement.innerText = "Error al cargar el código: " + error.message;
          loadingGist = false;
        }
      });
  }

  // Iniciar el temporizador
  function startTimer() {
    if (timerModeSelect.value === "timed") { // Solo iniciar el temporizador si está en el modo cronometrado
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
      timerElement.textContent = "Modo libre"; // Modo libre, no temporizador
      clearInterval(timerInterval); // Detener el temporizador
    }
  }

  // Restablecer el temporizador
  function resetTimer() {
    clearInterval(timerInterval);
    timer = 15;
    timerElement.textContent = timer;
    startTimer();
  }

  // Restablecer WPM
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

  // Detectar el cambio en el selector de modo
  timerModeSelect.addEventListener("change", function () {
    resetTimer();
  });

  loadCodeFragment(); // Cargar el fragmento de código al inicio
  startTimer(); // Inicializamos el temporizador al cargar

  // Cambio de modo claro/oscuro
  const toggleButton = document.getElementById("toggleMode");
  const body = document.body;

  // Verificar si el modo claro está guardado en localStorage
  if (localStorage.getItem("darkMode") === "disabled") {
    body.classList.add("light-mode"); // Activar modo claro por defecto
    toggleButton.textContent = "Activar Modo Oscuro"; // Cambiar texto del botón
  } else {
    body.classList.add("dark-mode"); // Activar modo oscuro por defecto
    toggleButton.textContent = "Activar Modo Claro"; // Cambiar texto del botón
  }

  toggleButton.addEventListener("click", function () {
    // Alternar la clase "dark-mode" y "light-mode"
    if (body.classList.contains("dark-mode")) {
      body.classList.remove("dark-mode");
      body.classList.add("light-mode");
      toggleButton.textContent = "Activar Modo Oscuro"; // Texto para el modo claro
      localStorage.setItem("darkMode", "disabled"); // Guardar preferencia del modo claro
    } else {
      body.classList.remove("light-mode");
      body.classList.add("dark-mode");
      toggleButton.textContent = "Activar Modo Claro"; // Texto para el modo oscuro
      localStorage.setItem("darkMode", "enabled"); // Guardar preferencia del modo oscuro
    }
  });
});



