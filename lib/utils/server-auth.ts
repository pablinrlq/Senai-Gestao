import { withFirebaseAdmin } from "@/lib/firebase/middleware";
import { logger } from "@/lib/logger";

export interface AuthUser {
  id: string;
  nome: string;
  email: string;
  cargo: "ADMINISTRADOR" | "USUARIO" | "FUNCIONARIO";
  ra: string;
  telefone?: string;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

export const verifyAuthToken = async (token: string): Promise<AuthResult> => {
  try {
    if (!token) {
      return { success: false, error: "Token não fornecido" };
    }

    const email = token;

    return new Promise((resolve) => {
      withFirebaseAdmin(async (req, db) => {
        try {
          const userSnapshot = await db
            .collection("usuarios")
            .where("email", "==", email)
            .limit(1)
            .get();

          if (userSnapshot.empty) {
            resolve({ success: false, error: "Usuário não encontrado" });
            return;
          }

          const userDoc = userSnapshot.docs[0];
          type U = Record<string, unknown> & {
            nome?: unknown;
            email?: unknown;
            cargo?: unknown;
            ra?: unknown;
            telefone?: unknown;
          };
          const userData = userDoc.data() as U;

          const userNome =
            typeof userData.nome === "string" ? userData.nome : "";
          const userEmail =
            typeof userData.email === "string" ? userData.email : "";
          const userRa = typeof userData.ra === "string" ? userData.ra : "";
          const userTelefone =
            typeof userData.telefone === "string"
              ? userData.telefone
              : undefined;

          const cargoRaw =
            typeof userData.cargo === "string" ? userData.cargo : "USUARIO";
          const userCargo =
            cargoRaw.toUpperCase() === "ADMINISTRADOR"
              ? "ADMINISTRADOR"
              : cargoRaw.toUpperCase() === "FUNCIONARIO"
              ? "FUNCIONARIO"
              : "USUARIO";

          const user: AuthUser = {
            id: userDoc.id,
            nome: userNome,
            email: userEmail,
            cargo: userCargo,
            ra: userRa,
            telefone: userTelefone,
          };

          resolve({ success: true, user });
        } catch (error) {
          logger.error("Token verification error:", error);
          resolve({ success: false, error: "Erro ao verificar token" });
        }
      })(new Request("http://localhost"));
    });
  } catch (error) {
    logger.error("Auth verification error:", error);
    return { success: false, error: "Erro de autenticação" };
  }
};

export const requireAdmin = async (token: string): Promise<AuthResult> => {
  const authResult = await verifyAuthToken(token);

  if (!authResult.success) {
    return authResult;
  }

  if (authResult.user?.cargo !== "ADMINISTRADOR") {
    return { success: false, error: "Acesso negado. Apenas administradores." };
  }

  return authResult;
};
