import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-[#0F172A] text-white">
      {/* Features Bar */}
      <div className="border-b border-white/10">
        <div className="container mx-auto px-4 py-6 flex flex-wrap justify-between items-center text-sm font-medium text-gray-300">
          <div className="flex items-center gap-2"><span className="text-xl">🗺️</span> 정확한 지도 데이터</div>
          <div className="flex items-center gap-2"><span className="text-xl">🤖</span> AI 기반 맞춤 학습</div>
          <div className="flex items-center gap-2"><span className="text-xl">⚡</span> 실시간 정보 업데이트</div>
          <div className="flex items-center gap-2"><span className="text-xl">🛡️</span> 안전한 체험학습</div>
          <div className="flex items-center gap-2"><span className="text-xl">📝</span> 체계적인 기록 관리</div>
        </div>
      </div>
      
      {/* Bottom Footer */}
      <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-primary rounded flex items-center justify-center font-bold text-xs text-white">L</div>
          <span className="font-bold tracking-tight">LocalMap</span>
          <span className="text-xs text-gray-500 ml-4">© 2024 LocalMap. All rights reserved.</span>
        </div>
        
        <div className="flex items-center gap-6 text-xs text-gray-400">
          <a href="#" className="hover:text-white">이용약관</a>
          <a href="#" className="hover:text-white">개인정보처리방침</a>
          <a href="#" className="hover:text-white">고객센터</a>
          <a href="#" className="hover:text-white">문의하기</a>
          <div className="flex items-center gap-4 ml-4">
            <span className="w-5 h-5 rounded bg-gray-700 flex items-center justify-center text-white">in</span>
            <span className="w-5 h-5 rounded bg-gray-700 flex items-center justify-center text-white">y</span>
            <span className="w-5 h-5 rounded bg-gray-700 flex items-center justify-center text-white">t</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
