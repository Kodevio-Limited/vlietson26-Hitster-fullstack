declare const _default: () => {
    nodeEnv: string;
    port: number;
    apiUrl: string;
    frontendUrl: string;
    database: {
        host: string | undefined;
        port: number;
        username: string | undefined;
        password: string | undefined;
        database: string | undefined;
        url: string | undefined;
    };
    spotify: {
        clientId: string | undefined;
        clientSecret: string | undefined;
        redirectUri: string | undefined;
    };
    jwt: {
        secret: string | undefined;
        expiresIn: string | undefined;
    };
    qrCode: {
        size: number;
        margin: number;
    };
    throttle: {
        ttl: number;
        limit: number;
    };
    clerk: {
        secretKey: string | undefined;
        publishableKey: string | undefined;
    };
    mail: {
        host: string | undefined;
        port: number;
        user: string | undefined;
        pass: string | undefined;
        from: string | undefined;
    };
};
export default _default;
