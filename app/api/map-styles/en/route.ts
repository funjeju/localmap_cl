import { NextResponse } from 'next/server';

export async function GET() {
  const style = {
    version: 8,
    name: 'OpenStreetMap',
    metadata: {
      'mapbox:autocomposite': true,
      'mapbox:type': 'template',
    },
    sources: {
      osm: {
        type: 'raster',
        tiles: [
          'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
          'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
          'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
        ],
        tileSize: 256,
        attribution: '© OpenStreetMap contributors',
      },
    },
    layers: [
      {
        id: 'osm-base',
        type: 'raster',
        source: 'osm',
        minzoom: 0,
        maxzoom: 19,
      },
    ],
  };

  return NextResponse.json(style);
}
