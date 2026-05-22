'use client';

import React, { useState, useRef } from 'react';
import { addPin } from '@/lib/firebase/pins';
import { calculateGeoHash } from '@/lib/geo/hash';
import type { Layer } from '@/lib/types';

interface BulkImportModalProps {
  tenantId: string;
  layers: Layer[];
  onClose: () => void;
  onSuccess?: () => void;
}

interface CSVPin {
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  category: string;
  englishName?: string;
}

export default function BulkImportModal({
  tenantId,
  layers,
  onClose,
  onSuccess
}: BulkImportModalProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (csvText: string): CSVPin[] => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const pins: CSVPin[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length < 4) continue; // Skip incomplete lines

      const pin: CSVPin = {
        name: values[headers.indexOf('name')] || '',
        description: values[headers.indexOf('description')] || '',
        latitude: parseFloat(values[headers.indexOf('latitude')] || '0'),
        longitude: parseFloat(values[headers.indexOf('longitude')] || '0'),
        category: values[headers.indexOf('category')] || '',
        englishName: values[headers.indexOf('englishname')] || undefined,
      };

      if (pin.name && !isNaN(pin.latitude) && !isNaN(pin.longitude)) {
        pins.push(pin);
      }
    }

    return pins;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const pins = parseCSV(text);

    if (pins.length === 0) {
      alert('유효한 핀이 없습니다. CSV 형식을 확인해주세요.');
      return;
    }

    await importPins(pins);
  };

  const importPins = async (pins: CSVPin[]) => {
    setIsImporting(true);
    setImportProgress(0);
    const errors: string[] = [];
    let successCount = 0;

    for (let i = 0; i < pins.length; i++) {
      try {
        const pin = pins[i];
        const layer = layers.find(l => l.name.ko === pin.category);

        if (!layer) {
          errors.push(`${pin.name}: 카테고리 "${pin.category}"을(를) 찾을 수 없습니다.`);
          continue;
        }

        await addPin(tenantId, {
          layerId: layer.id,
          name: { ko: pin.name, en: pin.englishName },
          description: { ko: pin.description },
          location: {
            lat: pin.latitude,
            lng: pin.longitude,
            geohash: calculateGeoHash(pin.latitude, pin.longitude),
          },
          descriptionSource: 'manual',
          images: [],
          audioNotes: [],
          source: { type: 'teacher' },
        });

        successCount++;
      } catch (error: any) {
        errors.push(`${pins[i].name}: ${error?.message || '알 수 없는 오류'}`);
      }

      setImportProgress(((i + 1) / pins.length) * 100);
    }

    setImportResult({
      success: successCount,
      failed: errors.length,
      errors: errors.slice(0, 10), // Show first 10 errors
    });

    setIsImporting(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-96 bg-white rounded-lg shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <form className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">CSV로 대량 import</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>

          {!importResult ? (
            <>
              {/* Instructions */}
              <div className="p-3 bg-blue-50 rounded-lg text-sm">
                <p className="font-medium mb-2">CSV 형식:</p>
                <code className="text-xs bg-white p-2 block rounded overflow-x-auto">
                  name,description,latitude,longitude,category,englishName
                </code>
                <p className="text-xs text-gray-600 mt-2">
                  • latitude/longitude는 필수입니다
                  • category는 기존 카테고리명과 정확히 일치해야 합니다
                </p>
              </div>

              {/* Category List */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">사용 가능한 카테고리</p>
                <div className="flex flex-wrap gap-1">
                  {layers.map(layer => (
                    <span key={layer.id} className="px-2 py-1 bg-gray-100 text-xs rounded">
                      {layer.name.ko}
                    </span>
                  ))}
                </div>
              </div>

              {/* File Input */}
              {!isImporting && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full px-4 py-3 border-2 border-dashed border-blue-300 rounded-lg text-blue-600 hover:border-blue-400 font-medium"
                  >
                    📄 CSV 파일 선택
                  </button>
                </>
              )}

              {/* Progress */}
              {isImporting && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">Import 중...</p>
                    <p className="text-sm text-gray-600">{Math.round(importProgress)}%</p>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{ width: `${importProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Results */}
              <div className="space-y-3">
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm font-medium text-green-900">
                    ✅ {importResult.success}개 핀 추가됨
                  </p>
                </div>

                {importResult.failed > 0 && (
                  <div className="p-3 bg-red-50 rounded-lg">
                    <p className="text-sm font-medium text-red-900 mb-2">
                      ❌ {importResult.failed}개 실패
                    </p>
                    {importResult.errors.length > 0 && (
                      <div className="text-xs text-red-700 space-y-1">
                        {importResult.errors.map((error, idx) => (
                          <div key={idx}>• {error}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setImportResult(null);
                    setImportProgress(0);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  다시 import
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSuccess?.();
                    onClose();
                  }}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  완료
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </>
  );
}
