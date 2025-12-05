-- User Subscriptions Table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  credits INTEGER NOT NULL DEFAULT 0,
  free_trial_used BOOLEAN NOT NULL DEFAULT false,
  subscription_plan_id TEXT,
  subscription_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);

-- Function to deduct credits (with check)
CREATE OR REPLACE FUNCTION deduct_user_credits(
  user_id_param UUID,
  credits_param INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  current_credits INTEGER;
BEGIN
  -- Get current credits
  SELECT credits INTO current_credits
  FROM user_subscriptions
  WHERE user_id = user_id_param;

  -- Check if user exists
  IF current_credits IS NULL THEN
    RETURN false;
  END IF;

  -- Check if enough credits
  IF current_credits < credits_param THEN
    RETURN false;
  END IF;

  -- Deduct credits
  UPDATE user_subscriptions
  SET credits = credits - credits_param,
      updated_at = NOW()
  WHERE user_id = user_id_param;

  RETURN true;
END;
$$;

-- Enable Row Level Security (RLS)
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own subscription
CREATE POLICY "Users can view own subscription"
  ON user_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can update their own subscription (for free trial)
CREATE POLICY "Users can update own subscription"
  ON user_subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Note: Adding credits should be done server-side only (via service role key)
-- This is handled in the API routes with service role client



-- 用户订阅订单表：记录每一次购买的订阅套餐
CREATE TABLE IF NOT EXISTS subscription_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),      -- 订单主键
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- 用户 ID（关联 Supabase auth.users）
  plan_id TEXT NOT NULL,                              -- 套餐 ID（如 plan_10 / plan_30 / plan_100）
  plan_name TEXT NOT NULL,                            -- 套餐名称（Basic / Standard / Premium）
  price_usd NUMERIC(10,2) NOT NULL,                   -- 订单价格（单位：USD）
  credits INTEGER NOT NULL,                           -- 本次购买获得的积分数量
  start_at TIMESTAMPTZ NOT NULL,                      -- 套餐生效时间
  end_at TIMESTAMPTZ,                                 -- 套餐结束/到期时间（可为空，按业务计算）
  status TEXT NOT NULL DEFAULT 'completed',           -- 订单状态（pending / completed / failed / cancelled）
  payment_provider TEXT,                              -- 支付渠道（如 stripe / paypal，预留）
  payment_reference TEXT,                             -- 支付网关返回的订单号/交易号
  transaction_id TEXT,                                -- CREEM 交易 ID（用于去重）
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),      -- 创建时间
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()       -- 更新时间
);

-- 字段说明（COMMENT）
COMMENT ON TABLE subscription_orders IS '记录用户每一次购买订阅套餐的订单信息，用于“我的订单”展示。';

COMMENT ON COLUMN subscription_orders.id                IS '订单主键 ID（UUID）。';
COMMENT ON COLUMN subscription_orders.user_id           IS '用户 ID，关联 auth.users 表。';
COMMENT ON COLUMN subscription_orders.plan_id           IS '订阅套餐 ID（如 plan_10 / plan_30 / plan_100）。';
COMMENT ON COLUMN subscription_orders.plan_name         IS '订阅套餐名称（如 Basic / Standard / Premium）。';
COMMENT ON COLUMN subscription_orders.price_usd         IS '订单金额（单位：美元 USD）。';
COMMENT ON COLUMN subscription_orders.credits           IS '本次订单发放的积分数量。';
COMMENT ON COLUMN subscription_orders.start_at          IS '套餐生效时间。';
COMMENT ON COLUMN subscription_orders.end_at            IS '套餐结束或到期时间。';
COMMENT ON COLUMN subscription_orders.status            IS '订单状态：pending / completed / failed / cancelled。';
COMMENT ON COLUMN subscription_orders.payment_provider  IS '支付渠道标识（如 stripe、paypal），预留字段。';
COMMENT ON COLUMN subscription_orders.payment_reference IS '支付网关返回的交易号 / 订单号。';
COMMENT ON COLUMN subscription_orders.transaction_id    IS 'CREEM 交易 ID，用于去重，防止重复处理。';
COMMENT ON COLUMN subscription_orders.created_at        IS '记录创建时间。';
COMMENT ON COLUMN subscription_orders.updated_at        IS '记录最近更新时间。';

-- 常用索引
CREATE INDEX IF NOT EXISTS idx_subscription_orders_user_id
  ON subscription_orders(user_id);

CREATE INDEX IF NOT EXISTS idx_subscription_orders_created_at
  ON subscription_orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_subscription_orders_transaction_id
  ON subscription_orders(transaction_id)
  WHERE transaction_id IS NOT NULL;


  -- 视频转字幕使用记录表：记录每次调用视频转字幕接口的明细
CREATE TABLE IF NOT EXISTS video_subtitle_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),      -- 记录主键
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- 用户 ID
  video_name TEXT,                                    -- 视频名称（文件名）
  video_duration_seconds INTEGER,                     -- 视频时长（秒）
  video_url TEXT,                                     -- 原始视频文件 URL（存 COS/S3 等）
  subtitle_url TEXT,                                  -- 生成的字幕文件 URL（SRT 等）
  task_id TEXT,                                       -- 第三方任务 ID（例如腾讯云任务 ID），便于排查
  status TEXT NOT NULL DEFAULT 'processing',          -- 处理状态：processing / success / failed
  error_message TEXT,                                 -- 失败时的错误信息（可选）
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),      -- 创建时间（任务发起时间）
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()       -- 更新时间（状态变更时间）
);

-- 字段说明（COMMENT）
COMMENT ON TABLE video_subtitle_jobs IS '记录用户使用“视频转字幕文件”功能的每一次任务明细。';

COMMENT ON COLUMN video_subtitle_jobs.id                    IS '任务记录主键 ID（UUID）。';
COMMENT ON COLUMN video_subtitle_jobs.user_id               IS '用户 ID，关联 auth.users 表。';
COMMENT ON COLUMN video_subtitle_jobs.video_name            IS '视频名称或文件名。';
COMMENT ON COLUMN video_subtitle_jobs.video_duration_seconds IS '视频时长，单位为秒。';
COMMENT ON COLUMN video_subtitle_jobs.video_url             IS '原始视频文件的存储 URL（如 COS/S3）。';
COMMENT ON COLUMN video_subtitle_jobs.subtitle_url          IS '生成的字幕文件（SRT 等）的存储 URL。';
COMMENT ON COLUMN video_subtitle_jobs.task_id               IS '调用第三方字幕服务时返回的任务 ID。';
COMMENT ON COLUMN video_subtitle_jobs.status                IS '任务状态：processing / success / failed。';
COMMENT ON COLUMN video_subtitle_jobs.error_message         IS '任务失败时的错误信息或返回内容。';
COMMENT ON COLUMN video_subtitle_jobs.created_at            IS '记录创建时间（任务创建时间）。';
COMMENT ON COLUMN video_subtitle_jobs.updated_at            IS '记录最近更新时间（状态变更时间）。';

-- 常用索引
CREATE INDEX IF NOT EXISTS idx_video_subtitle_jobs_user_id
  ON video_subtitle_jobs(user_id);

CREATE INDEX IF NOT EXISTS idx_video_subtitle_jobs_created_at
  ON video_subtitle_jobs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_video_subtitle_jobs_task_id
  ON video_subtitle_jobs(task_id);


-- 保活日志表：定期往这里插入一条日志，证明后台任务仍在运行
CREATE TABLE IF NOT EXISTS keepalive_logs (
  id BIGSERIAL PRIMARY KEY,                 -- 自增主键
  log_time TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- 日志时间
  log TEXT NOT NULL                         -- 日志内容（例如“保活心跳”等）
);

COMMENT ON TABLE keepalive_logs IS '后台保活/心跳日志表，用于定时任务插入一条记录。';
COMMENT ON COLUMN keepalive_logs.id IS '自增主键 ID。';
COMMENT ON COLUMN keepalive_logs.log_time IS '日志记录时间。';
COMMENT ON COLUMN keepalive_logs.log IS '日志内容描述。';

CREATE INDEX IF NOT EXISTS idx_keepalive_logs_log_time
  ON keepalive_logs(log_time DESC);


-- 联系我们留言表：记录用户通过"联系我们"页面提交的留言信息
CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),      -- 留言主键
  name TEXT NOT NULL,                                -- 留言人姓名
  email TEXT NOT NULL,                               -- 留言人邮箱
  subject TEXT NOT NULL,                             -- 留言主题
  message TEXT NOT NULL,                             -- 留言内容
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- 用户 ID（如果已登录，关联 auth.users 表；未登录则为 NULL）
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()      -- 创建时间（留言提交时间）
);

-- 字段说明（COMMENT）
COMMENT ON TABLE contact_messages IS '记录用户通过"联系我们"页面提交的留言信息。';

COMMENT ON COLUMN contact_messages.id        IS '留言主键 ID（UUID）。';
COMMENT ON COLUMN contact_messages.name      IS '留言人姓名。';
COMMENT ON COLUMN contact_messages.email     IS '留言人邮箱地址。';
COMMENT ON COLUMN contact_messages.subject   IS '留言主题。';
COMMENT ON COLUMN contact_messages.message   IS '留言内容详情。';
COMMENT ON COLUMN contact_messages.user_id    IS '用户 ID（如果用户已登录，关联 auth.users 表；未登录则为 NULL）。';
COMMENT ON COLUMN contact_messages.created_at IS '记录创建时间（留言提交时间）。';

-- 常用索引
CREATE INDEX IF NOT EXISTS idx_contact_messages_email
  ON contact_messages(email);

CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at
  ON contact_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_messages_user_id
  ON contact_messages(user_id)
  WHERE user_id IS NOT NULL;