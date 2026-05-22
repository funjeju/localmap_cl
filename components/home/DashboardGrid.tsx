'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { subscribeToAuthChanges } from '@/lib/firebase/auth';
import { getUserTenantMemberships } from '@/lib/firebase/memberships';
import { subscribeToPins } from '@/lib/firebase/pins';
import AIAssistantModal from './AIAssistantModal';
import type { Pin } from '@/lib/firebase/models';

export default function DashboardGrid() {
  const [showAIModal, setShowAIModal] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [tenantId, setTenantId] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [pins, setPins] = useState<Pin[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const router = useRouter();

  // Filter categories for recommendations
  const filterCategories = [
    { key: 'all', label: '전체' },
    { key: 'school', label: '학교 주변' },
    { key: 'history', label: '역사' },
    { key: 'nature', label: '자연' },
    { key: 'culture', label: '문화' },
    { key: 'food', label: '맛집' }
  ];

  // Get filtered pins based on selected category
  const getFilteredPins = () => {
    if (selectedFilter === 'all') return pins;
    // Simple filter based on layer or category
    return pins.filter(pin => {
      const layerId = pin.layerId?.toLowerCase() || '';
      return layerId.includes(selectedFilter);
    });
  };

  // Load user and tenant data
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (firebaseUser) => {
      if (!firebaseUser) {
        setLoading(false);
        return;
      }
      setUser(firebaseUser);

      try {
        const memberships = await getUserTenantMemberships(firebaseUser.uid);
        if (memberships.length > 0) {
          setTenantId(memberships[0].tenantId);

          // Fetch tenant name
          const tenantRes = await fetch(`/api/tenant/${memberships[0].tenantId}`);
          if (tenantRes.ok) {
            const tenantData = await tenantRes.json();
            setTenantName(tenantData.tenant?.name?.ko || '학교');
          }
        }
      } catch (err) {
        console.error('Failed to load tenant:', err);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  // Load pins for the first tenant
  useEffect(() => {
    if (!tenantId) return;

    const unsubscribe = subscribeToPins(tenantId, (loadedPins) => {
      setPins(loadedPins.slice(0, 12)); // Show top 12 pins
    });

    return unsubscribe;
  }, [tenantId]);
  return (
    <div className="container mx-auto px-4 py-24 pb-12 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#F9FAFB]">
      
      {/* Left Column: Recommendations & Gamification */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        
        {/* Explore Recommendations */}
        <section className="bg-white rounded-2xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="text-xl">🎒</span> 탐방 추천
            </h2>
            <div className="flex gap-2 text-sm text-gray-500 font-medium overflow-x-auto">
              {filterCategories.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setSelectedFilter(cat.key)}
                  className={`whitespace-nowrap pb-1 ${
                    selectedFilter === cat.key
                      ? 'text-primary border-b-2 border-primary'
                      : 'hover:text-black'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {getFilteredPins().length > 0 ? (
              getFilteredPins().slice(0, 3).map((pin) => (
                <button
                  key={pin.id}
                  onClick={() => {
                    if (tenantId) {
                      router.push(`/ko/tenant/${tenantId}/map?pinId=${pin.id}`);
                    } else {
                      router.push(`/ko/demo/map?pinId=${pin.id}`);
                    }
                  }}
                  className="border rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer text-left"
                >
                    <div className="h-32 bg-gray-200 relative">
                      <img
                        src={pin.images?.[0]?.url || 'https://images.unsplash.com/photo-1594322436404-5a0526db4d13?w=500&q=80'}
                        alt={pin.name.ko}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-2 left-2 bg-white/90 text-xs font-bold px-2 py-1 rounded">{pin.layerId}</span>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold mb-1 truncate">{pin.name.ko}</h3>
                      <p className="text-xs text-gray-500 mb-3 h-8 overflow-hidden">{pin.description?.ko || '탐방해보세요'}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                        <span className="text-yellow-500">★ 5.0</span>
                        <span>최근 핀</span>
                      </div>
                    </div>
                </button>
              ))
            ) : (
              <div className="col-span-3 text-center py-8 text-gray-500">
                <p>탐방 데이터가 없습니다.</p>
                <button
                  onClick={() => {
                    if (tenantId) {
                      router.push(`/ko/tenant/${tenantId}/map`);
                    } else {
                      router.push('/ko/demo/map');
                    }
                  }}
                  className="text-xs text-primary mt-2 inline-block hover:underline"
                >
                  지도에서 탐방 시작하기 →
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Gamification & Timeline Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="bg-white rounded-2xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold">나의 탐방 현황</h2>
              <Link href="/ko/dashboard" className="text-xs text-gray-500 hover:text-black">상세 보기 &gt;</Link>
            </div>
            <div className="flex items-center gap-6 mb-6">
              <div className="w-20 h-20 rounded-full border-4 border-primary/20 flex items-center justify-center relative">
                <span className="text-xl font-bold">{Math.min(100, pins.length * 10)}%</span>
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle
                    cx="38"
                    cy="38"
                    r="36"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="text-primary"
                    strokeDasharray="226"
                    strokeDashoffset={226 - Math.min(226, pins.length * 20)}
                  />
                </svg>
              </div>
              <div>
                <div className="font-bold text-lg">Lv. {Math.floor(pins.length / 5) + 1} 탐험가</div>
                <div className="text-sm text-gray-500">다음 레벨까지 {Math.max(0, 5 - (pins.length % 5))} 탐방</div>
              </div>
            </div>
            <div className="grid grid-cols-4 text-center divide-x">
              <div><div className="text-xs text-gray-500 mb-1">탐방 완료</div><div className="font-bold">{pins.length}</div></div>
              <div><div className="text-xs text-gray-500 mb-1">리뷰 작성</div><div className="font-bold">{Math.floor(pins.length * 0.7)}</div></div>
              <div><div className="text-xs text-gray-500 mb-1">학습 자료</div><div className="font-bold">{Math.floor(pins.length * 0.5)}</div></div>
              <div><div className="text-xs text-gray-500 mb-1">뱃지 획득</div><div className="font-bold">{Math.floor(pins.length / 3)}</div></div>
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">지역 타임라인</h2>
              <Link href="/ko/demo/map" className="text-xs text-gray-500 hover:text-black">더보기</Link>
            </div>
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent pl-6 md:pl-0">
              {[
                { year: '2024년', title: '역삼초등학교 개교 50주년', desc: '역삼초등학교가 개교 50주년을 맞이했습니다.' },
                { year: '1990년대', title: '역삼동 개발 시작', desc: '강남 개발과 함께 역삼동의 변화가 시작되었습니다.' },
                { year: '조선시대', title: '한양 남쪽 관문', desc: '역삼동은 한양의 남쪽 관문 역할을 했습니다.' }
              ].map((item, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (tenantId) {
                      router.push(`/ko/tenant/${tenantId}/map`);
                    } else {
                      router.push('/ko/demo/map');
                    }
                  }}
                  className="relative flex items-start md:justify-center gap-4 w-full text-left hover:opacity-80 transition-opacity"
                >
                  <div className="absolute left-0 md:left-1/2 -ml-2 md:-ml-1.5 mt-1.5 w-3 h-3 rounded-full bg-primary ring-4 ring-white" />
                  <div className="flex flex-col md:w-1/2 text-left md:text-right pr-4">
                    <span className="text-xs font-bold text-primary mb-1">{item.year}</span>
                    <h4 className="font-bold text-sm">{item.title}</h4>
                    <p className="text-xs text-gray-500 mt-1 hidden md:block">{item.desc}</p>
                  </div>
                  <div className="md:w-1/2" />
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Report Banner */}
        <section className="bg-[#466C70] text-white rounded-2xl shadow-sm overflow-hidden flex items-center relative h-40">
          <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-cover bg-left" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1506744626753-143d67414902?w=800&q=80')" }} />
          <div className="absolute inset-0 bg-gradient-to-r from-[#466C70] via-[#466C70]/90 to-transparent" />
          <div className="relative z-10 p-8">
            <h2 className="text-2xl font-bold mb-2">체험학습 보고서</h2>
            <p className="text-sm text-gray-200 mb-4">탐방 내용을 정리하고 멋진 보고서를 만들어보세요</p>
            <button
              onClick={() => {
                if (tenantId) {
                  router.push(`/ko/tenant/${tenantId}/map?tab=export`);
                } else {
                  router.push('/ko/demo/map?tab=export');
                }
              }}
              className="bg-white text-[#466C70] px-4 py-2 font-bold rounded-lg text-sm shadow-sm hover:bg-gray-100"
            >
              보고서 만들기
            </button>
          </div>
        </section>

      </div>

      {/* Right Column: Map & AI & Activity */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        
        {/* Map Widget */}
        <section className="bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col h-[400px]">
          <div className="p-4 border-b flex justify-between items-center bg-gray-50">
            <h2 className="font-bold flex items-center gap-2"><span className="text-green-500">📍</span> 탐방 지도</h2>
            <div className="text-xs bg-white px-2 py-1 border rounded shadow-sm">서울특별시 강남구 ▾</div>
          </div>
          <div className="flex-1 bg-gray-100 relative">
            <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&q=80" alt="Map Placeholder" className="w-full h-full object-cover opacity-50 blur-[1px]" />
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-white/40 backdrop-blur-sm">
              <div className="bg-white p-4 rounded-xl shadow-lg border w-full text-center">
                <div className="flex justify-center mb-2"><span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold">데모</span></div>
                <h3 className="font-bold mb-1">체험용 동네 지도</h3>
                <p className="text-xs text-gray-500 mb-4">지금 바로 지도를 조작해보세요</p>
                <Link href="/ko/demo/map">
                  <button className="w-full bg-[#0F172A] text-white py-2 rounded-lg text-sm font-bold shadow hover:bg-black">탐방하기</button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* AI Summary */}
        <section className="bg-[#F0FDF4] rounded-2xl shadow-sm border p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold flex items-center gap-2"><span className="text-lg">🤖</span> AI 학습 도우미</h2>
            <button onClick={() => setShowAIModal(true)} className="text-xs text-gray-500 hover:text-black">더보기 &gt;</button>
          </div>
          <div className="bg-white/60 p-4 rounded-xl flex justify-between items-center mb-4 border border-white">
            <p className="text-xs text-gray-600">탐방한 내용을 기반으로 AI가<br/>맞춤형 학습 자료를 만들어드려요</p>
            <button 
              onClick={() => setShowAIModal(true)}
              className="bg-white text-gray-800 text-xs px-3 py-1.5 rounded border shadow-sm font-medium hover:bg-gray-50"
            >
              새 학습 자료 만들기
            </button>
          </div>
          <div className="space-y-3">
            {[
              { title: '역삼동의 역사와 발전 과정', date: '생성일 2024.05.20', img: 'https://images.unsplash.com/photo-1594322436404-5a0526db4d13?w=100&q=80' },
              { title: '우리 학교 주변 생태계', date: '생성일 2024.05.19', img: 'https://images.unsplash.com/photo-1548625361-ec8538260b45?w=100&q=80' }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-white p-2 rounded-lg border shadow-sm">
                <img src={item.img} alt="" className="w-10 h-10 rounded object-cover" />
                <div className="flex-1">
                  <h4 className="text-sm font-bold">{item.title}</h4>
                  <div className="text-xs text-gray-400">{item.date}</div>
                </div>
                <button onClick={() => setShowAIModal(true)} className="text-xs text-gray-500 px-2 py-1 border rounded hover:bg-gray-50">보기</button>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Activity */}
        <section className="bg-white rounded-2xl shadow-sm border p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold">최근 활동</h2>
            <Link href="/ko/dashboard" className="text-xs text-gray-500 hover:text-black">더보기 &gt;</Link>
          </div>
          <div className="space-y-4">
            {pins.length > 0 ? (
              pins.slice(0, 3).map((pin) => {
                let createdAt: Date;
                if (pin.createdAt instanceof Date) {
                  createdAt = pin.createdAt;
                } else if (pin.createdAt && typeof pin.createdAt === 'object' && 'toDate' in pin.createdAt) {
                  createdAt = (pin.createdAt as any).toDate();
                } else {
                  createdAt = new Date();
                }
                const now = new Date();
                const diffMs = now.getTime() - createdAt.getTime();
                const diffMins = Math.floor(diffMs / 60000);
                const diffHours = Math.floor(diffMins / 60);
                const diffDays = Math.floor(diffHours / 24);

                let timeText = '방금 전';
                if (diffMins < 60) {
                  timeText = `${diffMins}분 전`;
                } else if (diffHours < 24) {
                  timeText = `${diffHours}시간 전`;
                } else if (diffDays < 7) {
                  timeText = `${diffDays}일 전`;
                }

                return (
                  <div key={pin.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                      {pin.name.ko?.[0] || '📍'}
                    </div>
                    <div className="flex-1 text-sm">
                      <span className="font-bold">{pin.name.ko}</span>를 탐방했어요
                    </div>
                    <div className="text-xs text-gray-400">{timeText}</div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-4 text-gray-500 text-sm">
                <p>아직 활동이 없습니다.</p>
              </div>
            )}
          </div>
        </section>

        {/* Weekly Challenge */}
        <button
          onClick={() => {
            if (tenantId) {
              router.push(`/ko/tenant/${tenantId}/map`);
            } else {
              router.push('/ko/demo/map');
            }
          }}
          className="bg-[#0F172A] text-white rounded-2xl shadow-sm p-6 relative overflow-hidden hover:bg-[#1a1f3a] transition-colors text-left w-full"
        >
          <div className="absolute right-0 bottom-0 opacity-10 text-8xl">🎯</div>
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold flex items-center gap-2">🎯 이번 주 탐방 챌린지</h2>
              <span className="text-xs text-gray-400">더보기 →</span>
            </div>
            <h3 className="text-xl font-bold mb-4">5곳 탐방하기</h3>
            <div className="mb-2 flex justify-end text-sm font-bold text-yellow-400">3/5</div>
            <div className="h-2 bg-white/20 rounded-full mb-4 overflow-hidden">
              <div className="h-full bg-yellow-400 rounded-full w-3/5" />
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-300">보상 100 XP</span>
              <span className="text-2xl">🛡️</span>
            </div>
          </div>
        </button>

      </div>
      
      {showAIModal && <AIAssistantModal onClose={() => setShowAIModal(false)} />}
    </div>
  );
}
