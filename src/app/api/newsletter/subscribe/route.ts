import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const { subscribe = true, tags = [] } = await request.json();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    const email = session.user.email;
    
    if (!email) {
      return NextResponse.json(
        { error: 'E-Mail nicht gefunden' },
        { status: 400 }
      );
    }
    
    // Update/Create Newsletter Subscription
    if (subscribe) {
      await prisma.newsletterSubscription.upsert({
        where: { userId },
        update: {
          status: 'active',
          tags,
          subscribedAt: new Date(),
          unsubscribedAt: null,
        },
        create: {
          userId,
          email,
          status: 'active',
          source: 'signup',
          tags,
        },
      });
    } else {
      // Unsubscribe
      await prisma.newsletterSubscription.updateMany({
        where: { userId },
        data: {
          status: 'unsubscribed',
          unsubscribedAt: new Date(),
        },
      });
    }
    
    return NextResponse.json({ 
      success: true,
      subscribed: subscribe 
    });
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abonnieren', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// GET: Newsletter-Status abrufen
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    const subscription = await prisma.newsletterSubscription.findUnique({
      where: { userId },
    });
    
    return NextResponse.json({
      subscribed: subscription?.status === 'active',
      status: subscription?.status || 'inactive',
      tags: subscription?.tags || [],
    });
  } catch (error) {
    console.error('Error fetching newsletter status:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen des Newsletter-Status' },
      { status: 500 }
    );
  }
}
