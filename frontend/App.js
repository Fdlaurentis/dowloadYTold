import React, { useState } from 'react';
import {
    Text,
    View,
    TextInput,
    TouchableOpacity,
    Alert,
    Platform,
} from 'react-native';
import { styles } from './App.styles';

const API_URL =
    process.env.EXPO_PUBLIC_API_URL || 'https://dowloadytold.onrender.com';

export default function App() {
    const [url, setUrl] = useState('');
    const [format, setFormat] = useState('mp4');
    const [resolution, setResolution] = useState('480');
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState('');

    const showAlert = (title, message) => {
        if (Platform.OS === 'web') {
            window.alert(`${title}\n\n${message}`);
        } else {
            Alert.alert(title, message);
        }
    };

    const handleDownload = async () => {
        if (!url.trim()) {
            showAlert(
                'Campo Requerido',
                'Por favor ingresa una URL válida de YouTube.',
            );
            return;
        }

        setLoading(true);
        setProgress(0);
        setStatusText('Conectando con el servidor...');

        try {
            const response = await fetch(`${API_URL}/api/download`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: url.trim(),
                    format,
                    resolution: format === 'mp4' ? resolution : undefined,
                }),
            });

            const data = await response.json();

            if (!response.ok || data.error) {
                throw new Error(
                    data.error || 'Ocurrió un error al procesar la solicitud.',
                );
            }

            pollProgress(data.jobId);
        } catch (error) {
            console.error('Error al iniciar descarga:', error);
            showAlert(
                'Error de Solicitud',
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
                        setStatusText('¡Completado! Transfiriendo archivo...');
                        triggerFileDownload(jobId);
                    } else if (jobData.error) {
                        clearInterval(interval);
                        const errorMsg =
                            jobData.errorMessage ||
                            'Ocurrió un error inesperado al procesar el video.';
                        showAlert('Falla en la Descarga', errorMsg);
                        setLoading(false);
                    }
                }
            } catch (err) {
                console.error('Error consultando progreso:', err);
                clearInterval(interval);
                showAlert(
                    'Error de Red',
                    'Se perdió la conexión con el servidor durante el proceso.',
                );
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

            // Alerta emergente de éxito
            showAlert(
                '🎉 ¡Descarga Exitosa!',
                'El archivo procesado ha comenzado a descargarse en tu navegador.',
            );
        } else {
            showAlert(
                '🎉 ¡Descarga Lista!',
                `Tu archivo está listo para descargar en:\n${fileUrl}`,
            );
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

                <Text style={styles.sectionLabel}>Tipo de Formato:</Text>
                <View style={styles.formatToggleContainer}>
                    <TouchableOpacity
                        style={[
                            styles.formatTab,
                            format === 'mp4' && styles.formatTabActiveMp4,
                        ]}
                        onPress={() => setFormat('mp4')}
                    >
                        <Text
                            style={[
                                styles.formatTabText,
                                format === 'mp4' && styles.formatTabTextActive,
                            ]}
                        >
                            🎥 Video (MP4)
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.formatTab,
                            format === 'mp3' && styles.formatTabActiveMp3,
                        ]}
                        onPress={() => setFormat('mp3')}
                    >
                        <Text
                            style={[
                                styles.formatTabText,
                                format === 'mp3' && styles.formatTabTextActive,
                            ]}
                        >
                            🎵 Audio (MP3)
                        </Text>
                    </TouchableOpacity>
                </View>

                {format === 'mp4' && (
                    <View>
                        <Text style={styles.sectionLabel}>
                            Resolución de Video:
                        </Text>
                        <View style={styles.resolutionRow}>
                            {['360', '480', '720'].map((res) => (
                                <TouchableOpacity
                                    key={res}
                                    style={[
                                        styles.resButton,
                                        resolution === res &&
                                            styles.resButtonActive,
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
                    </View>
                )}

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

                <TouchableOpacity
                    style={[
                        styles.downloadButton,
                        format === 'mp4' ? styles.mp4Button : styles.mp3Button,
                        loading && styles.buttonDisabled,
                    ]}
                    onPress={handleDownload}
                    disabled={loading}
                >
                    <Text style={styles.downloadButtonText}>
                        {format === 'mp4'
                            ? 'Descargar Video MP4'
                            : 'Descargar Audio MP3'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
