import GithubProvider from "next-auth/providers/github"
import { NextAuthOptions } from "next-auth"

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID as string,
      clientSecret: process.env.GITHUB_SECRET as string,
    }),
  ],
  callbacks: {
    async jwt({ token, profile }) {
      if (profile) {
        token.username = (profile as any).login;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        // Attach user ID and username to session
        (session.user as any).id = token.sub;
        if (token.username) {
          (session.user as any).username = token.username;
        }
      }
      return session;
    },
  },
}
