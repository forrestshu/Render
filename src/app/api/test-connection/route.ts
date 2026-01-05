// 测试 API 连接的端点
import { NextRequest, NextResponse } from 'next/server';
import https from 'https';
import { URL } from 'url';
import { HttpsProxyAgent } from 'https-proxy-agent';

export async function GET(request: NextRequest): Promise<Response> {
  const logs: string[] = [];

  function log(message: string) {
    const timestamp = new Date().toISOString();
    logs.push(`[${timestamp}] ${message}`);
    console.log(message);
  }

  try {
    log('=== 开始测试 API 连接 ===');

    const API_KEY = process.env.GEMINI_API_KEY || '';
    const MODEL = process.env.GEMINI_MODEL || 'gemini-3-pro-image-preview';
    // 注意：在 Vercel 生产环境中不使用代理，只在本地开发时使用
    const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
    const proxyUrl = isVercel
      ? undefined  // Vercel 上不使用代理
      : (process.env.HTTPS_PROXY ||
         process.env.HTTP_PROXY ||
         process.env.https_proxy ||
         process.env.http_proxy);

    log(`API Key: ${API_KEY ? `${API_KEY.substring(0, 15)}...` : '未设置'}`);
    log(`模型: ${MODEL}`);
    log(`环境: ${isVercel ? 'Vercel (不使用代理)' : '本地开发'}`);
    log(`代理: ${proxyUrl || '未设置'}`);

    if (!API_KEY) {
      return NextResponse.json(
        { success: false, error: 'API Key 未设置', logs },
        { status: 400 }
      ) as Response;
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
    const testData = JSON.stringify({
      contents: [{ parts: [{ text: 'Say "API is working" if you can read this.' }] }],
    });

    log(`准备连接到: ${apiUrl}`);

    const urlObj = new URL(apiUrl);

    const agent = (proxyUrl && !isVercel) ? new HttpsProxyAgent(proxyUrl) : undefined;
    if (agent) log(`✅ 使用代理: ${proxyUrl!.replace(/:[^:@]*@/, ':****@')}`);
    else log(isVercel ? '✅ Vercel 环境 - 直接连接（不使用代理）' : '⚠️  未配置代理 - 直接连接');

    const { statusCode, statusMessage, body } = await new Promise<{
      statusCode: number;
      statusMessage?: string;
      body: string;
    }>((resolve, reject) => {
      const options: https.RequestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port ? Number(urlObj.port) : 443,
        path: urlObj.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': API_KEY,
          'Content-Length': Buffer.byteLength(testData),
        },
        timeout: 30000,
        agent,
      };

      const req = https.request(options, (res) => {
        let body = '';
        log(`响应状态: ${res.statusCode} ${res.statusMessage}`);

        res.on('data', (chunk) => (body += chunk.toString()));
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode || 0,
            statusMessage: res.statusMessage,
            body,
          });
        });
      });

      req.on('error', (error: any) => {
        log(`❌ 连接错误: ${error.message}`);
        log(`错误代码: ${error.code}`);
        log(`错误类型: ${error.name}`);
        log(`系统调用: ${error.syscall}`);
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy(new Error('ETIMEDOUT'));
        log('❌ 请求超时（30秒）');
      });

      req.write(testData);
      req.end();
    });

    if (statusCode === 200) {
      try {
        const result = JSON.parse(body);
        const text =
          result.candidates?.[0]?.content?.parts?.[0]?.text || '无文本响应';
        log('✅ API 连接成功！');
        log(`响应: ${String(text).substring(0, 200)}`);

        return NextResponse.json(
          {
            success: true,
            message: 'API 连接成功',
            statusCode,
            response: String(text).substring(0, 200),
            logs,
          },
          { status: 200 }
        ) as Response;
      } catch (e) {
        log(`⚠️  解析响应失败: ${e}`);
        return NextResponse.json(
          {
            success: true,
            message: 'API 响应成功但解析失败',
            statusCode,
            body: body.substring(0, 500),
            logs,
          },
          { status: 200 }
        ) as Response;
      }
    }

    log(`❌ API 返回错误: ${statusCode} ${statusMessage || ''}`);
    log(`错误内容: ${body.substring(0, 500)}`);
    return NextResponse.json(
      {
        success: false,
        error: `API 返回错误: ${statusCode}`,
        statusCode,
        body: body.substring(0, 500),
        logs,
      },
      { status: statusCode || 500 }
    ) as Response;
  } catch (error: any) {
    const msg = error?.message || String(error);
    logs.push(`[${new Date().toISOString()}] ❌ 测试过程出错: ${msg}`);

    let errorMsg = msg;
    if (error?.code === 'ENOTFOUND' || error?.code === 'EAI_AGAIN') {
      errorMsg = 'DNS 解析失败 - 无法解析域名';
    } else if (error?.code === 'ECONNREFUSED') {
      errorMsg = '连接被拒绝 - 代理可能未运行或端口错误';
    } else if (error?.code === 'ETIMEDOUT' || msg.includes('ETIMEDOUT')) {
      errorMsg = '连接超时 - 无法访问服务器';
    } else if (msg.includes('socket hang up')) {
      errorMsg = 'Socket hang up - 连接被意外关闭';
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMsg,
        errorCode: error?.code,
        errorName: error?.name,
        logs,
      },
      { status: 500 }
    ) as Response;
  }
}
