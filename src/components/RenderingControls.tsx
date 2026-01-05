'use client';

import { useState, useEffect } from 'react';

interface RenderingControlsProps {
  onGenerate: (settings: RenderingSettings) => void;
  isGenerating: boolean;
  disabled?: boolean;
  hideStyleSelection?: boolean;
  initialStyle?: string;
}

export interface RenderingSettings {
  style: string;
  prompt: string;
  strength: number;
}

const STYLES = [
  { id: 'modern', name: '现代', description: '简洁线条，玻璃和钢材' },
  { id: 'traditional', name: '传统', description: '经典建筑元素' },
  { id: 'minimalist', name: '极简', description: '简约优雅的设计' },
  { id: 'industrial', name: '工业', description: '原始材料，裸露结构' },
  { id: 'futuristic', name: '未来', description: '先进创新的设计' },
  { id: 'natural', name: '自然', description: '有机形态，绿色元素' },
];

export default function RenderingControls({ onGenerate, isGenerating, disabled, hideStyleSelection = false, initialStyle = 'modern' }: RenderingControlsProps) {
  const [style, setStyle] = useState(initialStyle);
  
  // 当 initialStyle 改变时更新内部 state
  useEffect(() => {
    setStyle(initialStyle);
  }, [initialStyle]);
  const [prompt, setPrompt] = useState('');
  const [strength, setStrength] = useState(0.75);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate({ style, prompt, strength });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-2.5 h-full flex flex-col">
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">渲染设置</h3>
      </div>

      {/* Style Selection - Hidden if hideStyleSelection is true */}
      {!hideStyleSelection && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2.5">
            建筑风格
          </label>
          <div className="grid grid-cols-3 gap-2">
            {STYLES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStyle(s.id)}
                className={`p-2.5 rounded-lg border-2 text-left transition-all ${
                  style === s.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <p className="font-medium text-xs text-gray-800 dark:text-gray-200">{s.name}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">{s.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col space-y-2 min-h-0">
        {/* Custom Prompt */}
        <div className="flex-shrink-0">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            附加描述（可选）
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="例如：阳光明媚，绿意盎然的花园..."
            className="w-full px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
          />
        </div>

        {/* Strength Slider */}
        <div className="flex-shrink-0">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            变换强度：{Math.round(strength * 100)}%
          </label>
          <input
            type="range"
            min="0.3"
            max="1"
            step="0.05"
            value={strength}
            onChange={(e) => setStrength(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
            <span>保持原样</span>
            <span>完全变换</span>
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <button
        type="submit"
        disabled={disabled || isGenerating}
        className={`w-full py-2 px-3 rounded-lg font-semibold text-xs text-white transition-all flex-shrink-0 mt-2 ${
          disabled || isGenerating
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-md hover:shadow-lg'
        }`}
      >
        {isGenerating ? (
          <span className="flex items-center justify-center gap-1.5">
            <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            生成中...
          </span>
        ) : (
          '生成渲染图'
        )}
      </button>
    </form>
  );
}
