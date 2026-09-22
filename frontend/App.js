import React, { useState } from 'react';
import {
    Text,
    View,
    TextInput,
    TouchableOpacity,
    Platform,
    Modal,
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

    // Estado para la Alerta Personalizada (SweetAlert Style)
    const [alertConfig, setAlertConfig] = useState({
        visible: false,
        title: '',
        message: '',
        type: 'info', // 'success' | 'error' | 'info'
    });

    const showAlert = (title, message, type = 'info') => {
        setAlertConfig({ visible: true, title, message, type });
    };

    const hideAlert = () => {
        setAlertConfig((prev) => ({ ...prev, visible: false }));
    };

    const handleDownload = async () => {
        if (!url.trim()) {
            showAlert(
                'Campo Requerido',
                'Por favor ingresa una URL válida de YouTube.',
                'info',
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
                'error',
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
                        showAlert('Falla en la Descarga', errorMsg, 'error');
                        setLoading(false);
                    }
                }
            } catch (err) {
                console.error('Error consultando progreso:', err);
                clearInterval(interval);
                showAlert(
                    'Error de Red',
                    'Se perdió la conexión con el servidor durante el proceso.',
                    'error',
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

            showAlert(
                '¡Descarga Exitosa!',
                'El archivo procesado ha comenzado a descargarse en tu navegador.',
                'success',
            );
        } else {
            showAlert(
                '¡Descarga Lista!',
                `Tu archivo está listo para descargar en:\n${fileUrl}`,
                'success',
            );
        }

        // Limpieza de estado y borrado de URL
        setTimeout(() => {
            setLoading(false);
            setProgress(0);
            setStatusText('');
            setUrl(''); // 🧹 Limpia la URL del Input
        }, 1500);
    };

    // Determinar icono según el tipo de alerta
    const getAlertIcon = () => {
        switch (alertConfig.type) {
            case 'success':
                return '🎉';
            case 'error':
                return '⚠️';
            default:
                return 'ℹ️';
        }
    };

    // Determinar estilo de botón según tipo
    const getButtonStyle = () => {
        switch (alertConfig.type) {
            case 'success':
                return styles.modalButtonSuccess;
            case 'error':
                return styles.modalButtonError;
            default:
                return styles.modalButtonInfo;
        }
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

            {/* MODAL DE ALERTA PERSONALIZADA (ALERT2 STYLE) */}
            <Modal
                visible={alertConfig.visible}
                transparent={true}
                animationType="fade"
                onRequestClose={hideAlert}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalIcon}>{getAlertIcon()}</Text>
                        <Text style={styles.modalTitle}>
                            {alertConfig.title}
                        </Text>
                        <Text style={styles.modalMessage}>
                            {alertConfig.message}
                        </Text>
                        <TouchableOpacity
                            style={[styles.modalButton, getButtonStyle()]}
                            onPress={hideAlert}
                        >
                            <Text style={styles.modalButtonText}>
                                Entendido
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
