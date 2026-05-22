'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { subscribeToAuthChanges, logout } from '@/lib/firebase/auth';

export default function GNB() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/ko');
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0F172A] text-white">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/ko" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center font-bold text-white">
            L
          </div>
          <span className="font-bold text-xl tracking-tight">LocalMap</span>
        </Link>

        {/* Menu */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
          <Link href="/ko" className="text-white border-b-2 border-white pb-1 hover:opacity-80 transition-opacity">
            탐방하기
          </Link>
          <Link href="/ko/dashboard" className="hover:text-white transition-colors">
            대시보드
          </Link>
          <Link href="/ko/demo/map" className="hover:text-white transition-colors">
            데모 맵
          </Link>
          {!loading && !user && (
            <>
              <Link href="/ko/login" className="hover:text-white transition-colors">
                로그인
              </Link>
            </>
          )}
        </nav>

        {/* Utilities */}
        <div className="flex items-center gap-4">
          {!loading && (
            <>
              {user ? (
                <div className="flex items-center gap-4">
                  <Link
                    href="/ko/dashboard"
                    className="text-sm text-gray-300 hover:text-white transition-colors"
                  >
                    대시보드
                  </Link>
                  <Link
                    href="/ko/admin"
                    className="text-sm text-gray-300 hover:text-white transition-colors font-medium text-yellow-400"
                    title="관리자 패널"
                  >
                    👨‍💼 관리
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-sm text-gray-300 hover:text-white transition-colors"
                  >
                    로그아웃
                  </button>
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                    {user.displayName?.charAt(0) || user.email?.charAt(0) || '?'}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/ko/login"
                    className="text-sm text-gray-300 hover:text-white transition-colors"
                  >
                    로그인
                  </Link>
                  <Link
                    href="/ko/signup"
                    className="text-sm bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition-colors"
                  >
                    회원가입
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
