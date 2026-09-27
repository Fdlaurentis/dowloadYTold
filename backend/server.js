const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 🏆 1. Tu instancia privada de Render como prioridad absoluta
// 2. Instancias comunitarias como respaldo automático
const COBALT_INSTANCES = [
    'https://cobalt-10-93q4.onrender.com/',
    'https://cobalt.timelessnesses.me/',
    'https://api.sideprotect.dev/',
    'https://cobalt.qwyz.net/',
];

app.get('/', (req, res) => {
    res.send('Servidor Backend (Cobalt Multi-Instance API) activo. 🚀');
});

app.post('/api/download', async (req, res) => {
    const { url, format, resolution = '480' } = req.body;

    console.log(`\n==================================================`);
    console.log(`🚀 NUEVA SOLICITUD DE DESCARGA`);
    console.log(` -> URL: ${url}`);
    console.log(` -> Formato: ${format}`);
    console.log(`==================================================`);

    if (!url) {
        return res.status(400).json({ error: 'Ingresa un enlace válido.' });
    }

    const isAudioOnly = format === 'mp3';
    const requestBody = {
        url: url,
        videoQuality: resolution,
        downloadMode: isAudioOnly ? 'audio' : 'auto',
        audioFormat: 'mp3',
        youtubeVideoCodec: 'h264',
    };

    for (const instance of COBALT_INSTANCES) {
        try {
            console.log(`📡 Intentando extracción con: ${instance}`);

            const response = await fetch(instance, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            const data = await response.json();

            // Validación estándar v10 de Cobalt
            if (
                data &&
                (data.status === 'tunnel' ||
                    data.status === 'redirect' ||
                    data.status === 'picker') &&
                data.url
            ) {
                console.log(`✅ ¡Éxito! Enlace generado por ${instance}`);
                return res.json({ downloadUrl: data.url });
            } else if (data && data.url) {
                // Validación heredada
                console.log(`✅ ¡Éxito! Enlace generado por ${instance}`);
                return res.json({ downloadUrl: data.url });
            } else {
                console.warn(
                    `⚠️ La instancia ${instance} no pudo resolver el enlace:`,
                    data,
                );
            }
        } catch (err) {
            console.warn(`⚠️ Error de conexión con ${instance}:`, err.message);
        }
    }

    return res.status(500).json({
        error: 'No se pudo procesar la descarga en este momento. Por favor, intenta nuevamente.',
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`\n🟢 Servidor Backend corriendo en puerto ${PORT}\n`);
});
