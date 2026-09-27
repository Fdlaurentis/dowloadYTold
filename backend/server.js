const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Lista de instancias públicas comunitarias de Cobalt
const COBALT_INSTANCES = [
    'https://cobalt-api.kwiatek.xyz/',
    'https://api.cobalt.tools/',
];

app.get('/', (req, res) => {
    res.send('Servidor Backend (Cobalt Multi-Instance API) activo.');
});

app.post('/api/download', async (req, res) => {
    const { url, format, resolution = '480' } = req.body;

    console.log(`\n==================================================`);
    console.log(`🚀 NUEVA SOLICITUD (Cobalt API)`);
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

    // Iterar sobre las instancias hasta que una devuelva el enlace
    for (const instance of COBALT_INSTANCES) {
        try {
            console.log(`📡 Probando con instancia: ${instance}`);
            const response = await fetch(instance, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            const data = await response.json();

            // Validar si la instancia entregó una URL válida
            if (
                data &&
                (data.status === 'tunnel' ||
                    data.status === 'redirect' ||
                    data.status === 'picker') &&
                data.url
            ) {
                console.log(
                    `✅ Enlace generado con éxito desde ${instance}:`,
                    data.url,
                );
                return res.json({ downloadUrl: data.url });
            } else if (data && data.url) {
                console.log(
                    `✅ Enlace generado con éxito desde ${instance}:`,
                    data.url,
                );
                return res.json({ downloadUrl: data.url });
            } else {
                console.warn(
                    `⚠️ La instancia ${instance} devolvió respuesta no válida:`,
                    data,
                );
            }
        } catch (err) {
            console.warn(
                `⚠️ Error de red al conectar con ${instance}:`,
                err.message,
            );
        }
    }

    return res.status(500).json({
        error: 'No se pudo procesar la descarga en las instancias disponibles. Inténtalo de nuevo en unos momentos.',
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`\n🟢 Servidor Backend ligero corriendo en puerto ${PORT}\n`);
});
