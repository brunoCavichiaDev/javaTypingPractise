document.addEventListener("DOMContentLoaded", function() {
  // Fragmento de código que se mostrará en el editor y como texto visible
  const codeSample = `public class Main {
    public static void main(String[] args) {
        System.out.println("Hola Mundo");
    }
  }`;

  // Mostrar el código de ejemplo como texto visible (en un <pre>)
  document.getElementById('code-sample-visible').innerText = codeSample;

  // Inicializar CodeMirror en el área de código (textarea)
  const codeMirror = CodeMirror.fromTextArea(document.getElementById("code-sample"), {
    lineNumbers: true,
    mode: "java",
    theme: "dracula",
    readOnly: false,  // Permitir la edición del código
    value: codeSample,
    autoCloseBrackets: true,
    matchBrackets: true,
    showCursorWhenSelecting: true
  });

  // Función para comparar el texto que el usuario escribe con el código de ejemplo.
  codeMirror.on("change", function() {
    const userInput = codeMirror.getValue().trim();
    const result = document.getElementById("result");

    if (userInput === codeSample) {
      result.innerText = "¡Correcto! Bien hecho.";
    } else {
      result.innerText = "Hay errores. ¡Inténtalo de nuevo!";
    }
  });

  // Utilizar TypeIt para mostrar el código al usuario (si lo deseas, puedes quitar esto)
  new TypeIt("#code-sample", {
    strings: [codeSample],
    speed: 50,
    waitUntilVisible: true,
    cursor: false  // No mostrar cursor en TypeIt
  }).go();
});
