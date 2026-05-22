import React, { useState, useEffect } from 'react';

export default function AIAssistantModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer1 = setTimeout(() => setStep(1), 1500);
    const timer2 = setTimeout(() => setStep(2), 3500);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🤖</span>
            <div>
              <h2 className="text-xl font-bold">AI 맞춤형 학습 자료 생성기</h2>
              <p className="text-sm opacity-90">선생님이 지도에 남긴 핀들을 분석하고 있습니다.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto bg-gray-50">
          <div className="space-y-6">
            
            {/* Step 0: Analyzing */}
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 text-emerald-600">🤖</div>
              <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 w-full max-w-md">
                <p className="text-sm text-gray-700 flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></span>
                  지도에 등록된 24개의 핀 데이터를 분석 중입니다...
                </p>
              </div>
            </div>

            {/* Step 1: Found Topics */}
            {step >= 1 && (
              <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 text-emerald-600">🤖</div>
                <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 w-full max-w-md">
                  <p className="text-sm text-gray-700 mb-2">분석 완료! 주로 <strong>'역사'</strong>와 <strong>'자연'</strong> 카테고리의 탐방이 많았네요. 다음 주제로 학습 자료를 구성할까요?</p>
                  <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
                    <li>조선시대 왕릉(선릉)의 구조와 의미</li>
                    <li>도심 속 생태계(도곡공원) 관찰 일지</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Step 2: Generated Content */}
            {step >= 2 && (
              <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 text-emerald-600">🤖</div>
                <div className="bg-white p-5 rounded-2xl rounded-tl-none shadow-sm border border-emerald-200 w-full">
                  <h3 className="font-bold text-lg text-emerald-800 mb-3 border-b pb-2">도심 속 생태와 역사의 숨결 (추천 학습 자료)</h3>
                  
                  <div className="prose prose-sm max-w-none text-gray-700">
                    <p><strong>📍 탐방 개요:</strong> 우리 동네 강남구 한복판에 자리한 <strong>선릉과 정릉</strong>, 그리고 <strong>도곡공원</strong>을 넘나들며 과거와 현재, 그리고 자연을 동시에 배우는 코스입니다.</p>
                    
                    <h4>1. 선릉 (역사)</h4>
                    <p>조선 제9대 왕 성종과 정현왕후의 능입니다. 도심 속 빌딩 숲 사이에 보존된 거대한 숲과 능선은 훌륭한 역사 교보재입니다. <em>질문: 왕릉 앞에는 왜 항상 소나무가 많이 심어져 있을까요?</em></p>

                    <h4>2. 도곡공원 (자연 생태)</h4>
                    <p>탐방객들이 가장 많이 발견한 곤충과 식물 데이터를 바탕으로 구성한 '동네 생태 도감'을 채워보세요. 떡갈나무와 상수리나무의 잎 모양을 비교해보는 활동이 포함됩니다.</p>
                  </div>

                  <div className="mt-5 pt-4 border-t flex justify-end gap-2">
                    <button className="px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100">PDF로 저장</button>
                    <button className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">학생들에게 배포하기</button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Input Area (Mock) */}
        <div className="p-4 bg-white border-t flex gap-2">
          <input 
            type="text" 
            placeholder="AI에게 추가로 요청할 내용을 입력하세요..." 
            className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            disabled={step < 2}
          />
          <button 
            disabled={step < 2}
            className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
