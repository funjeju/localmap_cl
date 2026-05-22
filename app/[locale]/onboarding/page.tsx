'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [radius, setRadius] = useState(500);
  const [locale, setLocale] = useState('ko-KR');
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading } = useAuthStore();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/${locale.split('-')[0]}/login`);
    }
  }, [user, authLoading, router, locale]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/tenant/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, address, radius, locale, userId: user?.uid }),
      });

      if (!res.ok) throw new Error('Failed to create tenant');

      const data = await res.json();
      
      // Redirect to the map studio
      router.push(`/${locale.split('-')[0]}/${data.tenantId}/map`);
    } catch (err) {
      console.error(err);
      alert("학교 등록에 실패했습니다.");
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
            
            <div className="space-y-2">
              <Label htmlFor="name">학교 이름</Label>
              <Input 
                id="name" 
                placeholder="예: 학동초등학교" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">주소</Label>
              <div className="flex gap-2">
                <Input 
                  id="address" 
                  placeholder="예: 서울시 강남구 학동로 11" 
                  value={address} 
                  onChange={(e) => setAddress(e.target.value)} 
                  required 
                />
                <Button type="button" variant="outline">검색</Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">※ 도로명 주소를 입력해주세요.</p>
            </div>

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
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "자동으로 우리 동네 그리는 중..." : "다음: 자동으로 우리 동네 만들기"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
