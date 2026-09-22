import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
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
        marginBottom: 20,
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
        marginBottom: 8,
    },
    formatToggleContainer: {
        flexDirection: 'row',
        backgroundColor: '#1e293b',
        borderRadius: 10,
        padding: 4,
        marginBottom: 20,
        gap: 4,
    },
    formatTab: {
        flex: 1,
        height: 40,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    formatTabActiveMp4: {
        backgroundColor: '#e11d48',
    },
    formatTabActiveMp3: {
        backgroundColor: '#2563eb',
    },
    formatTabText: {
        color: '#94a3b8',
        fontSize: 13,
        fontWeight: '600',
    },
    formatTabTextActive: {
        color: '#ffffff',
        fontWeight: 'bold',
    },
    resolutionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
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
    downloadButton: {
        height: 50,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
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
    downloadButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
