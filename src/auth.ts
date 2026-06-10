import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/gmail.labels",
            "https://www.googleapis.com/auth/gmail.modify",
          ].join(" "),
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        if (!account.refresh_token) {
          console.warn(
            "[auth] Google did not return a refresh_token. " +
            "Gmail API token refresh will not work. " +
            "Ensure the user re-consents or revoke app access at myaccount.google.com."
          )
        }
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken ?? ""
      session.refreshToken = token.refreshToken ?? "" // empty string if Google withheld refresh_token
      return session
    },
  },
})
