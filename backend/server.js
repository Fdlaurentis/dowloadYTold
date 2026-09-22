const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const ffmpegPath = require('ffmpeg-static');
const {
    ensureYtDlp,
    ytdlpPath,
    downloadsDir,
    getTimestamp,
    startAutoCleaner,
} = require('./utils/ytdlp');

const app = express();

app.use(cors());
app.use(express.json());

<<<<<<< HEAD
const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir);

const isWin = process.platform === 'win32';
const ytdlpBinary = isWin ? 'yt-dlp.exe' : 'yt-dlp';
const ytdlpPath = path.join(__dirname, ytdlpBinary);

const jobs = {};
const getTimestamp = () => new Date().toLocaleTimeString();

function ensureYtDlp() {
    return new Promise((resolve, reject) => {
        if (fs.existsSync(ytdlpPath)) return resolve();

        console.log(
            `[${getTimestamp()}] 📥 Descargando ejecutable oficial de yt-dlp (${ytdlpBinary})...`,
        );
        const url = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${ytdlpBinary}`;

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
                        if (!isWin) fs.chmodSync(ytdlpPath, '755');
                        console.log(
                            `[${getTimestamp()}] ✅ yt-dlp instalado y listo.`,
                        );
                        resolve();
                    });
                })
                .on('error', reject);
        };

        downloadFile(url);
    });
}

app.get('/', (req, res) => {
    res.send('Servidor Backend H.264 Downloader (Entorno Dev) activo.');
=======
const jobs = {};

// Iniciar limpiador automático
startAutoCleaner();

// Función para sanitizar URLs de YouTube de forma estricta
function sanitizeYoutubeUrl(rawUrl) {
    try {
        const parsed = new URL(rawUrl.trim());

        // Caso 1: URL corta (youtu.be/ID)
        if (parsed.hostname.includes('youtu.be')) {
            const videoId = parsed.pathname.slice(1).split('/')[0];
            if (videoId) return `https://www.youtube.com/watch?v=${videoId}`;
        }

        // Caso 2: URL estándar (youtube.com/watch?v=ID)
        const videoId = parsed.searchParams.get('v');
        if (videoId) {
            return `https://www.youtube.com/watch?v=${videoId}`;
        }
    } catch (e) {
        // Si no es un objeto URL válido, intentar fallback básico
    }
    return rawUrl ? rawUrl.split('&')[0] : '';
}

// Clasificador de errores de yt-dlp
function parseYtDlpError(rawErrorLog) {
    const log = rawErrorLog.toLowerCase();

    if (
        log.includes("confirm you're not a bot") ||
        log.includes('bot') ||
        log.includes('429') ||
        log.includes('sign in')
    ) {
        return '🔒 Bloqueo de YouTube: La plataforma detectó tráfico inusual. Intenta de nuevo en unos minutos.';
    }
    if (
        log.includes('proxy') ||
        log.includes('connection') ||
        log.includes('timed out') ||
        log.includes('econnrefused') ||
        log.includes('unable to download webpage')
    ) {
        return '🌐 Error de Conexión: Falla de comunicación con el proxy o con los servidores de YouTube.';
    }
    if (
        log.includes('private video') ||
        log.includes('unavailable') ||
        log.includes('copyright') ||
        log.includes('members-only')
    ) {
        return '🚫 Video no disponible: El video es privado, fue borrado o requiere membresía.';
    }

    return '❌ Error al procesar el video: No se pudo completar la conversión.';
}

app.get('/', (req, res) => {
    res.send('Servidor Backend H.264 Downloader activo.');
>>>>>>> main
});

app.post('/api/download', async (req, res) => {
    const { url, format, resolution = '480' } = req.body;
<<<<<<< HEAD
    const cleanUrl = url ? url.split('&')[0] : '';

    if (!cleanUrl) {
=======
    const cleanUrl = sanitizeYoutubeUrl(url);

    console.log(`\n==================================================`);
    console.log(`[${getTimestamp()}] 🚀 NUEVA SOLICITUD RECIBIDA`);
    console.log(` -> URL Original: ${url}`);
    console.log(` -> URL Sanitizada: ${cleanUrl}`);
    console.log(` -> Formato: ${format ? format.toUpperCase() : 'MP4'}`);
    console.log(`==================================================`);

    if (!cleanUrl || !cleanUrl.includes('youtube.com/watch?v=')) {
>>>>>>> main
        return res
            .status(400)
            .json({ error: 'Ingresa un enlace válido de video de YouTube.' });
    }

    try {
        await ensureYtDlp();
    } catch (err) {
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
        errorLog: '',
        errorMessage: '',
    };

    const args = [
        '--ffmpeg-location',
        ffmpegPath,
        '--newline',
        '--no-playlist',
    ];

<<<<<<< HEAD
=======
    if (process.env.PROXY_URL) {
        const formattedProxy = process.env.PROXY_URL.trim();
        console.log(
            `[${getTimestamp()}] 🛡️ Usando Proxy para evadir bloqueo...`,
        );
        args.push('--proxy', formattedProxy);
    }

>>>>>>> main
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
            `bestvideo[height<=${targetRes}][vcodec^=avc1]+bestaudio[ext=m4a]/bestvideo[height<=${targetRes}]+bestaudio/best[height<=${targetRes}]`,
            '--merge-output-format',
            'mp4',
            '--postprocessor-args',
            'VideoConvertor:-c:v libx264 -preset ultrafast -pix_fmt yuv420p -threads 2 -c:a aac -b:a 128k',
            '-o',
            outputTemplate,
            cleanUrl,
        );
    }

<<<<<<< HEAD
    console.log(
        `[${getTimestamp()}] [Job ${jobId}] ⚙️ Procesando descarga local...`,
    );
    const process = spawn(ytdlpPath, args);

    process.stdout.on('data', (data) => {
=======
    const childProcess = spawn(ytdlpPath, args);

    childProcess.on('error', (err) => {
        console.error(
            `[${getTimestamp()}] [Job ${jobId}] 💥 Error en proceso hijo:`,
            err,
        );
        jobs[jobId].status = 'Error de ejecución en el servidor';
        jobs[jobId].errorMessage =
            '🌐 Error de Conexión: Falla interna al ejecutar el proceso.';
        jobs[jobId].error = true;
    });

    childProcess.stdout.on('data', (data) => {
>>>>>>> main
        const text = data.toString();
        const match = text.match(/(\d{1,3}\.\d)%/);
        if (match) {
            const percent = parseFloat(match[1]);
            jobs[jobId].progress = percent;
            jobs[jobId].status = `Descargando: ${percent}%`;
<<<<<<< HEAD
=======
        } else if (
            text.includes('[VideoConvertor]') ||
            text.includes('[Merger]')
        ) {
            jobs[jobId].status = 'Convirtiendo / Ensamblando archivo MP4...';
            jobs[jobId].progress = 95;
        }
    });

    childProcess.stderr.on('data', (data) => {
        const logLine = data.toString().trim();
        if (logLine) {
            jobs[jobId].errorLog += ' ' + logLine;
>>>>>>> main
        }
    });

    childProcess.on('close', (code) => {
        const files = fs.readdirSync(downloadsDir);
        const downloadedFile = files.find((file) => file.startsWith(jobId));

        if (code === 0 && downloadedFile) {
<<<<<<< HEAD
=======
            console.log(
                `[${getTimestamp()}] [Job ${jobId}] ✅ Descarga exitosa.`,
            );
>>>>>>> main
            jobs[jobId].progress = 100;
            jobs[jobId].status = 'Completado';
            jobs[jobId].fileReady = true;
            jobs[jobId].outputPath = path.join(downloadsDir, downloadedFile);
            jobs[jobId].downloadName = downloadedFile.replace(`${jobId}_`, '');
        } else {
<<<<<<< HEAD
            jobs[jobId].status = 'Error durante el procesamiento';
=======
            const parsedError = parseYtDlpError(jobs[jobId].errorLog);
            console.error(
                `[${getTimestamp()}] [Job ${jobId}] ❌ Error (${code}): ${parsedError}`,
            );

            jobs[jobId].status = 'Error en el proceso';
            jobs[jobId].errorMessage = parsedError;
>>>>>>> main
            jobs[jobId].error = true;
        }
    });

    res.json({ jobId });
});

app.get('/api/progress/:jobId', (req, res) => {
    const job = jobs[req.params.jobId];
    if (!job) return res.status(404).json({ error: 'Trabajo no encontrado' });
    res.json(job);
});

app.get('/api/file/:jobId', (req, res) => {
    const job = jobs[req.params.jobId];
<<<<<<< HEAD
    if (!job || !job.fileReady)
        return res.status(400).json({ error: 'Archivo no listo' });
=======
    if (!job || !job.fileReady) {
        return res.status(400).json({ error: 'El archivo aún no está listo' });
    }
>>>>>>> main

    res.download(job.outputPath, job.downloadName, () => {
        if (fs.existsSync(job.outputPath)) fs.unlinkSync(job.outputPath);
        delete jobs[req.params.jobId];
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
<<<<<<< HEAD
    console.log(`🟢 Backend local corriendo en puerto ${PORT}`);
=======
    console.log(`\n🟢 Servidor Backend corriendo en puerto ${PORT}\n`);
>>>>>>> main
});
