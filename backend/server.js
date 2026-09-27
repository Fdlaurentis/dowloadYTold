const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Servidor Backend (Cobalt API) activo y ultra ligero.');
});

app.post('/api/download', async (req, res) => {
    const { url, format, resolution = '480' } = req.body;

    console.log(`\n==================================================`);
    console.log(`🚀 NUEVA SOLICITUD (Vía Cobalt API)`);
    console.log(` -> URL: ${url}`);
    console.log(` -> Formato: ${format}`);
    console.log(`==================================================`);

    if (!url) {
        return res.status(400).json({ error: 'Ingresa un enlace válido.' });
    }

    try {
        const isAudioOnly = format === 'mp3';

        // Parámetros que exige la API de Cobalt
        const requestBody = {
            url: url,
            vQuality: resolution,
            isAudioOnly: isAudioOnly,
            aFormat: isAudioOnly ? 'mp3' : 'best', // Si es mp3, fuerza el formato de audio
        };

        // Consumir la API pública
        const response = await fetch('https://api.cobalt.tools/api/json', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        // Cobalt responde con un JSON que contiene un atributo "url" con el enlace final
        if (data && data.url) {
            console.log(`✅ Enlace generado con éxito`);
            return res.json({ downloadUrl: data.url });
        } else {
            console.error('❌ Respuesta inesperada de Cobalt:', data);
            return res
                .status(500)
                .json({ error: 'La API de extracción falló.' });
        }
    } catch (err) {
        console.error(`❌ Error al conectar con Cobalt:`, err.message);
        return res
            .status(500)
            .json({ error: 'Error interno del servidor de extracción.' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`\n🟢 Servidor Backend ligero corriendo en puerto ${PORT}\n`);
});
