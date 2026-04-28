declare class EnvironmentVariables {
    NODE_ENV: string;
    PORT: number;
    DB_HOST: string;
    DB_PORT: number;
    DB_USERNAME: string;
    DB_PASSWORD: string;
    DB_DATABASE: string;
    SPOTIFY_CLIENT_ID: string;
    SPOTIFY_CLIENT_SECRET: string;
    SPOTIFY_REDIRECT_URI: string;
    JWT_SECRET: string;
    JWT_EXPIRES_IN: string;
}
export declare function validate(config: Record<string, unknown>): EnvironmentVariables;
export {};
