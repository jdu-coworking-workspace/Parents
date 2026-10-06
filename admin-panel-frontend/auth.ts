import NextAuth, { AuthError, CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";

class OTPError extends CredentialsSignin {
  code = "OTPError";
  error?: { error: string; status: number };
  constructor(message: string, error?: { error: string; status: number }) {
    super(message);
    this.name = "OTPError";
    this.error = error;
  }
}

class InvalidCredentialsError extends CredentialsSignin {
  code = "InvalidCredentialsError";
  error?: { error: string; status: number };
  constructor(message: string, error?: { error: string; status: number }) {
    super(message);
    this.name = "InvalidCredentialsError";
    this.error = error;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      // You can specify which fields should be submitted, by adding keys to the `credentials` object.
      // e.g. domain, username, password, 2FA token, etc.
      credentials: {
        email: {},
        password: {},
        newPassword: { type: "password" },
        accessToken: {}, // For OAuth callback
        refreshToken: {}, // For OAuth callback
        userJson: {}, // For OAuth callback - serialized user object
      },
      authorize: async (credentials) => {
        try {
          // Handle OAuth callback scenario
          if (credentials?.accessToken && !credentials?.password) {
            // This is an OAuth callback, we already have the tokens
            // Try using userJson first; if missing, get user info using the access token
            const backendUrl =
              process.env.BACKEND_URL || "http://localhost:3001/admin-panel";
            if (credentials.userJson) {
              const parsed = JSON.parse(credentials.userJson as string);
              return {
                ...parsed,
                given_name: parsed.given_name,
                family_name: parsed.family_name,
                refreshToken: credentials.refreshToken,
                accessToken: credentials.accessToken,
                accessTokenExpires: Date.now() + 60 * 60 * 24 * 1000,
                schoolName: parsed.school_name ?? parsed.schoolName,
              } as any;
            }

            const userInfoResponse = await fetch(`${backendUrl}/user-info`, {
              headers: {
                Authorization: `Bearer ${credentials.accessToken}`,
                "Content-Type": "application/json",
              },
            });

            if (userInfoResponse.ok) {
              const userData = await userInfoResponse.json();
              return {
                ...userData.user,
                given_name: userData.user.given_name,
                family_name: userData.user.family_name,
                refreshToken: credentials.refreshToken,
                accessToken: credentials.accessToken,
                accessTokenExpires: Date.now() + 60 * 60 * 24 * 1000,
                schoolName: userData.school_name,
              };
            } else {
              console.error("Failed to get user info with access token");
              return null;
            }
          }

          // Handle normal email/password login
          let authData: Response;
          if (credentials?.newPassword) {
            authData = await fetch(
              `${process.env.BACKEND_URL}/change-temp-password`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: credentials.email,
                  temp_password: credentials.password,
                  new_password: credentials.newPassword,
                }),
              }
            );
          } else {
            authData = await fetch(`${process.env.BACKEND_URL}/login`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(credentials),
            });
          }

          const status = authData.status;

          let authJson: any = null;
          try {
            authJson = await authData.json();
          } catch {
            authJson = null;
          }

          if (status === 403 || authJson?.error === "NEW_PASSWORD_REQUIRED") {
            throw new OTPError("OTPError", {
              error: authJson?.error || "OTPError",
              status,
            });
          }

          if (status === 401 || (authJson?.error && status !== 200)) {
            throw new InvalidCredentialsError(
              authJson?.error || "InvalidCredentialsError",
              {
                error: authJson?.error || "InvalidCredentialsError",
                status,
              }
            );
          }

          if (status === 200 && authJson?.access_token && authJson?.user) {
            return {
              ...authJson.user,
              given_name: authJson.user.given_name,
              family_name: authJson.user.family_name,
              refreshToken: authJson.refresh_token,
              accessToken: authJson.access_token,
              accessTokenExpires: Date.now() + 60 * 60 * 24 * 1000,
              schoolName: authJson.school_name,
            };
          }

          return null;
        } catch (e) {
          if (e instanceof AuthError || e instanceof CredentialsSignin) {
            throw e;
          }
          console.error("Authorize error:", e);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user, session, trigger }) {
      if (user && user?.accessToken) {
        return {
          ...user,
        };
      }

      if (trigger === "update" && session) {
        if (session.schoolName) token.schoolName = session.schoolName;

        return {
          ...token,
        };
      }

      if (Date.now() < token?.accessTokenExpires) {
        return token;
      }

      if (token?.error === "RefreshAccessTokenError" || !token?.refreshToken) {
        return token;
      }

      // Access token has expired, try to update it
      return refreshAccessToken(token);
    },
    session({ session, token }) {
      session.sessionToken = token?.accessToken as string;
      session.expires = new Date(token?.accessTokenExpires as number) as Date &
        string;
      session.schoolName = token?.schoolName as string;
      session.error = (token?.error ?? "") as string;

      session.user.given_name = token?.given_name as string;
      session.user.family_name = token?.family_name as string;
      session.user.role = token?.role;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});

async function refreshAccessToken(token: any) {
  if (!token?.refreshToken) {
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }

  try {
    const response = await fetch(`${process.env.BACKEND_URL}/refresh-token`, {
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify({
        refresh_token: token.refreshToken,
      }),
    });

    if (!response.ok) {
      let errData = null;
      try {
        errData = await response.json();
      } catch {}
      console.warn("Failed to refresh access token:", response.status, errData);
      return {
        ...token,
        error: "RefreshAccessTokenError",
      };
    }

    const refreshedTokens = await response.json();

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + 60 * 60 * 24 * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken, // Fall back to old refresh token
      error: "",
    };
  } catch (error) {
    console.error("Refresh token network error:", error);

    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}
