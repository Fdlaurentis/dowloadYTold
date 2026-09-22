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

const jobs = {};

// Iniciar limpiador automático de descargas huérfanas
startAutoCleaner();

// Sanitizar URL
function sanitizeYoutubeUrl(rawUrl) {
    try {
        const parsed = new URL(rawUrl.trim());
        if (parsed.hostname.includes('youtu.be')) {
            const videoId = parsed.pathname.slice(1).split('/')[0];
            if (videoId) return `https://www.youtube.com/watch?v=${videoId}`;
        }
        const videoId = parsed.searchParams.get('v');
        if (videoId) return `https://www.youtube.com/watch?v=${videoId}`;
    } catch (e) {}
    return rawUrl ? rawUrl.split('&')[0] : '';
}

app.get('/', (req, res) => {
    res.send('Servidor Backend H.264 Downloader (Local) activo.');
});

app.post('/api/download', async (req, res) => {
    const { url, format, resolution = '480' } = req.body;
    const cleanUrl = sanitizeYoutubeUrl(url);

    console.log(`\n==================================================`);
    console.log(`[${getTimestamp()}] 🚀 NUEVA SOLICITUD LOCAL`);
    console.log(` -> URL Limpia: ${cleanUrl}`);
    console.log(` -> Formato: ${format ? format.toUpperCase() : 'MP4'}`);
    console.log(`==================================================`);

    if (!cleanUrl || !cleanUrl.includes('youtube.com/watch?v=')) {
        return res
            .status(400)
            .json({ error: 'Ingresa un enlace válido de video de YouTube.' });
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
        errorMessage: '',
    };

    const args = [
        '--ffmpeg-location',
        ffmpegPath,
        '--newline',
        '--no-playlist',
    ];

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
            'VideoConvertor:-c:v libx264 -preset ultrafast -pix_fmt yuv420p -threads 2 -c:a aac -b:a 128k',
            '-o',
            outputTemplate,
            cleanUrl,
        );
    }

    const childProcess = spawn(ytdlpPath, args);

    childProcess.on('error', (err) => {
        console.error(
            `[${getTimestamp()}] [Job ${jobId}] 💥 Error en proceso hijo:`,
            err,
        );
        jobs[jobId].status = 'Error de ejecución en el servidor';
        jobs[jobId].errorMessage = 'Error interno al procesar el video.';
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
                `[${getTimestamp()}] [Job ${jobId}] ❌ Error en el proceso (${code})`,
            );
            jobs[jobId].status = 'Error en el proceso';
            jobs[jobId].errorMessage = 'No se pudo descargar el video.';
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
    console.log(`\n🟢 Servidor Backend Local corriendo en puerto ${PORT}\n`);
});
