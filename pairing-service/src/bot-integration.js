import fs from 'fs';
import path from 'path';

export function generatePairingCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    
    for (let i = 0; i < 8; i++) {
        if (i === 4) code += '-';
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return code;
}

export function formatPhoneForWhatsApp(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return `${cleaned}@s.whatsapp.net`;
}

export function generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
