import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { saveUserTokens } from './db';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            'openid email profile https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly',
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        const previousUserEmail = token.userEmail;
        const accountEmail =
          (profile as { email?: string })?.email ||
          (typeof token.email === 'string' ? token.email : undefined);
        const sameUser =
          !!previousUserEmail &&
          !!accountEmail &&
          previousUserEmail.toLowerCase() === accountEmail.toLowerCase();

        token.accessToken = account.access_token;
        token.refreshToken =
          account.refresh_token ||
          (sameUser ? (token.refreshToken as string | undefined) : undefined);
        token.hostedDomain = (profile as { hd?: string })?.hd || null;
        token.userEmail = accountEmail;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.refreshToken = token.refreshToken as string;
      session.hostedDomain = token.hostedDomain || null;

      if (session.user && typeof token.userEmail === 'string') {
        session.user.email = token.userEmail;
      }

      if (session.user?.email && session.accessToken) {
        try {
          await saveUserTokens(
            session.user.email,
            session.accessToken,
            session.refreshToken,
            session.hostedDomain || undefined
          );
        } catch (error) {
          console.error('Failed to save user tokens:', error);
        }
      }

      return session;
    }
  }
};
