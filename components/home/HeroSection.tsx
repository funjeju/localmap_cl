import React from 'react';
import Link from 'next/link';

export default function HeroSection() {
  return (
    <section className="relative w-full h-[500px] flex items-center justify-center bg-[#0F172A] overflow-visible">
      {/* Background Image generated earlier */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-80"
        style={{ backgroundImage: "url('/images/hero.png')" }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-r from-black/60 to-transparent" />

      {/* Content */}
      <div className="container relative z-10 px-4 flex flex-col items-start pt-10">
        <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-4 max-w-2xl">
          지도를 넘어, 경험으로 배우는<br/>우리 동네 이야기
        </h1>
        <p className="text-lg text-gray-200 mb-8 max-w-xl">
          학교 주변의 모든 것을 탐험하고, AI와 함께 더 깊이 이해하세요.
        </p>
        <div className="flex gap-4">
          <Link href="/login" className="px-6 py-3 bg-[#0F172A] text-white font-semibold rounded-lg shadow-lg hover:bg-black transition-colors">
            탐방 시작하기
          </Link>
          <Link href="#" className="px-6 py-3 bg-transparent border border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-colors">
            AI 학습 체험하기
          </Link>
        </div>
      </div>

      {/* Floating Cards */}
      <div className="absolute -bottom-16 left-0 right-0 z-20 container px-4 mx-auto hidden md:block">
        <div className="grid grid-cols-4 gap-4">
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
