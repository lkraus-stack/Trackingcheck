import NextAuth from "next-auth"
import type { Adapter } from "next-auth/adapters"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/db/prisma"
import { ensureUserRole, isAdminEmail } from "@/lib/auth/admin"
import { getPlanDefaults } from "@/lib/auth/plans"
import { getNextAuthSecret, isVercelServerlessRuntime } from "@/lib/runtime/serverRuntime"

const globalForAuthWarnings = globalThis as typeof globalThis & {
  __trackingCheckerAuthWarnings?: Set<string>
}

const authWarnings = globalForAuthWarnings.__trackingCheckerAuthWarnings ?? new Set<string>()
globalForAuthWarnings.__trackingCheckerAuthWarnings = authWarnings

function warnOnce(key: string, log: () => void) {
  if (authWarnings.has(key)) {
    return
  }

  authWarnings.add(key)
  log()
}

const googleClientId = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET
const nextAuthSecret = getNextAuthSecret()
const shouldWarnAboutAuthConfig = process.env.NODE_ENV === 'development' || isVercelServerlessRuntime()

const missingCriticalVars = !nextAuthSecret ? ['NEXTAUTH_SECRET'] : []
const missingGoogleVars = [
  !googleClientId ? 'GOOGLE_CLIENT_ID' : null,
  !googleClientSecret ? 'GOOGLE_CLIENT_SECRET' : null,
].filter((value): value is string => Boolean(value))

if (missingCriticalVars.length > 0 && process.env.NODE_ENV !== 'test') {
  warnOnce('missing-critical-auth-vars', () => {
    console.error('❌ Missing critical auth environment variables:', missingCriticalVars.join(', '))
    console.error('Set them in `.env.local` for local dev and in Vercel Project Settings for production.')
  })
}

if (!process.env.NEXTAUTH_SECRET && !isVercelServerlessRuntime() && shouldWarnAboutAuthConfig && process.env.NODE_ENV !== 'test') {
  warnOnce('local-fallback-nextauth-secret', () => {
    console.warn('⚠️ NEXTAUTH_SECRET fehlt. Lokal wird ein Fallback-Secret verwendet; für Vercel bitte NEXTAUTH_SECRET explizit setzen.')
  })
}

if (!process.env.NEXTAUTH_URL && !isVercelServerlessRuntime() && shouldWarnAboutAuthConfig && process.env.NODE_ENV !== 'test') {
  warnOnce('missing-local-nextauth-url', () => {
    console.warn('⚠️ NEXTAUTH_URL ist lokal nicht gesetzt. Bitte in `.env.local` auf deine Dev-URL setzen (z.B. http://localhost:3000 oder http://localhost:3001).')
  })
}

// Build providers array - only add Google if credentials are available
const providers = [];
if (googleClientId && googleClientSecret) {
  providers.push(
    Google({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    })
  );
} else {
  if (shouldWarnAboutAuthConfig) {
    warnOnce(`missing-google-oauth:${missingGoogleVars.join(',')}`, () => {
      console.warn(`⚠️ Google OAuth provider not configured - missing ${missingGoogleVars.join(' oder ') || 'Google credentials'}`)
    })
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma) as Adapter,
  secret: nextAuthSecret,
  providers: providers.length > 0 ? providers : [],
  callbacks: {
    async session({ session, user }) {
      // User-ID zur Session hinzufügen (für API Routes)
      if (session.user && user) {
        session.user.id = user.id
        
        // Sicherstellen, dass role gesetzt ist (Backfill für bestehende Nutzer)
        await ensureUserRole(user.id, user.email)

        // Subscription & Usage Limits laden
        const userData = await prisma.user.findUnique({
          where: { id: user.id },
          include: {
            subscription: true,
            usageLimits: true,
          },
        })
        
        if (userData) {
          session.user.role = userData.role === 'admin' ? 'admin' : 'user'
          if (userData.subscription) {
            session.user.subscription = {
              plan: userData.subscription.plan as 'free' | 'pro' | 'enterprise',
              status: userData.subscription.status,
            }
          }
          if (userData.usageLimits) {
            session.user.usageLimits = {
              plan: userData.usageLimits.plan as 'free' | 'pro' | 'enterprise',
              maxAnalysesPerMonth: userData.usageLimits.maxAnalysesPerMonth,
              maxProjects: userData.usageLimits.maxProjects,
              maxAnalysesPerDay: userData.usageLimits.maxAnalysesPerDay,
              aiAnalysisEnabled: userData.usageLimits.aiAnalysisEnabled,
              aiChatEnabled: userData.usageLimits.aiChatEnabled,
              exportPdfEnabled: userData.usageLimits.exportPdfEnabled,
              deepScanEnabled: userData.usageLimits.deepScanEnabled,
              apiAccessEnabled: userData.usageLimits.apiAccessEnabled,
            }
          }
        }
      }
      return session
    },
    async signIn({ user }) {
      // Erstelle UsageLimits wenn User zum ersten Mal einloggt
      if (user.id) {
        try {
          const existingLimits = await prisma.usageLimits.findUnique({
            where: { userId: user.id },
          })
          
          if (!existingLimits) {
            // Erstelle Default Free Plan Limits
            try {
              const defaults = getPlanDefaults('free')
              await prisma.usageLimits.create({
                data: {
                  userId: user.id,
                  ...defaults,
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

          // Admin-User automatisch setzen
          if (user.email && isAdminEmail(user.email)) {
            await prisma.user.update({
              where: { id: user.id },
              data: { role: 'admin' },
            })
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
