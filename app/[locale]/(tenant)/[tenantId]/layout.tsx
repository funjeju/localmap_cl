import React from 'react';

export default async function TenantLayout({
  children,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; tenantId: string }>;
}) {
  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      {children}
    </div>
  );
}
