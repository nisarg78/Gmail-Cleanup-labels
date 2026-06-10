import type { DefaultSession } from "next-auth"

declare module "@auth/core/types" {
  interface Session extends DefaultSession {
    accessToken: string
    refreshToken: string
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    accessToken?: string
    refreshToken?: string
  }
}
