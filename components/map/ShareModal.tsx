'use client';

import React, { useState } from 'react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  shareUrl: string;
}

export default function ShareModal({ isOpen, onClose, title, shareUrl }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      alert('클립보드에 복사할 수 없습니다.');
    }
  };

  const handleShare = async (platform: 'twitter' | 'facebook' | 'kakao') => {
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedTitle = encodeURIComponent(title);

    let shareLink = '';
    if (platform === 'twitter') {
      shareLink = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
    } else if (platform === 'facebook') {
      shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    } else if (platform === 'kakao') {
      // Kakao Share requires SDK
      if ((window as any).Kakao) {
        (window as any).Kakao.Share.sendDefault({
          objectType: 'feed',
          content: {
            title: title,
            description: '우리 동네 탐방 지도를 함께 살펴보세요!',
            imageUrl: 'https://via.placeholder.com/200',
            link: {
              mobileWebUrl: shareUrl,
              webUrl: shareUrl,
            },
          },
        });
        return;
      }
    }

    if (shareLink) {
      window.open(shareLink, '_blank', 'width=500,height=500');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold">공유하기</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          {/* Share Link */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">공유 링크</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 border rounded p-2 text-sm bg-gray-50"
              />
              <button
                onClick={handleCopy}
                className={`px-4 py-2 rounded font-medium text-sm transition-colors ${
                  copied
                    ? 'bg-green-600 text-white'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {copied ? '✓ 복사됨' : '복사'}
              </button>
            </div>
          </div>

          {/* Social Share */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">SNS로 공유</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleShare('twitter')}
                className="py-2 px-3 bg-blue-400 text-white rounded font-medium text-sm hover:bg-blue-500 transition-colors"
              >
                𝕏
              </button>
              <button
                onClick={() => handleShare('facebook')}
                className="py-2 px-3 bg-blue-600 text-white rounded font-medium text-sm hover:bg-blue-700 transition-colors"
              >
                f
              </button>
              <button
                onClick={() => handleShare('kakao')}
                className="py-2 px-3 bg-yellow-400 text-gray-800 rounded font-medium text-sm hover:bg-yellow-500 transition-colors"
              >
                카카오
              </button>
            </div>
          </div>

          {/* QR Code Info */}
          <div className="bg-blue-50 p-3 rounded border border-blue-200">
            <p className="text-xs text-blue-700">
              💡 QR 코드로도 공유할 수 있습니다. <br/>
              모바일 기기의 카메라로 스캔하여 접속하세요.
            </p>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full py-2 border rounded font-medium text-sm hover:bg-gray-50"
          >
            닫기
          </button>
        </div>
      </div>
    </>
  );
}
