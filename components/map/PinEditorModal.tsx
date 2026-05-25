'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useMapStore } from '@/stores/mapStore';
import { useAuthStore } from '@/stores/authStore';
import { calculateGeoHash } from '@/lib/geo/hash';
import { addPin, updatePin } from '@/lib/firebase/pins';
import { storage } from '@/lib/firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { Pin, LocalizedText, Layer } from '@/lib/types';

interface PinEditorModalProps {
  tenantId: string;
  layers: Layer[];
  existingPin?: Pin;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function PinEditorModal({
  tenantId,
  layers,
  existingPin,
  onClose,
  onSuccess
}: PinEditorModalProps) {
  const draftPinLocation = useMapStore((state) => state.draftPinLocation);
  const setDraftPinLocation = useMapStore((state) => state.setDraftPinLocation);
  const studentMode = useMapStore((state) => state.studentMode);
  const { user } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: { ko: '', ja: '', en: '' } as LocalizedText,
    description: { ko: '', ja: '', en: '' } as LocalizedText,
    layerId: layers[0]?.id || '',
    imageFiles: [] as File[],
    imageUrls: [] as string[],
  });

  useEffect(() => {
    if (existingPin) {
      setFormData({
        name: existingPin.name,
        description: existingPin.description,
        layerId: existingPin.layerId,
        imageFiles: [],
        imageUrls: existingPin.images.map(img => img.url),
      });
    }
  }, [existingPin]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.ko?.trim()) {
      newErrors.name = '핀 제목(한글)은 필수입니다';
    }

    if (!formData.layerId) {
      newErrors.layerId = '카테고리를 선택해주세요';
    }

    if (!existingPin && !draftPinLocation) {
      newErrors.location = '맵에서 위치를 선택해주세요';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Upload images if any
      const imageUrls = await uploadImages();

      if (existingPin) {
        // Update existing pin
        await updatePin(tenantId, existingPin.id, {
          name: formData.name,
          description: formData.description,
          layerId: formData.layerId,
          images: imageUrls.map(url => ({
            url,
            uploadedBy: 'teacher',
            uploadedAt: new Date(),
          })) as any,
        });
      } else if (draftPinLocation) {
        // Create new pin
        const isStudent = studentMode;
        await addPin(tenantId, {
          layerId: formData.layerId,
          name: formData.name,
          description: formData.description,
          location: {
            lat: draftPinLocation.lat,
            lng: draftPinLocation.lng,
            geohash: calculateGeoHash(draftPinLocation.lat, draftPinLocation.lng),
          },
          status: isStudent ? 'pending_review' : 'active',
          createdBy: user?.uid || 'unknown',
          descriptionSource: 'manual',
          images: imageUrls.map(url => ({
            url,
            uploadedBy: user?.uid || 'unknown',
            uploadedAt: new Date(),
          })) as any,
          audioNotes: [],
          source: { type: isStudent ? 'student' : 'teacher' },
        });
        setDraftPinLocation(null);
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Pin save error:', error);
      alert('저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNameChange = (lang: keyof LocalizedText, value: string) => {
    setFormData(prev => ({
      ...prev,
      name: { ...prev.name, [lang]: value }
    }));
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.name;
      return newErrors;
    });
  };

  const handleDescriptionChange = (lang: keyof LocalizedText, value: string) => {
    setFormData(prev => ({
      ...prev,
      description: { ...prev.description, [lang]: value }
    }));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormData(prev => ({
      ...prev,
      imageFiles: [...prev.imageFiles, ...files].slice(0, 5), // Limit to 5 images
    }));
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      imageFiles: prev.imageFiles.filter((_, i) => i !== index),
      imageUrls: prev.imageUrls.filter((_, i) => i !== index),
    }));
  };

  const uploadImages = async (): Promise<string[]> => {
    if (formData.imageFiles.length === 0) {
      return formData.imageUrls;
    }

    setIsUploadingImages(true);
    const uploadedUrls: string[] = [...formData.imageUrls];

    try {
      for (const file of formData.imageFiles) {
        const storageRef = ref(
          storage,
          `tenants/${tenantId}/pins/${Date.now()}-${file.name}`
        );
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        uploadedUrls.push(url);
      }
    } catch (error) {
      console.error('Image upload error:', error);
      throw new Error('이미지 업로드에 실패했습니다.');
    } finally {
      setIsUploadingImages(false);
    }

    return uploadedUrls;
  };

  const generateAIDescription = async () => {
    if (!formData.name.ko?.trim()) {
      alert('제목을 먼저 입력해주세요.');
      return;
    }

    setIsGeneratingAI(true);
    try {
      const response = await fetch('/api/ai/generate-pin-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pinName: formData.name.ko,
          location: draftPinLocation || { lat: 0, lng: 0 },
          category: layers.find(l => l.id === formData.layerId)?.name.ko || '',
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'AI 설명 생성에 실패했습니다.');
      }

      setFormData(prev => ({
        ...prev,
        description: {
          ...prev.description,
          ko: data.descriptionKo || prev.description.ko,
          en: data.descriptionEn || prev.description.en,
        }
      }));
    } catch (error: any) {
      console.error('AI generation error:', error);
      alert(error?.message || 'AI 설명 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGeneratingAI(false);
    }
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              {existingPin ? '핀 편집' : '새 핀 추가'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Location Info */}
          {!existingPin && draftPinLocation && (
            <div className="p-3 bg-blue-50 rounded-lg text-sm">
              <p className="text-gray-700">
                📍 위치: {draftPinLocation.lat.toFixed(4)}, {draftPinLocation.lng.toFixed(4)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                다른 위치를 선택하려면 맵을 클릭하세요
              </p>
            </div>
          )}

          {/* Category */}
          <div>
            <label className="block text-sm font-medium mb-2">카테고리</label>
            <select
              value={formData.layerId}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, layerId: e.target.value }));
                setErrors(prev => {
                  const newErrors = { ...prev };
                  delete newErrors.layerId;
                  return newErrors;
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">카테고리 선택...</option>
              {layers.map(layer => (
                <option key={layer.id} value={layer.id}>
                  {layer.name.ko}
                </option>
              ))}
            </select>
            {errors.layerId && <p className="text-red-500 text-xs mt-1">{errors.layerId}</p>}
          </div>

          {/* Images */}
          <div>
            <label className="block text-sm font-medium mb-2">이미지 (최대 5개)</label>
            {formData.imageFiles.length > 0 || formData.imageUrls.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {formData.imageUrls.map((url, idx) => (
                  <div key={idx} className="relative aspect-square bg-gray-200 rounded overflow-hidden">
                    <img src={url} alt={`Image ${idx}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {formData.imageFiles.map((file, idx) => (
                  <div key={`new-${idx}`} className="relative aspect-square bg-gray-200 rounded overflow-hidden">
                    <img src={URL.createObjectURL(file)} alt={`New ${idx}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(formData.imageUrls.length + idx)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            {formData.imageUrls.length + formData.imageFiles.length < 5 && (
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
            )}
            {formData.imageUrls.length + formData.imageFiles.length < 5 && (
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 text-sm"
              >
                📸 이미지 추가
              </button>
            )}
          </div>

          {/* Name (Korean) */}
          <div>
            <label className="block text-sm font-medium mb-2">제목 (한글) *</label>
            <input
              type="text"
              value={formData.name.ko || ''}
              onChange={(e) => handleNameChange('ko', e.target.value)}
              placeholder="예: 서울시청"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          {/* Name (English) */}
          <div>
            <label className="block text-sm font-medium mb-2">Title (English)</label>
            <input
              type="text"
              value={formData.name.en || ''}
              onChange={(e) => handleNameChange('en', e.target.value)}
              placeholder="e.g., Seoul City Hall"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description (Korean) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">설명 (한글)</label>
              <button
                type="button"
                onClick={generateAIDescription}
                disabled={isGeneratingAI}
                className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
              >
                {isGeneratingAI ? '생성 중...' : '✨ AI 생성'}
              </button>
            </div>
            <textarea
              value={formData.description.ko || ''}
              onChange={(e) => handleDescriptionChange('ko', e.target.value)}
              placeholder="이 장소에 대한 설명을 입력하세요"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Description (English) */}
          <div>
            <label className="block text-sm font-medium mb-2">Description (English)</label>
            <textarea
              value={formData.description.en || ''}
              onChange={(e) => handleDescriptionChange('en', e.target.value)}
              placeholder="Enter description for this location"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              disabled={isSubmitting}
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              disabled={isSubmitting || isUploadingImages}
            >
              {isUploadingImages ? '이미지 업로드 중...' : isSubmitting ? '저장 중...' : existingPin ? '수정' : '추가'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
