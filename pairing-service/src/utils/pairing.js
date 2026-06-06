export function validatePhoneNumber(phone) {
    const cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.length < 8 || cleaned.length > 15) {
        throw new Error('Phone number must be 8-15 digits');
    }
    
    return cleaned;
}

export function generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function parseSessionMetadata(sessionDir) {
    try {
        const metaPath = `${sessionDir}/session-metadata.json`;
        if (!fs.existsSync(metaPath)) return null;
        return JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    } catch (error) {
        return null;
    }
}
