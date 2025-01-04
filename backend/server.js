const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

// Servir archivos estáticos de la carpeta frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Ruta para servir el archivo index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

// Endpoint para obtener el fragmento de código
app.get('/api/code-sample', (req, res) => {
  const codeSample = `public class Main {
    public static void main(String[] args) {
        System.out.println("Hola Mundo");
    }
  }`;
  res.json({ codeSample: codeSample });
});

app.listen(port, () => {
  console.log(`Servidor funcionando en http://localhost:${port}`);
});
