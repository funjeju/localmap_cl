'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { db, auth } from '@/lib/firebase/config';
import { signInAnonymously } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { addUserToTenant, validateAndUseInviteCode } from '@/lib/firebase/memberships';
import Link from 'next/link';

export default function StudentLoginPage() {
  const t = useTranslations();
  const router = useRouter();
  const [tenantCode, setTenantCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate and use invite code
      const [tenantId, inviteCode] = tenantCode.split('-');

      if (!tenantId || !inviteCode) {
        throw new Error('유효하지 않은 코드 형식입니다');
      }

      // Verify the code exists and get the role
      const role = await validateAndUseInviteCode(tenantId, inviteCode);

      // Sign in anonymously for students
      const result = await signInAnonymously(auth);

      // Add user to tenant
      await addUserToTenant(result.user.uid, tenantId, role);

      router.push(`/ko/dashboard?tenantId=${tenantId}`);
    } catch (err: any) {
      setError(err.message || '유효하지 않은 코드입니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold mb-2 text-center">LocalMap</h1>
        <p className="text-center text-gray-600 mb-8">학생 로그인</p>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleStudentLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              초대 코드
            </label>
            <Input
              type="text"
              value={tenantCode}
              onChange={(e) => setTenantCode(e.target.value.toUpperCase())}
              placeholder="예: SCHOOL-ABC123"
              disabled={loading}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              선생님께서 받은 코드를 입력해주세요
            </p>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? '확인 중...' : '로그인'}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          선생님이신가요?{' '}
          <Link href="/ko/login" className="font-medium text-blue-600 hover:underline">
            여기서 로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
