'use client';

import React from 'react';
import { useAuthStore } from '@/stores/authStore';
import { logout } from '@/lib/firebase/auth';
import { useRouter } from 'next/navigation';

export default function UserMenu() {
  const { user } = useAuthStore();
  const router = useRouter();

  if (!user) {
    return (
      <button 
        onClick={() => router.push('/ko/login')} 
        className="text-sm font-medium hover:underline"
      >
        로그인
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="text-sm text-muted-foreground hidden sm:block">
        {user.displayName || user.email}
      </div>
      {user.photoURL ? (
        <img src={user.photoURL} alt="Profile" className="h-8 w-8 rounded-full" />
      ) : (
        <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs">
          {user.email?.charAt(0).toUpperCase()}
        </div>
      )}
      <button 
        onClick={async () => {
          await logout();
          router.push('/');
        }}
        className="text-sm text-destructive hover:underline ml-2"
      >
        로그아웃
      </button>
    </div>
  );
}
