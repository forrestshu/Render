import { NextRequest, NextResponse } from 'next/server';
import https from 'https';
import { URL } from 'url';
import { HttpsProxyAgent } from 'https-proxy-agent';
import fs from 'fs';
import path from 'path';

// Google Gemini API configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const MODEL =
  process.env.GEMINI_MODEL || 'gemini-3-pro-image-preview';

const GEMINI_API_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  
// Style prompts for architecture rendering
const STYLE_PROMPTS: Record<string, string> = {
  modern: 'modern architecture, sleek design, glass facade, steel structure, contemporary building, clean lines, minimalist exterior',
  traditional: 'traditional architecture, classic design, ornate details, stone facade, elegant columns, heritage style, timeless building',
  minimalist: 'minimalist architecture, simple forms, white walls, clean geometry, zen aesthetic, understated elegance, pure design',
  industrial: 'industrial architecture, exposed brick, metal beams, raw concrete, factory aesthetic, urban loft style, warehouse conversion',
  futuristic: 'futuristic architecture, sci-fi design, curved surfaces, innovative materials, parametric architecture, advanced technology',
  natural: 'biophilic architecture, green building, living walls, organic forms, sustainable design, nature integration, eco-friendly',
};

interface GenerateRequest {
  image: string; // base64 encoded image
  style: string;
  prompt: string;
  strength: number;
}

// Helper function to make HTTPS request with better error handling and proxy support
function makeHttpsRequest(url: string, options: any, data: string): Promise<{ statusCode: number; headers: any; body: string }> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    // Get proxy from environment variables
    const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || 
                     process.env.https_proxy || process.env.http_proxy;
    
    console.log('Proxy check:', {
      HTTPS_PROXY: process.env.HTTPS_PROXY ? 'Set' : 'Not set',
      HTTP_PROXY: process.env.HTTP_PROXY ? 'Set' : 'Not set',
      proxyUrl: proxyUrl || 'Not set'
    });
    
    let agent: any = undefined;
    if (proxyUrl) {
      try {
        const { HttpsProxyAgent } = require('https-proxy-agent');
        agent = new HttpsProxyAgent(proxyUrl);
        console.log('✅ Using proxy:', proxyUrl.replace(/:[^:@]*@/, ':****@')); // Hide password
      } catch (e) {
        console.warn('❌ Failed to create proxy agent:', e);
      }
    } else {
      console.warn('⚠️  No proxy configured - direct connection');
    }
    
    const requestOptions: any = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'POST',
      headers: options.headers || {},
      timeout: 120000, // 120 seconds (图片生成可能需要更长时间)
    };
    
    if (agent) {
      requestOptions.agent = agent;
    }

    const req = https.request(requestOptions, (res) => {
      let body = '';
      console.log('Received response from Gemini API:', {
        statusCode: res.statusCode,
        statusMessage: res.statusMessage,
        headers: res.headers
      });
      
      res.on('data', (chunk) => {
        body += chunk;
        console.log(`Received ${chunk.length} bytes, total: ${body.length} bytes`);
      });
      
      res.on('end', () => {
        console.log(`Response complete. Total body size: ${body.length} bytes`);
        resolve({
          statusCode: res.statusCode || 500,
          headers: res.headers,
          body: body
        });
      });
      
      res.on('error', (error: any) => {
        console.error('Response error:', error);
        reject(new Error(`响应错误: ${error.message}`));
      });
      
      res.on('close', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          // 正常关闭，已经在 'end' 事件中处理
        } else {
          console.warn('Response closed unexpectedly');
        }
      });
    });

    req.on('error', (error: any) => {
      console.error('Request error:', {
        message: error.message,
        code: error.code,
        errno: error.errno,
        syscall: error.syscall
      });
      reject(error);
    });

    req.on('timeout', () => {
      console.error('Request timeout after 120 seconds');
      req.destroy();
      reject(new Error('Request timeout - 图片生成可能需要更长时间，请稍后重试'));
    });

    // 写入数据时处理错误
    if (data) {
      try {
        const writeResult = req.write(data);
        if (!writeResult) {
          // 如果缓冲区已满，等待 drain 事件
          req.once('drain', () => {
            console.log('Request buffer drained, continuing...');
          });
        }
      } catch (writeError: any) {
        console.error('Exception while writing data:', writeError);
        req.destroy();
        reject(writeError);
        return;
      }
    }
    
    // 结束请求
    req.end((error: any) => {
      if (error) {
        console.error('Error ending request:', error);
        reject(error);
      } else {
        console.log('Request sent successfully, waiting for response...');
      }
    });
  });
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    console.log('=== Generate API Called ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('GEMINI_API_KEY exists:', !!GEMINI_API_KEY);
    console.log('GEMINI_API_KEY length:', GEMINI_API_KEY.length);
    console.log('MODEL:', MODEL);

    const body: GenerateRequest = await request.json();
    console.log('Request body received:', { 
      hasImage: !!body.image, 
      style: body.style, 
      hasPrompt: !!body.prompt,
      strength: body.strength 
    });
    const { image, style, prompt, strength } = body;

    if (!image) {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      );
    }

    // Build the prompt - Gemini 3 prefers concise, direct instructions
    const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.modern;
    const strengthText = strength > 0.7 ? 'completely transform' : strength > 0.5 ? 'significantly modify' : 'subtly enhance';
    // Simplified prompt following Gemini 3 best practices: concise and direct
    const fullPrompt = `Transform this architectural white model/sketch into a photorealistic architectural rendering with ${stylePrompt} style. ${strengthText} the design while maintaining accurate perspective and proportions. Include realistic materials, textures, natural lighting with shadows, and professional visualization quality.${prompt ? ` ${prompt}` : ''}`;

    // Check if API key is configured
    if (!GEMINI_API_KEY || GEMINI_API_KEY.trim() === '') {
      console.error('GEMINI_API_KEY is not configured');
      return NextResponse.json(
        { 
          error: 'Gemini API Key 未配置',
          details: '要使用渲染功能，请按以下步骤配置：\n1. 访问 https://aistudio.google.com/apikey 获取 API Key\n2. 在 .env.local 文件中取消注释并填入：\n   GEMINI_API_KEY=你的API密钥\n3. 重启开发服务器（npm run dev）',
          helpUrl: 'https://aistudio.google.com/apikey'
        },
        { status: 500 }
      );
    }

    // Extract base64 data and mime type from data URL
    const matches = image.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      return NextResponse.json(
        { error: 'Invalid image format' },
        { status: 400 }
      );
    }
    const mimeType = matches[1];
    const base64Data = matches[2];

    console.log("MODEL:", MODEL);
    console.log("GEMINI_API_KEY from env:", process.env.GEMINI_API_KEY ? "Set" : "Not set");
    console.log("KEY length:", (process.env.GEMINI_API_KEY || "").length);
    console.log("KEY starts with 'AIza':", (process.env.GEMINI_API_KEY || "").startsWith("AIza"));
    console.log("API URL:", GEMINI_API_URL);
    console.log("Image data size:", base64Data.length, "bytes", `(${(base64Data.length / 1024 / 1024).toFixed(2)} MB)`);
    
    // 检查图片大小，如果太大可能影响性能
    if (base64Data.length > 10 * 1024 * 1024) { // 10MB
      console.warn("⚠️  图片较大，可能影响生成速度");
    }
    console.log("MIME type:", mimeType);
  
    // Prepare request data
    const requestData = JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: fullPrompt
            },
            {
              inlineData: {
                mimeType,
                data: base64Data
              }
            }
          ]
        }
      ],
      generationConfig: {
        responseModalities: ["IMAGE"],  // 仅图片输出，提高效率
        temperature: 1.0,                // 官方推荐基础值
        topP: 0.9,                      // 平衡多样性与稳定性
        topK: 40,                       // 限制随机性过大
      }
    });

    // Call Google Gemini API using native https module with retry mechanism
    let apiResponse;
    const maxRetries = 2; // 最多重试 2 次
    let lastError: any = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`重试第 ${attempt} 次...`);
          // 等待一段时间再重试
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
        
        const apiCallStartTime = Date.now();
        console.log(`调用 Gemini API (尝试 ${attempt + 1}/${maxRetries + 1})...`);
        console.log('API call start time:', new Date().toISOString());
        const apiUrl = GEMINI_API_URL;
        apiResponse = await makeHttpsRequest(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': GEMINI_API_KEY,
            'Content-Length': Buffer.byteLength(requestData)
          }
        }, requestData);
        
        const apiCallDuration = Date.now() - apiCallStartTime;
        console.log("API Response status:", apiResponse.statusCode);
        console.log(`API call duration: ${apiCallDuration}ms (${(apiCallDuration / 1000).toFixed(2)}s)`);
        // 成功则跳出重试循环
        break;
      } catch (fetchError: any) {
        lastError = fetchError;
        console.error(`HTTPS request error (尝试 ${attempt + 1}/${maxRetries + 1}):`, {
          name: fetchError?.name,
          message: fetchError?.message,
          code: fetchError?.code,
          errno: fetchError?.errno,
          syscall: fetchError?.syscall
        });
        
        // 如果是最后一次尝试，或者错误不是可重试的错误，则抛出错误
        if (attempt === maxRetries) {
          // 最后一次尝试失败，准备返回错误
          break;
        }
        
        // 如果是 socket hang up 或连接错误，可以重试
        const isRetryable = fetchError.message?.includes('socket hang up') || 
                           fetchError.message?.includes('ECONNRESET') ||
                           fetchError.code === 'ECONNRESET' ||
                           fetchError.message?.includes('ETIMEDOUT') ||
                           fetchError.code === 'ETIMEDOUT';
        
        if (!isRetryable) {
          // 不可重试的错误，直接抛出
          break;
        }
      }
    }
    
    // 如果所有重试都失败
    if (!apiResponse) {
      const fetchError = lastError;
      // 提供更详细的错误信息
      let errorDetails = `网络错误: ${fetchError?.message || '未知错误'}`;
      let errorTitle = '无法连接到 Gemini API';
      
      if (fetchError?.message?.includes('ENOTFOUND') || fetchError?.message?.includes('getaddrinfo')) {
        errorDetails = 'DNS 解析失败，无法连接到 Google API 服务器。';
        errorTitle = 'DNS 解析失败';
      } else if (fetchError?.message?.includes('ECONNREFUSED') || fetchError?.code === 'ECONNREFUSED') {
        errorDetails = '连接被拒绝。可能是防火墙或代理设置问题。';
        errorTitle = '连接被拒绝';
      } else if (fetchError?.message?.includes('ETIMEDOUT') || fetchError?.code === 'ETIMEDOUT' || fetchError?.message?.includes('timeout')) {
        errorDetails = '连接超时。无法访问 Google API 服务器。如果您在中国大陆，可能需要配置代理。';
        errorTitle = '连接超时';
      } else if (fetchError?.message?.includes('certificate') || fetchError?.message?.includes('SSL')) {
        errorDetails = 'SSL 证书验证失败。请检查系统时间是否正确。';
        errorTitle = 'SSL 证书错误';
      } else if (fetchError?.code === 'ENOTFOUND' || fetchError?.errno === 'ENOTFOUND') {
        errorDetails = '无法解析域名。请检查网络连接或 DNS 设置。如果您在中国大陆，可能需要配置代理。';
        errorTitle = '域名解析失败';
      } else if (fetchError?.message?.includes('socket hang up') || fetchError?.code === 'ECONNRESET') {
        errorDetails = '连接被意外关闭（socket hang up）。可能是代理连接不稳定、网络中断或请求过大。已重试多次，请稍后重试。';
        errorTitle = '连接中断';
      }
      
      return NextResponse.json(
        { 
          error: errorTitle, 
          details: `${errorDetails}\n\n解决方案：\n1. 检查网络连接\n2. 如果您在中国大陆，需要配置代理（VPN）\n3. 检查防火墙设置\n4. 确认 API Key 是否正确\n\n配置代理：如果使用代理，请在环境变量中设置 HTTP_PROXY 和 HTTPS_PROXY`
        },
        { status: 503 }
      );
    }

    if (apiResponse.statusCode !== 200) {
      console.error('Gemini API error:', apiResponse.body);
      return NextResponse.json(
        { error: 'Failed to generate rendering', details: apiResponse.body },
        { status: apiResponse.statusCode }
      );
    }

    let result;
    try {
      result = JSON.parse(apiResponse.body);
    } catch (parseError) {
      console.error('Failed to parse API response:', parseError);
      return NextResponse.json(
        { error: 'Invalid API response format', details: '无法解析 API 响应' },
        { status: 500 }
      );
    }
    
    // 记录 Token 使用情况
    const usageMetadata = result.usageMetadata || result.usage || {};
    const tokenUsage = {
      timestamp: new Date().toISOString(),
      model: MODEL,
      inputTokens: usageMetadata.promptTokenCount || usageMetadata.input_tokens || usageMetadata.inputTokens || 0,
      outputTokens: usageMetadata.candidatesTokenCount || usageMetadata.output_tokens || usageMetadata.outputTokens || 0,
      totalTokens: usageMetadata.totalTokenCount || usageMetadata.total_tokens || usageMetadata.totalTokens || 0,
      userId: 'anonymous',
      style: style,
      strength: strength,
    };
    
    // 记录到控制台（开发环境）
    console.log('📊 Token Usage:', JSON.stringify(tokenUsage, null, 2));
    
    // 记录到日志文件
    const logDir = path.join(process.cwd(), 'logs');
    const logFile = path.join(logDir, 'token-usage.log');
    
    try {
      // 确保日志目录存在
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      // 追加日志到文件（JSON Lines 格式，每行一个 JSON 对象）
      const logEntry = JSON.stringify(tokenUsage) + '\n';
      fs.appendFileSync(logFile, logEntry, 'utf8');
      console.log(`✅ Token usage logged to: ${logFile}`);
    } catch (logError) {
      console.error('❌ Failed to write token usage log:', logError);
      // 即使日志写入失败，也不影响主流程
    }
    
    // Extract image from Gemini response
    const candidates = result.candidates;
    if (!candidates || candidates.length === 0) {
      return NextResponse.json(
        { error: 'No image generated' },
        { status: 500 }
      );
    }

    const parts = candidates[0].content?.parts;
    if (!parts) {
      return NextResponse.json(
        { error: 'Invalid response format' },
        { status: 500 }
      );
    }

    // Find the image part in the response
    let generatedImage = null;
    for (const part of parts) {
      // Check for inlineData (new format) or inline_data (old format)
      const inline = (part as any).inlineData || (part as any).inline_data;
      if (inline?.data) {
        const imgMimeType = inline.mimeType || inline.mime_type || 'image/png';
        const imgData = inline.data;
        generatedImage = `data:${imgMimeType};base64,${imgData}`;
        break;
      }
      
      // Also check for image parts directly
      if ((part as any).image) {
        const imagePart = (part as any).image;
        if (imagePart.inlineData?.data) {
          const imgMimeType = imagePart.inlineData.mimeType || 'image/png';
          const imgData = imagePart.inlineData.data;
          generatedImage = `data:${imgMimeType};base64,${imgData}`;
          break;
        }
      }
    }

    if (!generatedImage) {
      console.error('No image found in Gemini response. Response structure:', JSON.stringify(result, null, 2));
      return NextResponse.json(
        { 
          error: 'No image in API response',
          details: 'The API did not return a generated image. Please check the API response format.'
        },
        { status: 500 }
      );
    }

    const totalDuration = Date.now() - startTime;
    console.log(`✅ Generate API completed successfully in ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`);

    return NextResponse.json({
      success: true,
      result: generatedImage,
      prompt: fullPrompt,
      usage: {
        inputTokens: tokenUsage.inputTokens,
        outputTokens: tokenUsage.outputTokens,
        totalTokens: tokenUsage.totalTokens,
      },
    });

  } catch (error) {
    console.error('Generate error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // 记录详细错误信息到控制台
    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack,
      name: error instanceof Error ? error.name : 'Unknown'
    });
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: errorMessage,
        // 只在开发环境显示堆栈信息
        ...(process.env.NODE_ENV === 'development' && errorStack ? { stack: errorStack } : {})
      },
      { status: 500 }
    );
  }
}
