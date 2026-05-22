import React from 'react';
import MapCanvas from '@/components/map/MapCanvas';
import PinActionBar from '@/components/map/PinActionBar';
import LayerFilterPanel from '@/components/map/LayerFilterPanel';
import PropertyPanel from '@/components/map/PropertyPanel';

export default async function MapPage({
  params
}: {
  params: Promise<{ locale: string; tenantId: string }>;
}) {
  const { locale, tenantId } = await params;
  
  // Hardcoded stub for demo purposes. This should be fetched from Firestore.
  const tenantCenter = { lat: 37.5665, lng: 126.9780 }; // Seoul City Hall
  const tenantRadius = 500;
  
  return (
    <div className="flex h-full w-full">
      {/* Sidebar: Layer Filter Panel */}
      <LayerFilterPanel tenantId={tenantId} />
      
      {/* Main Map Area */}
      <section className="flex-1 relative">
        <MapCanvas 
          tenantId={tenantId}
          tenantCenter={tenantCenter} 
          tenantRadius={tenantRadius} 
          locale={locale} 
        />
        
        {/* Bottom Bar: Action buttons */}
        <PinActionBar tenantId={tenantId} />
      </section>
      
      {/* Right Sidebar: Property Panel */}
      <PropertyPanel tenantId={tenantId} />
    </div>
  );
}
