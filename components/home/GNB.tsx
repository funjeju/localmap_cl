import React from 'react';
import Link from 'next/link';

export default function GNB() {
  return (
    <header className="sticky top-0 z-50 w-full bg-[#0F172A] text-white">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center font-bold text-white">L</div>
          <span className="font-bold text-xl tracking-tight">LocalMap</span>
        </div>

        {/* Menu */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
          <Link href="#" className="text-white border-b-2 border-white pb-1">탐방하기</Link>
          <Link href="#" className="hover:text-white transition-colors">지도</Link>
          <Link href="#" className="hover:text-white transition-colors">지역정보</Link>
          <Link href="#" className="hover:text-white transition-colors">AI 학습</Link>
          <Link href="#" className="hover:text-white transition-colors">체험학습</Link>
          <Link href="#" className="hover:text-white transition-colors">커뮤니티</Link>
        </nav>

        {/* Utilities */}
        <div className="flex items-center gap-4">
          <div className="relative hidden md:block">
            <input 
              type="text" 
              placeholder="검색 (지역, 학교, 명소)" 
              className="bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary w-64"
            />
            <svg className="w-4 h-4 absolute right-3 top-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <button className="text-gray-300 hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
          </button>
          <div className="w-8 h-8 rounded-full bg-gray-500 overflow-hidden border border-white/20">
            {/* Avatar placeholder */}
          </div>
        </div>
      </div>
    </header>
  );
}
