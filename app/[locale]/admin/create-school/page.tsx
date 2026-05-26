'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { auth } from '@/lib/firebase/config';

interface School {
  schoolName: string;
  address: string;
}

export default function CreateSchoolPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) || 'ko';

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [radius, setRadius] = useState('1000');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<School[]>([]);
  const [searching, setSearching] = useState(false);

  // Search schools from NEIS API
  useEffect(() => {
    if (!name.trim() || name.length < 2) {
      setSuggestions([]);
      return;
    }

    const searchSchools = async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/schools/search?q=${encodeURIComponent(name)}`);
        const data = await response.json();
        setSuggestions(data.schools || []);
      } catch (err) {
        console.error('Search error:', err);
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    };

    const timer = setTimeout(searchSchools, 300); // Debounce 300ms
    return () => clearTimeout(timer);
  }, [name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userId = auth.currentUser?.uid;
      const res = await fetch('/api/tenant/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          address,
          radius: parseInt(radius),
          type: 'elementary_school',
          locale: 'ko-KR',
          userId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || '학교 생성에 실패했습니다.');
      }

      const tenantId = data.tenantId;
      router.push(`/${locale}/${tenantId}/map`);
    } catch (err: any) {
      console.error('Create school error:', err);
      setError(err.message || '학교 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href={`/${locale}/admin`}>
            <Button variant="ghost">← 돌아가기</Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">새 학교 생성</h1>
            <p className="text-gray-600 mt-1">LocalMap에 학교를 등록하세요</p>
          </div>
        </div>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>학교 정보</CardTitle>
            <CardDescription>기본 정보를 입력하여 학교를 생성합니다</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium mb-2">학교 이름</label>
                <Input
                  type="text"
                  placeholder="학교명을 입력하세요..."
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  required
                  disabled={loading}
                  autoComplete="off"
                />

                {/* Suggestions dropdown */}
                {showSuggestions && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                    {searching ? (
                      <div className="px-4 py-3 text-center text-gray-500 text-sm">
                        검색 중...
                      </div>
                    ) : suggestions.length > 0 ? (
                      suggestions.map((school, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setName(school.schoolName);
                            setAddress(school.address);
                            setShowSuggestions(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b last:border-b-0 transition-colors"
                        >
                          <div className="font-medium text-gray-900">{school.schoolName}</div>
                          <div className="text-xs text-gray-500">{school.address}</div>
                        </button>
                      ))
                    ) : name.length >= 2 ? (
                      <div className="px-4 py-3 text-center text-gray-500 text-sm">
                        검색 결과가 없습니다.
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">주소</label>
                <Input
                  type="text"
                  placeholder="예: 서울특별시 강남구 역삼동"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  📍 정확한 주소를 입력하면 지도에서 자동으로 위치를 찾습니다.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">탐방 반경 (미터)</label>
                <Input
                  type="number"
                  placeholder="1000"
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                  min="100"
                  max="5000"
                  step="100"
                  required
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  학교로부터의 탐방 가능 반경을 설정합니다. (기본값: 1000m)
                </p>
              </div>

              <div className="pt-4 flex gap-2">
                <Button
                  type="submit"
                  disabled={loading || !name || !address}
                  className="flex-1"
                >
                  {loading ? '생성 중...' : '학교 생성하기'}
                </Button>
                <Link href={`/${locale}/admin`} className="flex-1">
                  <Button variant="outline" className="w-full" disabled={loading}>
                    취소
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <h3 className="font-bold mb-2">💡 팁</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• 학교 생성 후 설정 페이지에서 멤버를 초대할 수 있습니다.</li>
              <li>• 주소는 가능한 정확하게 입력해주세요.</li>
              <li>• 탐방 반경은 나중에 수정할 수 있습니다.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
