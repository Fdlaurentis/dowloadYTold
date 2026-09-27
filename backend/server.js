const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Servidor Backend (Cobalt v10 API) activo.');
});

app.post('/api/download', async (req, res) => {
    const { url, format, resolution = '480' } = req.body;

    console.log(`\n==================================================`);
    console.log(`🚀 NUEVA SOLICITUD (Cobalt v10 API)`);
    console.log(` -> URL: ${url}`);
    console.log(` -> Formato: ${format}`);
    console.log(`==================================================`);

    if (!url) {
        return res.status(400).json({ error: 'Ingresa un enlace válido.' });
    }

    try {
        const isAudioOnly = format === 'mp3';

        // Configuración con especificación v10
        const requestBody = {
            url: url,
            videoQuality: resolution,
            downloadMode: isAudioOnly ? 'audio' : 'auto',
            audioFormat: 'mp3',
            youtubeVideoCodec: 'h264', // Forzar códec H.264 nativamente
        };

        // Apuntar al endpoint v10 (https://api.cobalt.tools/)
        const response = await fetch('https://api.cobalt.tools/', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        // En v10, las descargas exitosas devuelven status "tunnel" o "redirect" con la URL
        if (
            data &&
            (data.status === 'tunnel' || data.status === 'redirect') &&
            data.url
        ) {
            console.log(`✅ Enlace v10 generado con éxito:`, data.url);
            return res.json({ downloadUrl: data.url });
        } else {
            console.error('❌ Respuesta de error en Cobalt v10:', data);
            const errorDetail =
                data.text ||
                'La API de extracción no pudo procesar este enlace.';
            return res.status(500).json({ error: errorDetail });
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
