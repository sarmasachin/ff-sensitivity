"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROFILE_REGIONS = exports.PROFILE_ROLES = void 0;
exports.cleanDisplayName = cleanDisplayName;
exports.cleanFfUid = cleanFfUid;
exports.cleanChoice = cleanChoice;
exports.cleanRegion = cleanRegion;
exports.PROFILE_ROLES = [
    'Rusher',
    'One-Tap Headshot',
    'Sniper',
    'Flanker',
];
exports.PROFILE_REGIONS = [
    'India',
    'Brazil',
    'Middle East',
    'Singapore',
    'Indonesia',
    'North America',
    'Europe',
    'Latin America',
];
function cleanDisplayName(raw) {
    const name = raw.trim().replace(/\s+/g, ' ');
    if (name.length < 1 || name.length > 40)
        return '';
    if (/[<>]/.test(name))
        return '';
    return name;
}
function cleanFfUid(raw) {
    const uid = raw.trim();
    if (!uid)
        return '';
    if (!/^\d{6,15}$/.test(uid))
        return null;
    return uid;
}
function cleanChoice(raw, allowed) {
    const value = raw.trim();
    if (!value)
        return '';
    return allowed.includes(value) ? value : null;
}
function cleanRegion(raw) {
    const value = raw.trim().replace(/\s+/g, ' ');
    if (!value)
        return '';
    if (value.length > 40)
        return null;
    if (/[<>]/.test(value))
        return null;
    if (exports.PROFILE_REGIONS.includes(value))
        return value;
    return value;
}
//# sourceMappingURL=user-profile.options.js.map