export declare function staffInviteEmail(input: {
    displayName: string;
    email: string;
    temporaryPassword: string;
    loginUrl: string;
    resent?: boolean;
}): {
    subject: string;
    text: string;
    html: string;
};
