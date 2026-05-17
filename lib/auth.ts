import GithubProvider from "next-auth/providers/github"
import CredentialsProvider from "next-auth/providers/credentials"
import { NextAuthOptions } from "next-auth"
import crypto from "crypto"
import { initializeDatabase, getUserByEmail, createUserWithPassword } from "./neon"

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID as string,
      clientSecret: process.env.GITHUB_SECRET as string,
    }),
    CredentialsProvider({
      name: "Gmail",
      credentials: {
        email: { label: "Gmail", type: "email", placeholder: "yourname@gmail.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const email = credentials.email.toLowerCase().trim();
        const password = credentials.password;

        if (!email.endsWith("@gmail.com")) {
          throw new Error("Please enter a valid @gmail.com address");
        }

        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters long");
        }

        await initializeDatabase();

        const existingUser = await getUserByEmail(email);

        if (existingUser) {
          if (!existingUser.password_hash) {
            throw new Error("This email is registered via GitHub. Please sign in with GitHub.");
          }

          if (existingUser.password_hash !== hashPassword(password)) {
            throw new Error("Incorrect password for this Gmail account");
          }

          return {
            id: email,
            name: email.split('@')[0],
            email: email,
          };
        }

        // Auto-register user
        try {
          await createUserWithPassword(email, hashPassword(password));
          return {
            id: email,
            name: email.split('@')[0],
            email: email,
          };
        } catch (error) {
          console.error("Error auto-registering user:", error);
          throw new Error("Could not register account. Please try again.");
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, profile }) {
      if (profile) {
        token.username = (profile as any).login;
      }
      if (user) {
        token.id = user.id;
        if (!token.username && user.email) {
          token.username = user.email.split('@')[0];
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        // Attach user ID and username to session
        (session.user as any).id = token.sub || token.id;
        if (token.username) {
          (session.user as any).username = token.username;
        }
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
}
