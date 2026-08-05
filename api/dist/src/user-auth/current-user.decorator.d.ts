export type AuthUser = {
    id: string;
    email: string;
    displayName: string;
};
export declare const CurrentUser: (...dataOrPipes: unknown[]) => ParameterDecorator;
