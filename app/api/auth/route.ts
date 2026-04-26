import { NextResponse } from 'next/server';
import { getDb } from '../../../server/db';
import { users, phoneAuth } from '../../../drizzle/schema';
import { eq, and, gt } from 'drizzle-orm';

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateUserId(): string {
  return `phone_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  const db = await getDb();
  if (!db) {
    return NextResponse.json({ success: false, error: 'Database not available' }, { status: 500 });
  }

  try {
    switch (action) {
      case 'send-otp': {
        const { phone } = await request.json();
        
        if (!phone || !/^\+?[6-9]\d{9,14}$/.test(phone.replace(/\s/g, ''))) {
          return NextResponse.json({ success: false, error: 'Invalid phone number' }, { status: 400 });
        }

        const normalizedPhone = phone.replace(/\s/g, '').replace(/^\+?/, '+');
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await db.delete(phoneAuth).where(eq(phoneAuth.phone, normalizedPhone));

        await db.insert(phoneAuth).values({
          phone: normalizedPhone,
          otp,
          expiresAt,
          verified: 'pending',
        });

        console.log(`[OTP] Phone: ${normalizedPhone}, OTP: ${otp}`);

        return NextResponse.json({ 
          success: true, 
          message: 'OTP sent successfully',
          demoOTP: otp 
        });
      }

      case 'verify-otp': {
        const { phone, otp } = await request.json();

        if (!phone || !otp) {
          return NextResponse.json({ success: false, error: 'Phone and OTP required' }, { status: 400 });
        }

        const normalizedPhone = phone.replace(/\s/g, '').replace(/^\+?/, '+');
        
        const record = await db.select()
          .from(phoneAuth)
          .where(
            and(
              eq(phoneAuth.phone, normalizedPhone),
              eq(phoneAuth.otp, otp),
              gt(phoneAuth.expiresAt, new Date())
            )
          )
          .limit(1);

        if (record.length === 0) {
          return NextResponse.json({ success: false, error: 'Invalid or expired OTP' }, { status: 400 });
        }

        await db.update(phoneAuth)
          .set({ verified: 'verified' })
          .where(eq(phoneAuth.id, record[0].id));

        let user = await db.select().from(users).where(eq(users.phone, normalizedPhone)).limit(1);
        
        if (user.length === 0) {
          const userId = generateUserId();
          await db.insert(users).values({
            openId: userId,
            name: null,
            email: null,
            phone: normalizedPhone,
            loginMethod: 'phone',
            role: 'user',
          });
          
          user = await db.select().from(users).where(eq(users.phone, normalizedPhone)).limit(1);
        }

        const token = Buffer.from(JSON.stringify({ 
          userId: user[0].id, 
          phone: normalizedPhone,
          loginMethod: 'phone',
          exp: Date.now() + 30 * 24 * 60 * 60 * 1000 
        })).toString('base64');

        return NextResponse.json({ 
          success: true, 
          token,
          user: {
            id: user[0].id,
            name: user[0].name,
            phone: user[0].phone,
            email: user[0].email,
          }
        });
      }

      case 'google-login': {
        const { googleId, email, name, avatarUrl } = await request.json();

        if (!googleId || !email) {
          return NextResponse.json({ success: false, error: 'Google ID and email required' }, { status: 400 });
        }

        let user = await db.select().from(users).where(eq(users.email, email)).limit(1);
        
        if (user.length === 0) {
          const userId = `google_${googleId}`;
          await db.insert(users).values({
            openId: userId,
            name: name || email.split('@')[0],
            email,
            loginMethod: 'google',
            avatarUrl: avatarUrl || null,
            role: 'user',
          });
          
          user = await db.select().from(users).where(eq(users.email, email)).limit(1);
        }

        const token = Buffer.from(JSON.stringify({ 
          userId: user[0].id, 
          email,
          loginMethod: 'google',
          exp: Date.now() + 30 * 24 * 60 * 60 * 1000 
        })).toString('base64');

        return NextResponse.json({ 
          success: true, 
          token,
          user: {
            id: user[0].id,
            name: user[0].name,
            phone: user[0].phone,
            email: user[0].email,
          }
        });
      }

      case 'guest-continue': {
        const guestId = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        
        await db.insert(users).values({
          openId: guestId,
          name: 'Guest User',
          email: null,
          loginMethod: 'guest',
          role: 'user',
        });

        const user = await db.select().from(users).where(eq(users.openId, guestId)).limit(1);

        const token = Buffer.from(JSON.stringify({ 
          userId: user[0].id, 
          loginMethod: 'guest',
          exp: Date.now() + 24 * 60 * 60 * 1000 
        })).toString('base64');

        return NextResponse.json({ 
          success: true, 
          token,
          user: { id: user[0].id, name: 'Guest User', loginMethod: 'guest' }
        });
      }

      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[Auth API Error]:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}