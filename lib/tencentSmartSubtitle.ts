import * as tencentcloud from 'tencentcloud-sdk-nodejs';
import type {
  ProcessMediaRequest,
  SmartSubtitlesResult,
  SmartSubtitleTaskAsrFullTextSegmentItem,
  SmartSubtitleTaskTransTextSegmentItem
} from 'tencentcloud-sdk-nodejs/tencentcloud/services/mps/v20190612/mps_models';

const { Client: MpsClient } = tencentcloud.mps.v20190612;

export type SubtitleSegment = {
  startTime: number;
  endTime: number;
  text: string;
  translation?: string;
  confidence?: number;
};

export type SubtitleFileInfo = {
  type: 'asr' | 'translation';
  path?: string;
  subtitlePath?: string;
  url?: string;
};

export type TencentSmartSubtitleResult = {
  taskId: string;
  segments: SubtitleSegment[];
  subtitleFiles: SubtitleFileInfo[];
};

export type TencentSmartSubtitleConfig = {
  secretId: string;
  secretKey: string;
  region: string;
  templateId: number;
  cosBucket: string;
  cosRegion: string;
  outputDir: string;
  uploadDir: string;
  outputPathPrefix?: string;
  endpoint?: string;
};

const DEFAULT_REGION = 'ap-guangzhou';
const DEFAULT_OUTPUT_DIR = '/smart-subtitles/';
const DEFAULT_UPLOAD_DIR = '/uploads/';

export type SmartSubtitleJobInput =
  | { mode: 'url'; value: string }
  | { mode: 'cos'; objectKey: string };

export function getTencentSmartSubtitleConfig(): TencentSmartSubtitleConfig {
  const secretId = process.env.TENCENT_SECRET_ID;
  const secretKey = process.env.TENCENT_SECRET_KEY;
  const cosBucket = process.env.TENCENT_COS_BUCKET;
  const cosRegion = process.env.TENCENT_COS_REGION;

  if (!secretId || !secretKey) {
    throw new Error('Tencent Cloud SecretId/SecretKey 未配置，请设置 TENCENT_SECRET_ID 和 TENCENT_SECRET_KEY 环境变量。');
  }

  if (!cosBucket || !cosRegion) {
    throw new Error('Tencent Cloud COS 信息缺失，请设置 TENCENT_COS_BUCKET 和 TENCENT_COS_REGION 环境变量。');
  }

  const templateIdEnv = process.env.TENCENT_SMART_SUBTITLE_TEMPLATE_ID ?? '30341';
  const templateId = Number(templateIdEnv);

  if (!Number.isFinite(templateId)) {
    throw new Error('TENCENT_SMART_SUBTITLE_TEMPLATE_ID 不是有效的数字。');
  }

  const outputDir = normalizeCosDirectory(process.env.TENCENT_COS_OUTPUT_DIR ?? DEFAULT_OUTPUT_DIR);
  const uploadDir = normalizeCosDirectory(process.env.TENCENT_COS_UPLOAD_DIR ?? DEFAULT_UPLOAD_DIR);

  return {
    secretId,
    secretKey,
    region: process.env.TENCENT_REGION || DEFAULT_REGION,
    templateId,
    cosBucket,
    cosRegion,
    outputDir,
    uploadDir,
    outputPathPrefix: process.env.TENCENT_SMART_SUBTITLE_OUTPUT_PREFIX,
    endpoint: process.env.TENCENT_MPS_ENDPOINT
  };
}

function normalizeCosDirectory(dir: string): string {
  if (!dir) {
    return DEFAULT_OUTPUT_DIR;
  }

  let next = dir.trim();
  if (!next.startsWith('/')) {
    next = `/${next}`;
  }
  if (!next.endsWith('/')) {
    next = `${next}/`;
  }
  return next;
}

export function createMpsClient(config: TencentSmartSubtitleConfig) {
  return new MpsClient({
    credential: {
      secretId: config.secretId,
      secretKey: config.secretKey
    },
    region: config.region,
    profile: {
      httpProfile: {
        endpoint: config.endpoint || 'mps.tencentcloudapi.com'
      }
    }
  });
}

export async function submitSmartSubtitleJob(
  client: InstanceType<typeof MpsClient>,
  config: TencentSmartSubtitleConfig,
  input: SmartSubtitleJobInput
): Promise<string> {
  const InputInfo =
    input.mode === 'cos'
      ? {
          Type: 'COS' as const,
          CosInputInfo: {
            Bucket: config.cosBucket,
            Region: config.cosRegion,
            Object: input.objectKey
          }
        }
      : {
          Type: 'URL' as const,
          UrlInputInfo: {
            Url: input.value
          }
        };

  const request: ProcessMediaRequest = {
    InputInfo,
    OutputStorage: {
      Type: 'COS',
      CosOutputStorage: {
        Bucket: config.cosBucket,
        Region: config.cosRegion
      }
    },
    OutputDir: config.outputDir,
    SmartSubtitlesTask: {
      Definition: config.templateId,
      OutputStorage: {
        Type: 'COS',
        CosOutputStorage: {
          Bucket: config.cosBucket,
          Region: config.cosRegion
        }
      },
      OutputObjectPath: config.outputPathPrefix
    },
    TaskType: 'Online'
  };

  const response = await client.ProcessMedia(request);
  if (!response?.TaskId) {
    throw new Error('腾讯云未返回任务 ID。');
  }
  return response.TaskId;
}

export async function waitForSmartSubtitleResult(
  client: InstanceType<typeof MpsClient>,
  taskId: string,
  {
    pollIntervalMs = 5000,
    timeoutMs = 240000
  }: { pollIntervalMs?: number; timeoutMs?: number } = {}
): Promise<SmartSubtitlesResult[]> {
  const startTime = Date.now();
  while (Date.now() - startTime <= timeoutMs) {
    const detail = await client.DescribeTaskDetail({ TaskId: taskId });
    const status = detail?.Status;

    if (status === 'FINISH') {
      const workflow = detail.WorkflowTask;
      if (!workflow) {
        throw new Error('任务已完成，但未获取到 WorkflowTask。');
      }
      if (workflow.ErrCode && workflow.ErrCode !== 0) {
        throw new Error(workflow.Message || `任务失败，错误码：${workflow.ErrCode}`);
      }
      if (!workflow.SmartSubtitlesTaskResult || workflow.SmartSubtitlesTaskResult.length === 0) {
        throw new Error('任务完成，但未返回字幕结果。');
      }
      return workflow.SmartSubtitlesTaskResult;
    }

    if (status !== 'PROCESSING' && status !== 'WAITING') {
      throw new Error(`任务状态异常：${status || 'UNKNOWN'}`);
    }

    await delay(pollIntervalMs);
  }

  throw new Error('等待腾讯云字幕生成超时，请稍后重试。');
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function buildSegmentsFromResults(results: SmartSubtitlesResult[]): {
  segments: SubtitleSegment[];
  files: SubtitleFileInfo[];
} {
  const segments: SubtitleSegment[] = [];
  const files: SubtitleFileInfo[] = [];

  for (const result of results) {
    if (result.AsrFullTextTask?.Output) {
      files.push({
        type: 'asr',
        path: result.AsrFullTextTask.Output.Path,
        subtitlePath: result.AsrFullTextTask.Output.SubtitlePath
      });
      appendAsrSegments(result.AsrFullTextTask.Output.SegmentSet ?? [], segments);
    }

    if (result.TransTextTask?.Output) {
      files.push({
        type: 'translation',
        path: result.TransTextTask.Output.Path,
        subtitlePath: result.TransTextTask.Output.SubtitlePath
      });
      appendTranslationSegments(result.TransTextTask.Output.SegmentSet ?? [], segments);
    }

    if (result.PureSubtitleTransTask?.Output?.SubtitleResults?.length) {
      for (const item of result.PureSubtitleTransTask.Output.SubtitleResults) {
        files.push({
          type: 'translation',
          path: item.SubtitlePath,
          subtitlePath: item.SubtitlePath
        });
      }
    }
  }

  segments.sort((a, b) => a.startTime - b.startTime);

  return {
    segments,
    files: dedupeFiles(files)
  };
}

function dedupeFiles(files: SubtitleFileInfo[]): SubtitleFileInfo[] {
  const seen = new Set<string>();
  const unique: SubtitleFileInfo[] = [];

  for (const file of files) {
    const key = `${file.type}-${file.path ?? ''}-${file.subtitlePath ?? ''}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(file);
  }

  return unique;
}

function appendAsrSegments(
  items: SmartSubtitleTaskAsrFullTextSegmentItem[],
  accumulator: SubtitleSegment[]
) {
  for (const item of items) {
    if (typeof item.StartTimeOffset !== 'number' || typeof item.EndTimeOffset !== 'number') {
      continue;
    }
    const text = (item.Text ?? '').trim();
    if (!text) {
      continue;
    }
    accumulator.push({
      startTime: item.StartTimeOffset,
      endTime: item.EndTimeOffset,
      text,
      confidence: item.Confidence
    });
  }
}

function appendTranslationSegments(
  items: SmartSubtitleTaskTransTextSegmentItem[],
  accumulator: SubtitleSegment[]
) {
  for (const item of items) {
    if (typeof item.StartTimeOffset !== 'number' || typeof item.EndTimeOffset !== 'number') {
      continue;
    }
    const text = (item.Text ?? '').trim();
    const translation = (item.Trans ?? '').trim();
    if (!text && !translation) {
      continue;
    }
    accumulator.push({
      startTime: item.StartTimeOffset,
      endTime: item.EndTimeOffset,
      text,
      translation: translation || undefined,
      confidence: item.Confidence
    });
  }
}

export function segmentsToSrt(segments: SubtitleSegment[]): string {
  if (!segments.length) {
    return '';
  }

  return segments
    .map((segment, index) => {
      const start = secondsToSrtTimestamp(segment.startTime);
      const end = secondsToSrtTimestamp(segment.endTime);
      const content = [segment.text, segment.translation].filter(Boolean).join('\n');
      return `${index + 1}\n${start} --> ${end}\n${content}\n`;
    })
    .join('\n')
    .trim();
}

function secondsToSrtTimestamp(seconds: number): string {
  const totalMs = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(totalMs / 3_600_000);
  const minutes = Math.floor((totalMs % 3_600_000) / 60_000);
  const secs = Math.floor((totalMs % 60_000) / 1000);
  const ms = totalMs % 1000;

  const pad = (value: number, size: number) => value.toString().padStart(size, '0');

  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(secs, 2)},${pad(ms, 3)}`;
}

export function buildPublicUrl(
  config: TencentSmartSubtitleConfig,
  path?: string
): string | undefined {
  if (!path) {
    return undefined;
  }

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const sanitized = path.startsWith('/') ? path : `/${path}`;
  return `https://${config.cosBucket}.cos.${config.cosRegion}.myqcloud.com${sanitized}`;
}


