# Architecture Rendering Website

基于 **Next.js** 与 **Google Gemini API** 的建筑效果图生成应用。上传建筑模型/草图图片，选择风格与强度，即可生成写实风格的效果图。

## 功能

- **图片上传**：拖放或点击上传建筑模型/草图（支持 JPG、PNG、WebP）
- **多种风格**：现代、传统、极简、工业、未来、自然
- **可调强度**：控制生成图与原图的差异程度
- **自定义描述**：可选补充提示词，细化渲染效果
- **大图自动压缩**：上传大图时自动压缩以适配 Vercel 请求体限制

## 技术栈

- **框架**：Next.js 16 (App Router)
- **样式**：Tailwind CSS 4
- **AI**：Google Gemini API（图像生成）
- **分析**：PostHog（可选）

## 本地开发

### 环境要求

- Node.js 18+
- npm 或 pnpm

### 安装与运行

```bash
# 安装依赖
npm install

# 开发模式（默认 http://localhost:3000）
npm run dev

# 生产构建
npm run build

# 生产运行
npm start
```

### 环境变量

在项目根目录创建 `.env.local`，并配置：

| 变量名 | 说明 |
|--------|------|
| `GEMINI_API_KEY` | Google Gemini API 密钥（必填） |
| `GEMINI_MODEL` | 模型名称，默认 `gemini-3-pro-image-preview` |
| `HTTPS_PROXY` / `HTTP_PROXY` | 本地开发时可选代理 |

## 部署（Vercel）

1. 将仓库连接到 [Vercel](https://vercel.com)，或在项目目录执行：
   ```bash
   npx vercel --prod
   ```
2. 在 Vercel 项目设置中配置环境变量 `GEMINI_API_KEY`（及可选的 `GEMINI_MODEL`）。
3. 部署后即可通过生成的域名访问。

## 项目结构概览

```
src/
├── app/
│   ├── page.tsx           # 首页与生成流程
│   ├── api/
│   │   └── generate/      # 调用 Gemini 的生成 API
│   └── globals.css
├── components/
│   ├── ImageUploader.tsx   # 图片上传（拖放/点击）
│   ├── ImagePreview.tsx    # 原图与生成图预览
│   ├── RenderingControls.tsx  # 风格、强度、提示词
│   └── ImageModal.tsx      # 大图预览弹窗
└── lib/
    └── posthog.ts         # PostHog 事件
```

## License

见仓库内 [LICENSE](./LICENSE) 文件。
