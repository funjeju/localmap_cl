import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_HOSTS = new Set([
  'map.daumcdn.net',
  'map0.daumcdn.net',
  'map1.daumcdn.net',
  'map2.daumcdn.net',
  'map3.daumcdn.net',
  't1.daumcdn.net',
]);

export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get('url');
  if (!target) {
    return NextResponse.json({ error: 'url query is required' }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return NextResponse.json({ error: 'invalid url' }, { status: 400 });
  }

  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    return NextResponse.json({ error: 'host not allowed' }, { status: 403 });
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      headers: { 'User-Agent': 'Mozilla/5.0 LocalMap-Proxy' },
    });
    if (!upstream.ok) {
      return NextResponse.json({ error: `upstream ${upstream.status}` }, { status: 502 });
    }
    const buf = await upstream.arrayBuffer();
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': upstream.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'proxy failed' }, { status: 500 });
  }
}
