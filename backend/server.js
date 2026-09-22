const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const https = require('https');
const ffmpegPath = require('ffmpeg-static');

const app = express();

app.use(cors());
app.use(express.json());

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
                        if (!isWin) fs.chmodSync(ytdlpPath, '755');
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

app.get('/', (req, res) => {
    res.send('Servidor Backend H.264 Downloader (Producción) activo.');
});

app.post('/api/download', async (req, res) => {
    const { url, format, resolution = '480' } = req.body;
    const cleanUrl = url ? url.split('&')[0] : '';

    console.log(`\n==================================================`);
    console.log(
        `[${getTimestamp()}] 🚀 NUEVA SOLICITUD RECIBIDA EN PRODUCCIÓN`,
    );
    console.log(` -> URL Original: ${url}`);
    console.log(` -> URL Limpia: ${cleanUrl}`);
    console.log(` -> Formato: ${format.toUpperCase()}`);
    console.log(`==================================================`);

    if (!cleanUrl) {
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

    const args = [
        '--ffmpeg-location',
        ffmpegPath,
        '--newline',
        '--no-playlist',
        '--extractor-args',
        'youtube:player_client=mweb,tv_embedded,android,ios',
    ];

    // Inyectar Proxy de Webshare si está configurado en Render
    if (process.env.PROXY_URL) {
        const formattedProxy = process.env.PROXY_URL.trim();
        console.log(
            `[${getTimestamp()}] 🛡️ Usando Proxy residencial para evadir bloqueo...`,
        );
        args.push('--proxy', formattedProxy);
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
        `[${getTimestamp()}] [Job ${jobId}] ⚙️ Ejecutando yt-dlp en Render...`,
    );
    const childProcess = spawn(ytdlpPath, args);

    // Prevenir caídas del servidor Node ante errores no capturados del proceso hijo
    childProcess.on('error', (err) => {
        console.error(
            `[${getTimestamp()}] [Job ${jobId}] 💥 Error crítico en proceso hijo:`,
            err,
        );
        jobs[jobId].status = 'Error al ejecutar el proceso de descarga';
        jobs[jobId].error = true;
    });

    childProcess.stdout.on('data', (data) => {
        const text = data.toString();
        const match = text.match(/(\d{1,3}\.\d)%/);

        if (match) {
            const percent = parseFloat(match[1]);
            jobs[jobId].progress = percent;
            jobs[jobId].status = `Descargando: ${percent}%`;
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
        if (logLine && !logLine.includes('WARNING')) {
            console.log(
                `[${getTimestamp()}] [Job ${jobId}] ℹ️ Log yt-dlp: ${logLine}`,
            );
        }
    });

    childProcess.on('close', (code) => {
        const files = fs.readdirSync(downloadsDir);
        const downloadedFile = files.find((file) => file.startsWith(jobId));

        if (code === 0 && downloadedFile) {
            console.log(
                `[${getTimestamp()}] [Job ${jobId}] ✅ Descarga exitosa.`,
            );
            jobs[jobId].progress = 100;
            jobs[jobId].status = 'Completado';
            jobs[jobId].fileReady = true;
            jobs[jobId].outputPath = path.join(downloadsDir, downloadedFile);
            jobs[jobId].downloadName = downloadedFile.replace(`${jobId}_`, '');
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

app.get('/api/progress/:jobId', (req, res) => {
    const job = jobs[req.params.jobId];
    if (!job) return res.status(404).json({ error: 'Trabajo no encontrado' });
    res.json(job);
});

app.get('/api/file/:jobId', (req, res) => {
    const job = jobs[req.params.jobId];
    if (!job || !job.fileReady) {
        return res.status(400).json({ error: 'El archivo aún no está listo' });
    }

    res.download(job.outputPath, job.downloadName, () => {
        if (fs.existsSync(job.outputPath)) fs.unlinkSync(job.outputPath);
        delete jobs[req.params.jobId];
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(
        `\n🟢 Servidor Backend de Producción corriendo en puerto ${PORT}\n`,
    );
});
