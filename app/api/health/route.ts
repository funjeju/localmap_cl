import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function GET() {
  const checks: Record<string, 'ok' | 'error'> = {};
  let overall: 'ok' | 'degraded' = 'ok';

  try {
    await adminDb.collection('_health').doc('ping').get();
    checks.firestore = 'ok';
  } catch {
    checks.firestore = 'error' as const;
    overall = 'degraded';
  }

  const httpStatus = overall === 'degraded' ? 503 : 200;
  return NextResponse.json(
    { status: overall, checks, timestamp: new Date().toISOString() },
    { status: httpStatus }
  );
}
