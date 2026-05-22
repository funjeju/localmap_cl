import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.VWORLD_API_KEY || '';

  const style = {
    version: 8,
    name: 'VWorld Korea Map',
    metadata: {
      'mapbox:autocomposite': true,
      'mapbox:type': 'template',
    },
    sources: {
      vworld: {
        type: 'raster',
        tiles: [
          `https://api.vworld.kr/req/wmts/1.0.0/${apiKey}/Base/{z}/{y}/{x}.jpeg`,
        ],
        tileSize: 256,
        attribution: '© VWorld',
      },
    },
    layers: [
      {
        id: 'vworld-base',
        type: 'raster',
        source: 'vworld',
        minzoom: 0,
        maxzoom: 18,
      },
    ],
  };

  return NextResponse.json(style);
}
