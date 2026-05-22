import React from 'react';
import UserMenu from '@/components/auth/UserMenu';

export default async function TenantLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; tenantId: string }>;
}) {
  const { tenantId } = await params;
  
  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      {/* Top Navbar */}
      <header className="flex h-14 items-center justify-between border-b px-4 lg:px-6">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold">{tenantId} (Tenant)</h1>
          <span className="text-sm text-muted-foreground">2026학년도</span>
        </div>
        <div className="flex items-center gap-2">
          <UserMenu />
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
