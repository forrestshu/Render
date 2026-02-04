# PostHog 集成说明

本项目已集成 PostHog 用于用户行为分析和点击统计。

## 配置步骤

1. **注册 PostHog 账号**
   - 访问 https://posthog.com
   - 注册账号并创建项目

2. **获取 API Key**
   - 在 PostHog 项目设置中找到 "Project API Key"
   - 复制该 Key

3. **配置环境变量**
   
   在项目根目录创建 `.env.local` 文件（如果还没有），添加以下内容：
   
   ```env
   NEXT_PUBLIC_POSTHOG_KEY=your_posthog_project_api_key_here
   NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
   ```
   
   **注意：** 如果使用 Vercel 部署，需要在 Vercel 项目设置中添加这些环境变量。

## 追踪的事件

项目会自动追踪以下用户行为：

### 图片相关
- `image_uploaded` - 用户上传图片
  - `file_type`: 文件类型
  - `file_size`: 文件大小
- `image_removed` - 用户移除图片
- `image_downloaded` - 用户下载生成的图片
- `image_preview_opened` - 用户打开预览（通过按钮）
- `image_clicked_to_preview` - 用户点击图片放大预览
- `image_modal_opened` - 图片模态框打开
- `image_modal_closed` - 图片模态框关闭

### 风格和设置
- `style_selected` - 用户选择建筑风格
  - `style`: 风格 ID (modern, traditional, minimalist, etc.)
  - `style_name`: 风格名称（中文）
- `strength_adjusted` - 用户调整变换强度（带 500ms 防抖）
  - `strength`: 强度值 (0.3-1.0)
  - `strength_percentage`: 强度百分比

### 生成相关
- `generate_rendering_started` - 开始生成渲染图
  - `style`: 选择的风格
  - `strength`: 变换强度
  - `has_custom_prompt`: 是否有自定义提示词
  - `prompt_length`: 提示词长度
- `generate_rendering_success` - 生成成功
  - `style`: 选择的风格
  - `strength`: 变换强度
  - `has_custom_prompt`: 是否有自定义提示词
  - `usage_tokens`: API 使用的 token 数量
- `generate_rendering_failed` - 生成失败
  - `style`: 选择的风格
  - `strength`: 变换强度
  - `error_type`: 错误类型
  - `error_message`: 错误信息（前 200 字符）

### 页面浏览
- `$pageview` - 页面浏览（自动追踪）

## 查看统计数据

1. 登录 PostHog 控制台
2. 进入你的项目
3. 在 "Events" 或 "Insights" 中查看事件统计
4. 可以创建图表和仪表板来分析用户行为

## 注意事项

- PostHog 配置是可选的，如果没有配置 `NEXT_PUBLIC_POSTHOG_KEY`，应用会正常运行，只是不会发送统计数据
- 所有事件追踪都包含错误处理，不会影响应用的正常功能
- 在开发环境中，PostHog 初始化信息会输出到控制台
