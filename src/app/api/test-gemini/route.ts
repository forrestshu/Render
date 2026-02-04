import { NextRequest, NextResponse } from 'next/server';
import https from 'https';

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY || '';
    const model = process.env.GEMINI_MODEL || 'gemini-3-pro-image-preview';
    const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
    
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'API Key 未设置',
        apiKeyLength: 0,
        environment: isVercel ? 'Vercel' : 'Local'
      });
    }
    
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const testData = JSON.stringify({
      contents: [{ parts: [{ text: 'Say "API is working" if you can read this.' }] }],
    });
    
    return new Promise<NextResponse>((resolve) => {
      const urlObj = new URL(apiUrl);
      const options = {
        hostname: urlObj.hostname,
        port: 443,
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(testData),
        },
        timeout: 30000,
      };
      
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk.toString()));
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const result = JSON.parse(body);
              const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '无文本响应';
              resolve(NextResponse.json({
                success: true,
                message: 'API 连接成功！',
                response: text.substring(0, 200),
                statusCode: res.statusCode,
                apiKeyLength: apiKey.length,
                apiKeyPrefix: apiKey.substring(0, 10),
                environment: isVercel ? 'Vercel' : 'Local'
              }));
            } catch (e) {
              resolve(NextResponse.json({
                success: false,
                error: '解析响应失败',
                body: body.substring(0, 500),
                statusCode: res.statusCode
              }));
            }
          } else {
            resolve(NextResponse.json({
              success: false,
              error: `API 返回错误: ${res.statusCode}`,
              body: body.substring(0, 500),
              statusCode: res.statusCode
            }));
          }
        });
      });
      
      req.on('error', (error: any) => {
        resolve(NextResponse.json({
          success: false,
          error: error.message,
          errorCode: error.code,
          errorName: error.name,
          apiKeyLength: apiKey.length,
          apiKeyPrefix: apiKey.substring(0, 10),
          environment: isVercel ? 'Vercel' : 'Local'
        }));
      });
      
      req.on('timeout', () => {
        req.destroy();
        resolve(NextResponse.json({
          success: false,
          error: '请求超时（30秒）',
          apiKeyLength: apiKey.length,
          environment: isVercel ? 'Vercel' : 'Local'
        }));
      });
      
      req.write(testData);
      req.end();
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}

