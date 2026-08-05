export declare function loginOtpEmail(input: {
    code: string;
    displayName?: string | null;
    expiresMinutes: number;
}): {
    subject: string;
    text: string;
    html: string;
};
