import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/db/prisma"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      // User-ID zur Session hinzufügen (für API Routes)
      if (session.user && user) {
        session.user.id = user.id
        
        // Subscription & Usage Limits laden
        const userData = await prisma.user.findUnique({
          where: { id: user.id },
          include: {
            subscription: true,
            usageLimits: true,
          },
        })
        
        if (userData) {
          (session.user as any).subscription = userData.subscription
          (session.user as any).usageLimits = userData.usageLimits
        }
      }
      return session
    },
    async signIn({ user, account, profile }) {
      // Erstelle UsageLimits wenn User zum ersten Mal einloggt
      if (user.id) {
        const existingLimits = await prisma.usageLimits.findUnique({
          where: { userId: user.id },
        })
        
        if (!existingLimits) {
          // Erstelle Default Free Plan Limits
          await prisma.usageLimits.create({
            data: {
              userId: user.id,
              plan: 'free',
              maxAnalysesPerMonth: 10,
              maxProjects: 3,
              maxAnalysesPerDay: 5,
              aiAnalysisEnabled: true,
              aiChatEnabled: false,
              exportPdfEnabled: false,
              deepScanEnabled: false,
              apiAccessEnabled: false,
            },
          })
          
          // Erstelle Default Subscription
          await prisma.subscription.create({
            data: {
              userId: user.id,
              plan: 'free',
              status: 'active',
            },
          })
        }
      }
      
      return true
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'database',
  },
})
