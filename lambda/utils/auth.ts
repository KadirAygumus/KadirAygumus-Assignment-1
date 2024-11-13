import { CookieMap, JwtToken, parseCookies, verifyToken } from "../utils/utils";

export async function authenticate(event: any): Promise<JwtToken | null> {
  const cookies: CookieMap = parseCookies(event);

  if (!cookies || !cookies.token) {
    return null; // No token in cookies
  }

  try {
    const verifiedJwt: JwtToken = await verifyToken(
      cookies.token,
      process.env.USER_POOL_ID,
      process.env.REGION!
    );
    return verifiedJwt;
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
}
