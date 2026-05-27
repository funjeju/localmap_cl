import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { FieldValue } from 'firebase-admin/firestore';
import { generateSketchMap } from '@/lib/ai/gemini';
import { adminDb, adminAuth } from '@/lib/firebase/admin';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const {
      imageBase64,
      mimeType,
      style,
      extraPrompt,
      tenantId,
    } = await req.json();

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json({ error: 'imageBase64 is required' }, { status: 400 });
    }

    // Identify caller (optional — we still allow generation without auth,
    // but persistence to Firestore requires both tenantId and a valid token)
    let callerId: string | null = null;
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (token && adminAuth) {
      try {
        const decoded = await adminAuth.verifyIdToken(token);
        callerId = decoded.uid;
      } catch { /* anonymous */ }
    }

    // 1) Generate the sketch via Gemini
    const result = await generateSketchMap({ imageBase64, mimeType, style, extraPrompt });

    // 2) Try to persist both original + generated to Vercel Blob and Firestore.
    //    If persistence fails for any reason (missing token, no tenantId, etc.)
    //    we still return the data URL so the user always gets their image.
    let sketchUrl: string | null = null;
    let originalUrl: string | null = null;
    let sketchMapId: string | null = null;

    if (tenantId && callerId && process.env.BLOB_READ_WRITE_TOKEN && adminDb) {
      try {
        const ts = Date.now();
        const styleSlug = (style || 'illustration').toLowerCase();
        const basePath = `tenants/${tenantId}/sketch-maps/${ts}-${styleSlug}`;

        const sketchBuf = Buffer.from(result.imageBase64, 'base64');
        const originalBuf = Buffer.from(imageBase64, 'base64');

        const [sketchBlob, originalBlob] = await Promise.all([
          put(`${basePath}.${extFor(result.mimeType)}`, sketchBuf, {
            access: 'public',
            contentType: result.mimeType,
            addRandomSuffix: false,
          }),
          put(`${basePath}-source.${extFor(mimeType || 'image/png')}`, originalBuf, {
            access: 'public',
            contentType: mimeType || 'image/png',
            addRandomSuffix: false,
          }),
        ]);

        sketchUrl = sketchBlob.url;
        originalUrl = originalBlob.url;

        // Save metadata in Firestore so the school can browse past sketches
        const docRef = adminDb
          .collection('tenants').doc(tenantId)
          .collection('sketchMaps').doc();
        sketchMapId = docRef.id;
        await docRef.set({
          id: docRef.id,
          tenantId,
          style: style || 'illustration',
          sketchUrl,
          originalUrl,
          mimeType: result.mimeType,
          createdBy: callerId,
          createdAt: FieldValue.serverTimestamp(),
        });
      } catch (persistErr) {
        // Persistence is best-effort. Log and fall back to inline delivery.
        console.error('[sketch-map] persistence failed:', persistErr);
      }
    }

    return NextResponse.json({
      // Prefer the public URL when available, fall back to a data URL.
      imageUrl: sketchUrl,
      originalUrl,
      sketchMapId,
      imageDataUrl: sketchUrl
        ? null
        : `data:${result.mimeType};base64,${result.imageBase64}`,
    });
  } catch (err: any) {
    console.error('generate-sketch-map error', err);
    return NextResponse.json(
      { error: err?.message || '약도 생성에 실패했습니다.' },
      { status: 500 }
    );
  }
}

function extFor(mime: string): string {
  if (mime.includes('png')) return 'png';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('webp')) return 'webp';
  return 'png';
}
