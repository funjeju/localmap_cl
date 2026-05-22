'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface School {
  schoolName: string;
  schoolAddress: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
}

function OnboardingContent() {
  const router = useRouter();
  const [schoolSearch, setSchoolSearch] = useState('');
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [radius, setRadius] = useState(500);
  const [locale, setLocale] = useState('ko-KR');
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();

  // School search handler with debounce
  const handleSchoolSearch = (value: string) => {
    setSchoolSearch(value);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.length < 2) {
      setSchools([]);
      setShowDropdown(false);
      return;
    }

    setSearchLoading(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/neis/search-schools?q=${encodeURIComponent(value)}`);
        const data = await res.json();
        if (res.ok) {
          setSchools(data.schools || []);
          setShowDropdown(true);
        } else {
          setSchools([]);
        }
      } catch (error) {
        console.error('School search error:', error);
        setSchools([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  };

  const handleSelectSchool = (school: School) => {
    setSelectedSchool(school);
    setSchoolSearch(school.schoolName);
    setShowDropdown(false);
    setSchools([]);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-school-search-container]')) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSchool) {
      alert('학교를 선택해주세요.');
      return;
    }

    if (!selectedSchool.schoolName?.trim()) {
      alert('유효한 학교를 선택해주세요.');
      return;
    }

    if (!user?.uid) {
      alert('로그인 후 진행해주세요.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/tenant/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedSchool.schoolName.trim(),
          address: selectedSchool.schoolAddress || '',
          latitude: selectedSchool.latitude,
          longitude: selectedSchool.longitude,
          radius,
          locale,
          userId: user.uid,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const message = data.message || data.error?.userMessage || '학교 등록에 실패했습니다.';
        throw new Error(message);
      }

      if (!data.tenantId) {
        throw new Error('서버에서 유효한 응답을 받지 못했습니다.');
      }

      // Redirect to the map studio
      const langCode = locale.split('-')[0];
      router.push(`/${langCode}/tenant/${data.tenantId}/map`);
    } catch (err: any) {
      console.error('학교 등록 오류:', err);
      alert(err?.message || '학교 등록에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/50 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">우리 학교 등록하기</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">

            <div className="space-y-2" data-school-search-container>
              <Label htmlFor="school-search">학교 이름</Label>
              <div className="relative">
                <Input
                  id="school-search"
                  placeholder="학교 이름 입력 (예: 학동초등학교)"
                  value={schoolSearch}
                  onChange={(e) => handleSchoolSearch(e.target.value)}
                  onFocus={() => schools.length > 0 && setShowDropdown(true)}
                  disabled={loading}
                  autoComplete="off"
                />
                {searchLoading && (
                  <div className="absolute right-3 top-3 text-xs text-muted-foreground">검색 중...</div>
                )}
                {showDropdown && schools.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
                    {schools.map((school, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectSchool(school)}
                        className="w-full text-left px-3 py-2 hover:bg-muted text-sm border-b last:border-b-0"
                      >
                        <div className="font-medium">{school.schoolName}</div>
                        <div className="text-xs text-muted-foreground">{school.schoolAddress}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">※ 학교 이름을 입력하고 목록에서 선택해주세요.</p>
            </div>

            {selectedSchool && (
              <div className="space-y-2 p-3 bg-muted/50 rounded-md border">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">선택된 학교</p>
                  <p className="text-base font-semibold">{selectedSchool.schoolName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">주소</p>
                  <p className="text-sm">{selectedSchool.schoolAddress}</p>
                </div>
                {selectedSchool.phone && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">연락처</p>
                    <p className="text-sm">{selectedSchool.phone}</p>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4">
              <div className="flex justify-between">
                <Label>지도 반경</Label>
                <span className="text-sm font-medium">{radius}m</span>
              </div>
              <Slider
                value={[radius]}
                onValueChange={(val) => setRadius(Array.isArray(val) ? val[0] : val)}
                max={1500}
                min={300}
                step={100}
                className="py-2"
              />
            </div>

            <div className="space-y-3">
              <Label>주 사용 언어</Label>
              <RadioGroup value={locale} onValueChange={setLocale} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="ko-KR" id="r1" />
                  <Label htmlFor="r1">한국어</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="ja-JP" id="r2" />
                  <Label htmlFor="r2">日本語</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="en-US" id="r3" />
                  <Label htmlFor="r3">English</Label>
                </div>
              </RadioGroup>
            </div>

          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading || !selectedSchool}>
              {loading ? "자동으로 우리 동네 그리는 중..." : "다음: 자동으로 우리 동네 만들기"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <ProtectedRoute>
      <OnboardingContent />
    </ProtectedRoute>
  );
}
