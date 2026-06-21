/**
 * JWT issuer/audience constants. Pinned on both signing and validation
 * to lock the algorithm and prevent algorithm-confusion attacks (e.g.
 * HS256 ↔ RS256 swap if a future refactor introduces an asymmetric key
 * without remembering to update passport-jwt).
 *
 * `audience` is consumed by the mobile client too; if you ever need to
 * mint tokens that the mobile app accepts in addition to the dashboard,
 * use a separate audience constant per client.
 */
export const JWT_ISSUER = 'ov-bouwradio';
export const JWT_AUDIENCE = 'ov-bouwradio-api';
export const JWT_ALGORITHMS: ('HS256' | 'HS384' | 'HS512')[] = ['HS256'];