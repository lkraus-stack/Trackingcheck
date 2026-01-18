import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/db/prisma"

// Validate required environment variables at runtime
const requiredEnvVars = {
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
};

const missingVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0 && process.env.NODE_ENV !== 'test') {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  console.error('Please set these in Vercel Dashboard → Settings → Environment Variables');
}

// Build providers array - only add Google if credentials are available
const providers = [];
if (requiredEnvVars.GOOGLE_CLIENT_ID && requiredEnvVars.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: requiredEnvVars.GOOGLE_CLIENT_ID,
      clientSecret: requiredEnvVars.GOOGLE_CLIENT_SECRET,
    })
  );
} else {
  console.warn('⚠️ Google OAuth provider not configured - missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma) as any,
  secret: requiredEnvVars.NEXTAUTH_SECRET,
  providers: providers.length > 0 ? providers : [],
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
          if (userData.subscription) {
            (session.user as any).subscription = userData.subscription
          }
          if (userData.usageLimits) {
            (session.user as any).usageLimits = userData.usageLimits
          }
        }
      }
      return session
    },
    async signIn({ user, account, profile }) {
      // Erstelle UsageLimits wenn User zum ersten Mal einloggt
      if (user.id) {
        try {
          const existingLimits = await prisma.usageLimits.findUnique({
            where: { userId: user.id },
          })
          
          if (!existingLimits) {
            // Erstelle Default Free Plan Limits
            try {
                // WICHTIG: Keine Limits für eingeloggte User - unbegrenzte Analysen
                await prisma.usageLimits.create({
                  data: {
                    userId: user.id,
                    plan: 'free',
                    maxAnalysesPerMonth: 0, // 0 = unlimited
                    maxProjects: 0, // 0 = unlimited
                    maxAnalysesPerDay: 0, // 0 = unlimited
                    aiAnalysisEnabled: true,
                    aiChatEnabled: false,
                    exportPdfEnabled: false,
                    deepScanEnabled: false,
                    apiAccessEnabled: false,
                  },
                })
            } catch (limitsError) {
              console.error('Error creating usage limits:', limitsError)
              // Don't block login if limits creation fails - they can be created later
            }
            
            // Erstelle Default Subscription
            try {
              await prisma.subscription.create({
                data: {
                  userId: user.id,
                  plan: 'free',
                  status: 'active',
                },
              })
            } catch (subscriptionError) {
              console.error('Error creating subscription:', subscriptionError)
              // Don't block login if subscription creation fails - it can be created later
            }
          }
        } catch (error) {
          console.error('Error in signIn callback:', error)
          // Don't block login if there's an error - allow user to sign in
        }
      }
      
      // Always return true to allow login
      return true
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'database',
    maxAge: 30 * 24 * 60 * 60, // 30 Tage
  },
  trustHost: true, // Wichtig für Vercel
})
