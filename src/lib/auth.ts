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
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.hostedDomain = (profile as { hd?: string })?.hd || null;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.refreshToken = token.refreshToken as string;
      session.hostedDomain = token.hostedDomain || null;

      if (session.user?.email && session.accessToken && session.refreshToken) {
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
