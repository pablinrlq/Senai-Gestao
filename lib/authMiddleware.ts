import * as jwt from "jsonwebtoken";
import { logger } from "@/lib/logger";

type AuthResult =
  | {
      success: true;
      uid: string;
      email?: string;
    }
  | {
      success: false;
      error: string;
      status: number;
    };

export async function verifyAuth(request: Request): Promise<AuthResult> {
  const authHeader = request.headers.get("authorization");
  logger.debug("Authorization Header:", authHeader);

  let token: string | null = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split("Bearer ")[1];
  } else {
    const cookieHeader = request.headers.get("cookie") || "";
    const match = cookieHeader.match(/(?:^|; )session=([^;]+)/);
    if (match) token = decodeURIComponent(match[1]);
  }

  if (!token) {
    return {
      success: false,
      error: "Authorization header missing or malformed",
      status: 401,
    };
  }

  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET environment variable is not set");
    }

    const jwtSecret = process.env.JWT_SECRET;

    const decodedToken = jwt.verify(token, jwtSecret, {
      issuer: "atestado-stock-app",
      audience: "atestado-stock-users",
    }) as jwt.JwtPayload;

    return {
      success: true,
      uid: decodedToken.uid as string,
      email: decodedToken.email as string | undefined,
    };
  } catch (e) {
    console.error("Token verification error:", e);
    return { success: false, error: "Invalid token", status: 401 };
  }
}
