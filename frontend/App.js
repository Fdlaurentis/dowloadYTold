import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    Animated,
} from 'react-native';

const API_BASE_URL = 'https://dowloadytold.onrender.com';

export default function App() {
    const [url, setUrl] = useState('');
    const [resolution, setResolution] = useState('480');
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');

    // Validar formato básico de enlaces de YouTube
    const isValidYoutubeUrl = (link) => {
        const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
        return pattern.test(link.trim());
    };

    const handlePaste = async () => {
        try {
            if (navigator.clipboard) {
                const text = await navigator.clipboard.readText();
                setUrl(text);
            }
        } catch (err) {
            alert('No se pudo acceder al portapapeles');
        }
    };

    const startDownload = async (format) => {
        const cleanUrl = url.trim();

        if (!cleanUrl) {
            alert('Por favor, ingresa una URL de YouTube.');
            return;
        }

        if (!isValidYoutubeUrl(cleanUrl)) {
            alert(
                'La URL ingresada no pertenece a un enlace válido de YouTube.',
            );
            return;
        }

        setLoading(true);
        setProgress(0);
        setStatusMessage('Conectando con el servidor...');

        try {
            const res = await fetch(`${API_BASE_URL}/api/download`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: cleanUrl, format, resolution }),
            });

            const data = await res.json();
            if (!res.ok)
                throw new Error(data.error || 'Error al iniciar la descarga');

            const { jobId } = data;

            const interval = setInterval(async () => {
                try {
                    const statusRes = await fetch(
                        `${API_BASE_URL}/api/progress/${jobId}`,
                    );
                    const statusData = await statusRes.json();

                    if (statusData.progress !== undefined) {
                        setProgress(statusData.progress);
                        setStatusMessage(statusData.status);
                    }

                    if (statusData.fileReady) {
                        clearInterval(interval);
                        setStatusMessage('¡Descargando archivo!');

                        window.location.href = `${API_BASE_URL}/api/file/${jobId}`;
                        setUrl('');

                        setTimeout(() => {
                            setLoading(false);
                            setProgress(0);
                            setStatusMessage('');
                        }, 3000);
                    } else if (statusData.error) {
                        clearInterval(interval);
                        alert('Ocurrió un error al procesar el video.');
                        setLoading(false);
                    }
                } catch (err) {
                    clearInterval(interval);
                    setLoading(false);
                }
            }, 3000);
        } catch (err) {
            alert(err.message || 'Error de comunicación con el backend.');
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.title}>Media Downloader H.264</Text>
                <Text style={styles.subtitle}>
                    Formato optimizado para reproductores y TVs antiguos
                </Text>

                {/* Input con acciones rápidas */}
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Pega el enlace de YouTube aquí..."
                        placeholderTextColor="#64748b"
                        value={url}
                        onChangeText={setUrl}
                        autoCapitalize="none"
                        editable={!loading}
                    />
                    {url.length > 0 ? (
                        <TouchableOpacity
                            style={styles.inputActionBtn}
                            onPress={() => setUrl('')}
                            disabled={loading}
                        >
                            <Text style={styles.inputActionText}>✕</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={styles.inputActionBtn}
                            onPress={handlePaste}
                            disabled={loading}
                        >
                            <Text style={styles.inputActionText}>Pegar</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Selector de Resolución */}
                <Text style={styles.label}>Resolución de Video:</Text>
                <View style={styles.resolutionContainer}>
                    {['360', '480', '720'].map((res) => (
                        <TouchableOpacity
                            key={res}
                            disabled={loading}
                            style={[
                                styles.resButton,
                                resolution === res && styles.resButtonActive,
                                loading && styles.disabledBtn,
                            ]}
                            onPress={() => setResolution(res)}
                        >
                            <Text
                                style={[
                                    styles.resText,
                                    resolution === res && styles.resTextActive,
                                ]}
                            >
                                {res}p
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Barra de Progreso */}
                {loading ? (
                    <View style={styles.progressContainer}>
                        <Text style={styles.statusText}>{statusMessage}</Text>
                        <View style={styles.progressBarBackground}>
                            <View
                                style={[
                                    styles.progressBarFill,
                                    { width: `${progress}%` },
                                ]}
                            />
                        </View>
                        <Text style={styles.percentText}>
                            {Math.round(progress)}%
                        </Text>
                    </View>
                ) : (
                    /* Botones de Descarga */
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.btn, styles.btnMp4]}
                            onPress={() => startDownload('mp4')}
                        >
                            <Text style={styles.btnText}>Descargar MP4</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.btn, styles.btnMp3]}
                            onPress={() => startDownload('mp3')}
                        >
                            <Text style={styles.btnText}>Descargar MP3</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    card: {
        backgroundColor: '#1e293b',
        padding: 30,
        borderRadius: 16,
        width: '100%',
        maxWidth: 500,
        borderWidth: 1,
        borderColor: '#334155',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#f8fafc',
        textAlign: 'center',
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 13,
        color: '#94a3b8',
        textAlign: 'center',
        marginBottom: 20,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0f172a',
        borderColor: '#334155',
        borderWidth: 1,
        borderRadius: 8,
        marginBottom: 16,
        paddingRight: 10,
    },
    input: {
        flex: 1,
        padding: 14,
        color: '#fff',
        fontSize: 14,
    },
    inputActionBtn: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: '#334155',
        borderRadius: 6,
    },
    inputActionText: {
        color: '#f8fafc',
        fontSize: 12,
        fontWeight: 'bold',
    },
    label: {
        color: '#94a3b8',
        fontSize: 13,
        marginBottom: 8,
    },
    resolutionContainer: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
    },
    resButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 6,
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: '#334155',
        alignItems: 'center',
    },
    resButtonActive: {
        backgroundColor: '#e11d48',
        borderColor: '#e11d48',
    },
    resText: {
        color: '#94a3b8',
        fontWeight: 'bold',
        fontSize: 13,
    },
    resTextActive: {
        color: '#ffffff',
    },
    disabledBtn: {
        opacity: 0.5,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 10,
    },
    btn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    btnMp4: {
        backgroundColor: '#e11d48',
    },
    btnMp3: {
        backgroundColor: '#2563eb',
    },
    btnText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    progressContainer: {
        alignItems: 'center',
        marginTop: 10,
    },
    statusText: {
        color: '#94a3b8',
        marginBottom: 10,
        fontSize: 13,
    },
    progressBarBackground: {
        width: '100%',
        height: 12,
        backgroundColor: '#0f172a',
        borderRadius: 6,
        overflow: 'hidden',
        borderColor: '#334155',
        borderWidth: 1,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#e11d48',
    },
    percentText: {
        color: '#f8fafc',
        marginTop: 6,
        fontWeight: 'bold',
        fontSize: 14,
    },
});
