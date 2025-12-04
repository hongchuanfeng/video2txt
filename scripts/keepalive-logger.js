// 简单的保活定时任务：每隔一小时往 keepalive_logs 表插入一条日志

// 加载 .env.local / .env 中的环境变量，方便本地和服务器统一配置
require('dotenv').config({ path: '.env.local' });
require('dotenv').config(); // 再尝试加载 .env（不存在也没关系）

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    '[keepalive-logger] 缺少环境变量 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY，请在 .env.local 或运行环境中配置好。'
  );
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function insertKeepaliveLog() {
  const now = new Date().toISOString();
  const logText = `keepalive ping at ${now}`;

  try {
    const { error } = await supabaseAdmin
      .from('keepalive_logs')
      .insert({
        log_time: now,
        log: logText,
      });

    if (error) {
      console.error('[keepalive-logger] 插入日志失败:', error);
    } else {
      console.log('[keepalive-logger] 已写入保活日志:', logText);
    }
  } catch (err) {
    console.error('[keepalive-logger] 未捕获异常:', err);
  }
}

// 立即执行一次
insertKeepaliveLog();

// 每隔一小时执行一次（单位：毫秒）
const ONE_HOUR_MS = 60 * 60 * 1000;
setInterval(insertKeepaliveLog, ONE_HOUR_MS);

// 防止 Node 提前退出
process.on('SIGINT', () => {
  console.log('\n[keepalive-logger] 收到 SIGINT，准备退出。');
  process.exit(0);
});


