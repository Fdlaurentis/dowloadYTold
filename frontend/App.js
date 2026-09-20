import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    Alert,
    Platform,
} from 'react-native';

// Detecta tu variable de .env (http://localhost:5000) o usa Render como respaldo
const API_URL =
    process.env.EXPO_PUBLIC_API_URL || 'https://dowloadytold.onrender.com';

export default function App() {
    const [url, setUrl] = useState('');
    const [resolution, setResolution] = useState('480');
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState('');

    const showAlert = (title, message) => {
        if (Platform.OS === 'web') {
            window.alert(`${title}: ${message}`);
        } else {
            Alert.alert(title, message);
        }
    };

    const handleDownload = async (format) => {
        if (!url.trim()) {
            showAlert('Error', 'Por favor ingresa una URL válida de YouTube.');
            return;
        }

        setLoading(true);
        setProgress(0);
        setStatusText('Conectando con el servidor...');

        try {
            // 1. Solicitar el inicio de la descarga
            const response = await fetch(`${API_URL}/api/download`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: url.trim(),
                    format,
                    resolution,
                }),
            });

            const data = await response.json();

            if (!response.ok || data.error) {
                throw new Error(
                    data.error || 'Ocurrió un error al procesar el video.',
                );
            }

            // 2. Monitorear el progreso con el jobId recibido
            pollProgress(data.jobId);
        } catch (error) {
            console.error('Error al iniciar descarga:', error);
            showAlert(
                'Error',
                error.message || 'No se pudo conectar con el servidor.',
            );
            setLoading(false);
        }
    };

    const pollProgress = (jobId) => {
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`${API_URL}/api/progress/${jobId}`);
                const jobData = await res.json();

                if (res.ok && jobData) {
                    setProgress(jobData.progress || 0);
                    if (jobData.status) setStatusText(jobData.status);

                    if (jobData.fileReady) {
                        clearInterval(interval);
                        setStatusText('¡Completado! Descargando archivo...');
                        triggerFileDownload(jobId);
                    } else if (jobData.error) {
                        clearInterval(interval);
                        showAlert(
                            'Error',
                            'Ocurrió un error al procesar el video.',
                        );
                        setLoading(false);
                    }
                }
            } catch (err) {
                console.error('Error consultando progreso:', err);
                clearInterval(interval);
                showAlert('Error', 'Error de conexión durante el seguimiento.');
                setLoading(false);
            }
        }, 1000);
    };

    const triggerFileDownload = (jobId) => {
        const fileUrl = `${API_URL}/api/file/${jobId}`;

        if (Platform.OS === 'web') {
            const a = document.createElement('a');
            a.href = fileUrl;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } else {
            showAlert('Listo', `Descarga lista en: ${fileUrl}`);
        }

        setTimeout(() => {
            setLoading(false);
            setProgress(0);
            setStatusText('');
        }, 2000);
    };

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.title}>Media Downloader H.264</Text>
                <Text style={styles.subtitle}>
                    Formato optimizado para reproductores y TVs antiguos
                </Text>

                {/* Campo de Entrada URL */}
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="https://www.youtube.com/watch?v=..."
                        placeholderTextColor="#64748b"
                        value={url}
                        onChangeText={setUrl}
                        autoCapitalize="none"
                    />
                    {url.length > 0 && (
                        <TouchableOpacity
                            onPress={() => setUrl('')}
                            style={styles.clearButton}
                        >
                            <Text style={styles.clearText}>✕</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Selección de Resolución */}
                <Text style={styles.sectionLabel}>Resolución de Video:</Text>
                <View style={styles.resolutionRow}>
                    {['360', '480', '720'].map((res) => (
                        <TouchableOpacity
                            key={res}
                            style={[
                                styles.resButton,
                                resolution === res && styles.resButtonActive,
                            ]}
                            onPress={() => setResolution(res)}
                        >
                            <Text
                                style={[
                                    styles.resButtonText,
                                    resolution === res &&
                                        styles.resButtonTextActive,
                                ]}
                            >
                                {res}p
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Indicador de Progreso */}
                {loading && (
                    <View style={styles.progressContainer}>
                        <Text style={styles.statusText}>
                            {statusText || 'Procesando...'}
                        </Text>
                        <View style={styles.progressBarTrack}>
                            <View
                                style={[
                                    styles.progressBarFill,
                                    { width: `${progress}%` },
                                ]}
                            />
                        </View>
                        <Text style={styles.progressPercent}>
                            {Math.round(progress)}%
                        </Text>
                    </View>
                )}

                {/* Botones de Acción */}
                <View style={styles.buttonRow}>
                    <TouchableOpacity
                        style={[
                            styles.actionButton,
                            styles.mp4Button,
                            loading && styles.buttonDisabled,
                        ]}
                        onPress={() => handleDownload('mp4')}
                        disabled={loading}
                    >
                        <Text style={styles.buttonText}>Descargar MP4</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.actionButton,
                            styles.mp3Button,
                            loading && styles.buttonDisabled,
                        ]}
                        onPress={() => handleDownload('mp3')}
                        disabled={loading}
                    >
                        <Text style={styles.buttonText}>Descargar MP3</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0b0f19',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    card: {
        width: '100%',
        maxWidth: 480,
        backgroundColor: '#111827',
        borderRadius: 16,
        padding: 24,
        borderWidth: 1,
        borderColor: '#1f2937',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 8,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#ffffff',
        textAlign: 'center',
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 13,
        color: '#94a3b8',
        textAlign: 'center',
        marginBottom: 24,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1e293b',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#334155',
        marginBottom: 20,
        paddingHorizontal: 12,
    },
    input: {
        flex: 1,
        height: 48,
        color: '#ffffff',
        fontSize: 14,
    },
    clearButton: {
        padding: 6,
    },
    clearText: {
        color: '#94a3b8',
        fontSize: 16,
        fontWeight: 'bold',
    },
    sectionLabel: {
        fontSize: 13,
        color: '#94a3b8',
        marginBottom: 10,
    },
    resolutionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
        gap: 10,
    },
    resButton: {
        flex: 1,
        height: 42,
        backgroundColor: '#1e293b',
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#334155',
    },
    resButtonActive: {
        backgroundColor: '#be123c',
        borderColor: '#e11d48',
    },
    resButtonText: {
        color: '#94a3b8',
        fontSize: 14,
        fontWeight: '600',
    },
    resButtonTextActive: {
        color: '#ffffff',
    },
    progressContainer: {
        marginBottom: 20,
        alignItems: 'center',
    },
    statusText: {
        color: '#cbd5e1',
        fontSize: 13,
        marginBottom: 8,
    },
    progressBarTrack: {
        width: '100%',
        height: 8,
        backgroundColor: '#1e293b',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 6,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#be123c',
    },
    progressPercent: {
        color: '#ffffff',
        fontSize: 13,
        fontWeight: 'bold',
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        flex: 1,
        height: 48,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    mp4Button: {
        backgroundColor: '#e11d48',
    },
    mp3Button: {
        backgroundColor: '#2563eb',
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 15,
        fontWeight: 'bold',
    },
});
