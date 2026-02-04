import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
  const apiKey = process.env.GEMINI_API_KEY || '';
  const model = process.env.GEMINI_MODEL || 'gemini-3-pro-image-preview';
  
  // 显示 API Key 的前后部分（用于调试，不显示完整内容）
  const apiKeyStart = apiKey.substring(0, 15);
  const apiKeyEnd = apiKey.length > 15 ? '...' + apiKey.substring(apiKey.length - 10) : '';
  const apiKeyPreview = apiKeyStart + apiKeyEnd;
  
  return NextResponse.json({
    environment: isVercel ? 'Vercel' : 'Local',
    vercelEnv: process.env.VERCEL_ENV || 'not set',
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey.length,
    apiKeyPreview: apiKeyPreview,
    apiKeyStartsWithAIza: apiKey.startsWith('AIza'),
    apiKeyTrimmedLength: apiKey.trim().length,
    model,
    nodeEnv: process.env.NODE_ENV,
    // 测试实际 API 调用
    testApiCall: 'Visit /api/test-connection to test actual API call',
  });
}

