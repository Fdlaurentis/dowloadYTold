const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const https = require('https');
const ffmpegPath = require('ffmpeg-static');

const app = express();

// Habilitar CORS para permitir peticiones desde Vercel u otros dominios
app.use(cors());
app.use(express.json());

// Directorio temporal de descargas
const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir);

// Detectar sistema operativo (Windows en local, Linux en Render/Nube)
const isWin = process.platform === 'win32';
const ytdlpBinary = isWin ? 'yt-dlp.exe' : 'yt-dlp';
const ytdlpPath = path.join(__dirname, ytdlpBinary);

// Almacén en memoria de estados de descarga
const jobs = {};

// Obtener marca de tiempo formateada para logs
const getTimestamp = () => new Date().toLocaleTimeString();

// Descarga e instalación automática de yt-dlp (Nightly)
function ensureYtDlp() {
    return new Promise((resolve, reject) => {
        if (fs.existsSync(ytdlpPath)) return resolve();

        console.log(
            `[${getTimestamp()}] 📥 Descargando ejecutable oficial nightly de yt-dlp (${ytdlpBinary})...`,
        );

        const url = `https://github.com/yt-dlp/yt-dlp-nightly-builds/releases/latest/download/${ytdlpBinary}`;

        const downloadFile = (fileUrl) => {
            https
                .get(fileUrl, (res) => {
                    if (res.statusCode === 301 || res.statusCode === 302) {
                        return downloadFile(res.headers.location);
                    }
                    const fileStream = fs.createWriteStream(ytdlpPath);
                    res.pipe(fileStream);
                    fileStream.on('finish', () => {
                        fileStream.close();
                        if (!isWin) fs.chmodSync(ytdlpPath, '755'); // Permisos de ejecución en Linux
                        console.log(
                            `[${getTimestamp()}] ✅ yt-dlp (nightly) instalado y listo.`,
                        );
                        resolve();
                    });
                })
                .on('error', reject);
        };

        downloadFile(url);
    });
}

// Endpoint de verificación de estado del servidor
app.get('/', (req, res) => {
    res.send('Servidor Backend H.264 Downloader activo y funcionando.');
});

// 1. Endpoint para iniciar la descarga
app.post('/api/download', async (req, res) => {
    const { url, format, resolution = '480' } = req.body;

    // Limpiar la URL de parámetros extra (listas de reproducción)
    const cleanUrl = url ? url.split('&')[0] : '';

    console.log(`\n==================================================`);
    console.log(`[${getTimestamp()}] 🚀 NUEVA SOLICITUD RECIBIDA`);
    console.log(` -> URL Original: ${url}`);
    console.log(` -> URL Limpia: ${cleanUrl}`);
    console.log(` -> Formato: ${format.toUpperCase()}`);
    if (format !== 'mp3') console.log(` -> Resolución Máxima: ${resolution}p`);
    console.log(`==================================================`);

    if (!cleanUrl) {
        console.log(`[${getTimestamp()}] ❌ Rechazado: URL vacía`);
        return res
            .status(400)
            .json({ error: 'Ingresa una URL válida de YouTube' });
    }

    try {
        await ensureYtDlp();
    } catch (err) {
        console.error(
            `[${getTimestamp()}] ❌ Error inicializando yt-dlp:`,
            err,
        );
        return res.status(500).json({ error: 'Error interno en el servidor' });
    }

    const jobId = Date.now().toString();
    const ext = format === 'mp3' ? 'mp3' : 'mp4';
    const outputTemplate = path.join(
        downloadsDir,
        `${jobId}_%(title)s.%(ext)s`,
    );

    jobs[jobId] = {
        progress: 0,
        status: 'Iniciando...',
        fileReady: false,
        ext,
    };

    console.log(`[${getTimestamp()}] 🆔 ID de Trabajo generado: ${jobId}`);

    // Configuración de argumentos base
    const args = [
        '--ffmpeg-location',
        ffmpegPath,
        '--newline',
        '--no-playlist',
        '--extractor-args',
        'youtube:player_client=mweb,tv_embedded,android,ios',
    ];

    // INYECCIÓN DEL PROXY (Lee la variable de entorno configurada en Render)
    if (process.env.PROXY_URL) {
        console.log(
            `[${getTimestamp()}] 🛡️ Usando Proxy para evadir bloqueo...`,
        );
        args.push('--proxy', process.env.PROXY_URL);
    }

    if (format === 'mp3') {
        args.push(
            '-x',
            '--audio-format',
            'mp3',
            '--audio-quality',
            '0',
            '-o',
            outputTemplate,
            cleanUrl,
        );
    } else {
        const targetRes = ['360', '480', '720'].includes(resolution)
            ? resolution
            : '480';

        args.push(
            '-f',
            `b[height<=${targetRes}][ext=mp4]/bestvideo[height<=${targetRes}]+bestaudio/best[height<=${targetRes}]/best`,
            '--merge-output-format',
            'mp4',
            '--postprocessor-args',
            'VideoConvertor:-c:v libx264 -preset ultrafast -pix_fmt yuv420p -c:a aac -b:a 128k',
            '-o',
            outputTemplate,
            cleanUrl,
        );
    }

    console.log(
        `[${getTimestamp()}] [Job ${jobId}] ⚙️ Ejecutando procesamiento optimizado...`,
    );
    const process = spawn(ytdlpPath, args);

    let lastLoggedPercent = -1;

    process.stdout.on('data', (data) => {
        const text = data.toString();
        const match = text.match(/(\d{1,3}\.\d)%/);

        if (match) {
            const percent = parseFloat(match[1]);
            jobs[jobId].progress = percent;
            jobs[jobId].status = `Descargando: ${percent}%`;

            if (Math.floor(percent / 10) > Math.floor(lastLoggedPercent / 10)) {
                console.log(
                    `[${getTimestamp()}] [Job ${jobId}] 📥 Progreso de descarga: ${percent}%`,
                );
                lastLoggedPercent = percent;
            }
        } else if (
            text.includes('[VideoConvertor]') ||
            text.includes('[Merger]')
        ) {
            console.log(
                `[${getTimestamp()}] [Job ${jobId}] 🎬 Ensamblando/Verificando formato MP4 (H.264 + AAC)...`,
            );
            jobs[jobId].status = 'Convirtiendo / Ensamblando archivo MP4...';
            jobs[jobId].progress = 95;
        }
    });

    process.stderr.on('data', (data) => {
        const logLine = data.toString().trim();
        if (logLine && !logLine.includes('WARNING')) {
            console.log(
                `[${getTimestamp()}] [Job ${jobId}] ℹ️ Log interno: ${logLine}`,
            );
        }
    });

    process.on('close', (code) => {
        const files = fs.readdirSync(downloadsDir);
        const downloadedFile = files.find((file) => file.startsWith(jobId));

        if (code === 0 && downloadedFile) {
            const fullPath = path.join(downloadsDir, downloadedFile);
            const cleanFileName = downloadedFile.replace(`${jobId}_`, '');

            console.log(
                `[${getTimestamp()}] [Job ${jobId}] ✅ Archivo generado: "${cleanFileName}"`,
            );
            jobs[jobId].progress = 100;
            jobs[jobId].status = 'Completado';
            jobs[jobId].fileReady = true;
            jobs[jobId].outputPath = fullPath;
            jobs[jobId].downloadName = cleanFileName;
        } else {
            console.error(
                `[${getTimestamp()}] [Job ${jobId}] ❌ Error en el proceso. Código de salida: ${code}`,
            );
            jobs[jobId].status = 'Error durante el procesamiento';
            jobs[jobId].error = true;
        }
    });

    res.json({ jobId });
});

// 2. Endpoint para consultar progreso
app.get('/api/progress/:jobId', (req, res) => {
    const job = jobs[req.params.jobId];
    if (!job) return res.status(404).json({ error: 'Trabajo no encontrado' });
    res.json(job);
});

// 3. Endpoint para descargar y eliminar archivo temporal
app.get('/api/file/:jobId', (req, res) => {
    const job = jobs[req.params.jobId];
    if (!job || !job.fileReady) {
        return res.status(400).json({ error: 'El archivo aún no está listo' });
    }

    console.log(
        `[${getTimestamp()}] [Job ${req.params.jobId}] 📤 Transfiriendo "${job.downloadName}" al navegador...`,
    );

    res.download(job.outputPath, job.downloadName, () => {
        console.log(
            `[${getTimestamp()}] [Job ${req.params.jobId}] 🧹 Archivo enviado. Eliminando de disco...`,
        );
        if (fs.existsSync(job.outputPath)) fs.unlinkSync(job.outputPath);
        delete jobs[req.params.jobId];
    });
});

// Asignar el puerto que asigne el proveedor en la nube o el 5000 por defecto
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`🟢 Servidor Backend corriendo en puerto ${PORT}`);
    console.log(`==================================================\n`);
});
