'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export default function HeroSection() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mapContainer.current) return;

    const initMap = async () => {
      try {
        // 사용자 위치 가져오기 (Geolocation API 또는 IP 기반)
        let lat = 37.5665; // 기본값: 서울
        let lng = 126.9780;

        // 1. 브라우저 Geolocation 시도
        if (navigator.geolocation) {
          try {
            const position = await new Promise<GeolocationCoordinates>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(
                (pos) => resolve(pos.coords),
                (err) => reject(err)
              );
            });
            lat = position.latitude;
            lng = position.longitude;
          } catch (err) {
            console.log('Geolocation not available, using IP-based location');
            // 2. IP 기반 위치로 폴백
            try {
              const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3000) });
              const data = await res.json();
              if (data.latitude && data.longitude) {
                lat = data.latitude;
                lng = data.longitude;
              }
            } catch (ipErr) {
              console.log('IP-based location failed, using default location');
            }
          }
        }

        // 지도 초기화
        if (mapContainer.current) {
          map.current = new maplibregl.Map({
            container: mapContainer.current as HTMLElement,
            style: '/api/map-styles/ko',
            center: [lng, lat],
            zoom: 12,
            pitchWithRotate: false,
            dragRotate: false,
            attributionControl: false,
          });
        }

        // 현재 위치 마커
        if (map.current) {
          new maplibregl.Marker({ color: '#3b82f6' })
            .setLngLat([lng, lat])
            .addTo(map.current);
        }

        setLoading(false);
      } catch (error) {
        console.error('Map initialization error:', error);
        setLoading(false);
      }
    };

    initMap();

    return () => {
      map.current?.remove();
    };
  }, []);

  return (
    <section className="relative w-full min-h-[500px] flex items-center justify-center">
      {/* Map Background */}
      <div
        ref={mapContainer}
        className="absolute top-0 left-0 w-full h-[500px] z-0 bg-gradient-to-br from-slate-700 to-slate-900"
      />

      {/* Gradient Overlay - 더 높은 z-index */}
      <div className="absolute top-0 left-0 w-full h-[500px] z-[5] bg-gradient-to-r from-black/70 via-black/50 to-transparent" />

      {/* Loading State */}
      {loading && (
        <div className="absolute top-0 left-0 w-full h-[500px] z-[10] bg-black/30 flex items-center justify-center">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-2"></div>
            <p className="text-sm">지도 로딩 중...</p>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="container relative z-10 px-4 flex flex-col items-start pt-10">
        <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-4 max-w-2xl">
          지도를 넘어, 경험으로 배우는<br/>우리 동네 이야기
        </h1>
        <p className="text-lg text-gray-100 mb-8 max-w-xl">
          학교 주변의 모든 것을 탐험하고, AI와 함께 더 깊이 이해하세요.
        </p>
        <div className="flex gap-4">
          <Link href="/ko/login" className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-lg hover:bg-blue-700 transition-colors">
            탐방 시작하기
          </Link>
          <Link href="/ko/demo/map" className="px-6 py-3 bg-transparent border border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-colors">
            데모 지도 체험하기
          </Link>
        </div>
      </div>

      {/* Floating Cards */}
      <div className="absolute -bottom-16 left-0 right-0 z-20 container px-4 mx-auto hidden md:block">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: '지도 기반 탐방', desc: '우리 학교 주변을 지도에서 탐색해요', icon: '🗺️' },
            { title: 'AI 학습 도우미', desc: 'AI가 요약하고 학습을 도와줘요', icon: '🤖' },
            { title: '체험학습 기록', desc: '탐방을 기록하고 보고서로 만들어요', icon: '📝' },
            { title: '지역 정보 허브', desc: '지역의 역사, 명소 등 모든 정보를 한눈에', icon: '🏛️' },
          ].map((card, idx) => (
            <div key={idx} className="bg-white rounded-xl shadow-lg p-6 border flex gap-4 items-start hover:-translate-y-1 transition-transform">
              <div className="text-2xl bg-muted/50 p-2 rounded-lg">{card.icon}</div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1">{card.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{card.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
