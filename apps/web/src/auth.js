/**
 * WARNING: This file connects this app to Anythings's internal auth system. Do
 * not attempt to edit it. Modifying it will have no effect on your project as it is controlled by our system.
 * Do not import @auth/create or @auth/create anywhere else or it may break. This is an internal package.
 */
import CreateAuth from "@auth/create"
import Google from "@auth/core/providers/google"



export const { auth } = CreateAuth({
  providers: [Google({
        id: 'google',
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        
      })],
  pages: {
    signIn: '/account/signin',
    signOut: '/account/logout',
  },
})