"use strict";

const boldMap = {
    'A': '𝐀', 'B': '𝐁', 'C': '𝐂', 'D': '𝐃', 'E': '𝐄', 'F': '𝐅',
    'G': '𝐆', 'H': '𝐇', 'I': '𝐈', 'J': '𝐉', 'K': '𝐊', 'L': '𝐋',
    'M': '𝐌', 'N': '𝐍', 'O': '𝐎', 'P': '𝐏', 'Q': '𝐐', 'R': '𝐑',
    'S': '𝐒', 'T': '𝐓', 'U': '𝐔', 'V': '𝐕', 'W': '𝐖', 'X': '𝐗',
    'Y': '𝐘', 'Z': '𝐙',
    'a': '𝐚', 'b': '𝐛', 'c': '𝐜', 'd': '𝐝', 'e': '𝐞', 'f': '𝐟',
    'g': '𝐠', 'h': '𝐡', 'i': '𝐢', 'j': '𝐣', 'k': '𝐤', 'l': '𝐥',
    'm': '𝐦', 'n': '𝐧', 'o': '𝐨', 'p': '𝐩', 'q': '𝐪', 'r': '𝐫',
    's': '𝐬', 't': '𝐭', 'u': '𝐮', 'v': '𝐯', 'w': '𝐰', 'x': '𝐱',
    'y': '𝐲', 'z': '𝐳',
    '0': '0', '1': '1', '2': '2', '3': '3', '4': '4', '5': '5',
    '6': '6', '7': '7', '8': '8', '9': '9',
    ' ': ' ', '\n': '\n', '!': '!', '?': '?', '.': '.', ',': ',',
    ':': ':', ';': ';', '-': '-', '_': '_', '/': '/', '\\': '\\',
    '(': '(', ')': ')', '[': '[', ']': ']', '{': '{', '}': '}',
    '@': '@', '#': '#', '$': '$', '%': '%', '&': '&', '*': '*',
    '+': '+', '=': '=', '<': '<', '>': '>', '|': '|', '~': '~',
    '^': '^', '`': '`', "'": "'", '"': '"'
};

function isUrl(text) {
    if (!text || typeof text !== "string") return false;
    const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i;
    return urlPattern.test(text);
}

function toBold(text) {
    if (!text || typeof text !== "string") return text;
    
    const parts = [];
    let currentText = text;
    let pos = 0;
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    let match;
    
    while ((match = urlRegex.exec(text)) !== null) {
        const before = text.slice(pos, match.index);
        if (before) {
            parts.push(before.split('').map(char => boldMap[char] || char).join(''));
        }
        parts.push(match[0]);
        pos = match.index + match[0].length;
    }
    
    if (pos < text.length) {
        const remaining = text.slice(pos);
        parts.push(remaining.split('').map(char => boldMap[char] || char).join(''));
    }
    
    return parts.join('');
}

module.exports = { toBold };