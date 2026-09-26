const path = require('path');
const fs = require('fs');
const https = require('https');

const downloadsDir = path.join(__dirname, '..', 'downloads');
if (!fs.existsSync(downloadsDir))
    fs.mkdirSync(downloadsDir, { recursive: true });

const isWin = process.platform === 'win32';
const ytdlpBinary = isWin ? 'yt-dlp.exe' : 'yt-dlp';
const ytdlpPath = path.join(__dirname, '..', ytdlpBinary);
const cookiesPath = path.join(__dirname, '..', 'cookies.txt');

const getTimestamp = () => new Date().toLocaleTimeString();

// Generar cookies.txt dinámicamente desde variable de entorno
function ensureCookies() {
    if (process.env.COOKIES_DATA) {
        try {
            fs.writeFileSync(
                cookiesPath,
                process.env.COOKIES_DATA.trim(),
                'utf8',
            );
            console.log(
                `[${getTimestamp()}] 🍪 Archivo cookies.txt generado desde variable de entorno.`,
            );
        } catch (err) {
            console.error(
                `[${getTimestamp()}] ❌ Error creando cookies.txt:`,
                err,
            );
        }
    }
}

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

function startAutoCleaner() {
    setInterval(
        () => {
            const now = Date.now();
            const maxAge = 15 * 60 * 1000;

            fs.readdir(downloadsDir, (err, files) => {
                if (err) return;
                files.forEach((file) => {
                    const filePath = path.join(downloadsDir, file);
                    fs.stat(filePath, (err, stats) => {
                        if (err) return;
                        if (now - stats.mtimeMs > maxAge) {
                            fs.unlink(filePath, () => {
                                console.log(
                                    `[${getTimestamp()}] 🧹 Limpieza automática: Eliminado "${file}"`,
                                );
                            });
                        }
                    });
                });
            });
        },
        5 * 60 * 1000,
    );
}

module.exports = {
    ensureYtDlp,
    ensureCookies,
    ytdlpPath,
    downloadsDir,
    getTimestamp,
    startAutoCleaner,
};
