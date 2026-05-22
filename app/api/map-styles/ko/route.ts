import { NextResponse } from 'next/server';

export async function GET() {
  const pmtilesUrl = process.env.PROTOMAPS_TILES_KO_URL;

  const style = {
    version: 8,
    name: 'Protomaps - 백지도',
    metadata: {
      'mapbox:type': 'template',
    },
    sources: {
      protomaps: {
        type: 'vector',
        url: `pmtiles://${pmtilesUrl}`,
        attribution: 'Protomaps © OpenStreetMap contributors',
      },
    },
    layers: [
      // 배경색 (흰색)
      {
        id: 'background',
        type: 'background',
        paint: {
          'background-color': '#ffffff',
        },
      },
      // 물 레이어
      {
        id: 'water',
        type: 'fill',
        source: 'protomaps',
        'source-layer': 'water',
        paint: {
          'fill-color': '#d2e4f9',
        },
      },
      // 수로 (강, 하천)
      {
        id: 'waterway',
        type: 'line',
        source: 'protomaps',
        'source-layer': 'waterway',
        paint: {
          'line-color': '#b8d4e8',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10,
            0.5,
            14,
            1,
            18,
            3,
          ],
        },
      },
      // 도로 - 고속도로
      {
        id: 'roads-highway',
        type: 'line',
        source: 'protomaps',
        'source-layer': 'roads',
        filter: ['==', ['get', 'kind'], 'highway'],
        paint: {
          'line-color': '#d4d4d4',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            8,
            0.5,
            12,
            1.5,
            16,
            3,
          ],
        },
      },
      // 도로 - 일반도로
      {
        id: 'roads-major',
        type: 'line',
        source: 'protomaps',
        'source-layer': 'roads',
        filter: ['==', ['get', 'kind'], 'major_road'],
        paint: {
          'line-color': '#e8e8e8',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10,
            0.3,
            14,
            0.8,
            18,
            2,
          ],
        },
      },
      // 도로 - 보조도로
      {
        id: 'roads-minor',
        type: 'line',
        source: 'protomaps',
        'source-layer': 'roads',
        filter: ['in', ['get', 'kind'], ['literal', ['minor_road', 'path']]],
        paint: {
          'line-color': '#f0f0f0',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            12,
            0.2,
            14,
            0.5,
            18,
            1,
          ],
        },
      },
      // 경계선 - 국경
      {
        id: 'boundaries-national',
        type: 'line',
        source: 'protomaps',
        'source-layer': 'boundaries',
        filter: ['==', ['get', 'kind'], 'national'],
        paint: {
          'line-color': '#999999',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            4,
            0.5,
            8,
            1,
            12,
            1.5,
          ],
        },
      },
      // 경계선 - 시/도 경계
      {
        id: 'boundaries-admin',
        type: 'line',
        source: 'protomaps',
        'source-layer': 'boundaries',
        filter: ['==', ['get', 'kind'], 'state'],
        paint: {
          'line-color': '#cccccc',
          'line-width': 0.8,
          'line-dasharray': [2, 2],
        },
      },
      // 토지이용 - 학교
      {
        id: 'landuse-school',
        type: 'fill',
        source: 'protomaps',
        'source-layer': 'landuse',
        filter: ['==', ['get', 'kind'], 'school'],
        paint: {
          'fill-color': '#fff0d4',
          'fill-opacity': 0.6,
        },
      },
      // 장소 라벨 - 도시/마을 이름만
      {
        id: 'place-labels',
        type: 'symbol',
        source: 'protomaps',
        'source-layer': 'place_labels',
        filter: ['in', ['get', 'kind'], ['literal', ['county', 'locality', 'neighbourhood']]],
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
          'text-size': [
            'interpolate',
            ['linear'],
            ['zoom'],
            8,
            10,
            12,
            14,
            16,
            16,
          ],
          'text-anchor': 'center',
          'text-optional': true,
        },
        paint: {
          'text-color': '#666666',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1,
        },
      },
    ],
  };

  return NextResponse.json(style);
}
