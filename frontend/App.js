import React, { useState } from 'react';
import {
    Text,
    View,
    TextInput,
    TouchableOpacity,
    Platform,
    Modal,
    Linking, // 👈 Agregado para abrir enlaces en dispositivos móviles
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
        setProgress(50);
        setStatusText('Generando enlace con Cobalt API...');

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

            if (!response.ok || data.error || !data.downloadUrl) {
                throw new Error(
                    data.error || 'Ocurrió un error al procesar la solicitud.',
                );
            }

            setProgress(100);
            setStatusText('¡Enlace generado! Iniciando descarga...');
            triggerFileDownload(data.downloadUrl);
        } catch (error) {
            console.error('Error al iniciar descarga:', error);
            showAlert(
                'Error de Solicitud',
                error.message || 'No se pudo conectar con el servidor.',
                'error',
            );
            setLoading(false);
            setProgress(0);
        }
    };

    const triggerFileDownload = (downloadUrl) => {
        if (Platform.OS === 'web') {
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.target = '_blank';
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            showAlert(
                '¡Descarga Exitosa!',
                'El enlace se ha procesado exitosamente y ha comenzado la descarga.',
                'success',
            );
        } else {
            Linking.openURL(downloadUrl).catch(() => {
                showAlert(
                    '¡Descarga Lista!',
                    `Tu archivo está listo. Abre este enlace:\n${downloadUrl}`,
                    'success',
                );
            });
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
