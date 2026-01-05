'use client';

import { useState } from 'react';
import React from 'react';
import ImageUploader from '@/components/ImageUploader';
import ImagePreview from '@/components/ImagePreview';
import RenderingControls, { RenderingSettings } from '@/components/RenderingControls';
import ImageModal from '@/components/ImageModal';

// 建筑风格选项（从 RenderingControls 中提取）
const STYLES = [
  { id: 'modern', name: '现代', description: '简洁线条，玻璃和钢材' },
  { id: 'traditional', name: '传统', description: '经典建筑元素' },
  { id: 'minimalist', name: '极简', description: '简约优雅的设计' },
  { id: 'industrial', name: '工业', description: '原始材料，裸露结构' },
  { id: 'futuristic', name: '未来', description: '先进创新的设计' },
  { id: 'natural', name: '自然', description: '有机形态，绿色元素' },
];

export default function Home() {
  const [uploadedImage, setUploadedImage] = useState<{ file: File; preview: string } | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState('modern');

  const handleImageSelect = (file: File, preview: string) => {
    setUploadedImage({ file, preview });
    setGeneratedImage(null);
    setError(null);
  };

  const handleRemoveImage = () => {
    setUploadedImage(null);
    setGeneratedImage(null);
    setError(null);
  };

  const handleGenerate = async (settings: RenderingSettings) => {
    if (!uploadedImage) return;

    setIsGenerating(true);
    setError(null);

    console.log('🚀 开始生成渲染图...', {
      hasImage: !!uploadedImage,
      style: settings.style,
      prompt: settings.prompt,
      strength: settings.strength,
      timestamp: new Date().toISOString()
    });

    try {
      // 创建带超时的 fetch 请求（150秒超时）
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.error('⏱️ 前端请求超时（150秒）');
        controller.abort();
      }, 150000);

      let response: Response;
      try {
        const requestStartTime = Date.now();
        console.log('📤 发送 API 请求...');
        response = await fetch('/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image: uploadedImage.preview,
            style: settings.style,
            prompt: settings.prompt,
            strength: settings.strength,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        const requestDuration = Date.now() - requestStartTime;
        console.log(`📥 收到 API 响应 (${requestDuration}ms):`, {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        });
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        console.error('❌ Fetch 错误:', fetchError);
        if (fetchError.name === 'AbortError') {
          throw new Error('请求超时：图片生成时间过长（超过150秒）。请检查网络连接或稍后重试。');
        }
        throw fetchError;
      }

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || data.details || 'Failed to generate rendering';
        const fullError = data.details ? `${errorMessage}\n\n详情: ${data.details}` : errorMessage;
        throw new Error(fullError);
      }

      // 确保返回的是渲染后的图片，而不是原图
      if (data.result && data.result !== uploadedImage.preview) {
        setGeneratedImage(data.result);
      } else {
        throw new Error('API 返回了原始图片。请检查您的 API Key 配置。');
      }
    } catch (err) {
      console.error('生成渲染图错误:', err);
      if (err instanceof Error) {
        if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          setError('网络连接失败。请检查网络连接或稍后重试。\n\n如果问题持续，可能是服务器响应超时。');
        } else if (err.message.includes('超时') || err.message.includes('timeout')) {
          setError(err.message);
        } else {
          setError(err.message);
        }
      } else {
        setError('生成渲染图时发生未知错误。请稍后重试。');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `rendering-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex flex-col overflow-hidden">
      {/* Compact Header */}
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm flex-shrink-0 z-10">
        <div className="max-w-[1920px] mx-auto px-4 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-800 dark:text-white">AI 建筑渲染</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Full Height Layout */}
      <main className="flex-1 max-w-[1920px] mx-auto w-full px-3 py-2 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 h-full">
          {/* Left Column - Input & Settings (3 columns) */}
          <div className="lg:col-span-3 flex flex-col gap-2 h-full overflow-hidden">
            {/* Image Upload Section - Compact */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-2 flex-shrink-0 overflow-hidden" style={{ height: '150px' }}>
              {!uploadedImage ? (
                <ImageUploader onImageSelect={handleImageSelect} disabled={isGenerating} />
              ) : (
                <ImagePreview
                  src={uploadedImage.preview}
                  alt="Uploaded white model"
                  title="建筑模型图（输入）"
                  onRemove={handleRemoveImage}
                />
              )}
            </div>

            {/* Style Selection - Compact */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-2 flex-shrink-0" style={{ height: '95px', display: 'flex', flexDirection: 'column' }}>
              <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                建筑风格
              </label>
              <div className="grid grid-cols-3 gap-1 flex-1">
                {STYLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedStyle(s.id)}
                    className={`p-0.5 rounded border-2 text-center transition-all ${
                      selectedStyle === s.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <p className="font-medium text-[9px] text-gray-800 dark:text-gray-200 leading-tight">{s.name}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Rendering Settings - Main Feature */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <RenderingControls
                onGenerate={(settings) => {
                  handleGenerate({ ...settings, style: selectedStyle });
                }}
                isGenerating={isGenerating}
                disabled={!uploadedImage}
                hideStyleSelection={true}
                initialStyle={selectedStyle}
              />
            </div>

            {/* Error Message - Compact */}
            {error && (
              <div className="flex flex-col gap-1.5 flex-shrink-0">
                <div className="p-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-[10px] text-red-700 dark:text-red-300 font-medium">{error.split('\n')[0]}</p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Result Display (9 columns) */}
          <div className="lg:col-span-9 flex flex-col gap-2 h-full overflow-hidden">
            {/* Generated Image Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden flex flex-col flex-1 min-h-0">
              <div className="px-2.5 py-1.5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
                <h3 className="font-medium text-gray-800 dark:text-gray-200 text-xs">生成的渲染图</h3>
                {generatedImage && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] bg-gray-500 hover:bg-gray-600 text-white rounded transition-colors"
                      title="预览放大"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                      </svg>
                      预览
                    </button>
                    <button
                      onClick={handleDownload}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      下载
                    </button>
                  </div>
                )}
              </div>
              
              <div className="relative flex-1 w-full bg-gray-50 dark:bg-gray-900 overflow-hidden">
                {generatedImage ? (
                  <div className="relative w-full h-full cursor-pointer" onClick={() => setIsModalOpen(true)}>
                    <img
                      src={generatedImage}
                      alt="Generated rendering"
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/5 transition-colors">
                      <div className="opacity-0 hover:opacity-100 transition-opacity bg-white/80 dark:bg-gray-800/80 px-2 py-1 rounded text-[10px] text-gray-700 dark:text-gray-300">
                        点击放大预览
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                    {isGenerating ? (
                      <>
                        <svg className="animate-spin h-10 w-10 mb-3" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <p className="text-sm">正在生成渲染图...</p>
                        <p className="text-xs mt-1">这可能需要一些时间</p>
                      </>
                    ) : (
                      <>
                        <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm">渲染图将显示在这里</p>
                        <p className="text-xs mt-1">上传图片并点击生成</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Image Modal */}
      {generatedImage && (
        <ImageModal
          src={generatedImage}
          alt="生成的渲染图"
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {/* Footer - Minimal */}
      <footer className="border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="max-w-[1920px] mx-auto px-4 py-0.5 text-center text-[10px] text-gray-500 dark:text-gray-400">
          由 Gemini 3 Pro Image 提供支持
        </div>
      </footer>
    </div>
  );
}
