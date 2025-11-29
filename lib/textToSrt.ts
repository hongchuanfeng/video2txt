export interface TextEntry {
  time?: string;
  content?: string;
  translation?: string;
  original?: string;
  subtitle?: string;
}

/**
 * Parse text file content and extract subtitle entries
 * Supports formats like:
 * Time: 00:00:01,000 --> 00:00:03,000
 * Content: Hello world
 * Translation: 你好世界
 * Original: Hello world
 * Subtitle: Hello world
 */
export function parseText(content: string): TextEntry[] {
  const entries: TextEntry[] = [];
  const blocks = content.trim().split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length === 0) continue;

    const entry: TextEntry = {};

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Parse time
      if (trimmedLine.startsWith('Time:') || trimmedLine.startsWith('时间:')) {
        const timeMatch = trimmedLine.match(/(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/);
        if (timeMatch) {
          entry.time = `${timeMatch[1]} --> ${timeMatch[2]}`;
        }
      }
      // Parse content
      else if (trimmedLine.startsWith('Content:') || trimmedLine.startsWith('内容:')) {
        entry.content = trimmedLine.replace(/^(Content:|内容:)\s*/, '');
      }
      // Parse translation
      else if (trimmedLine.startsWith('Translation:') || trimmedLine.startsWith('翻译:')) {
        entry.translation = trimmedLine.replace(/^(Translation:|翻译:)\s*/, '');
      }
      // Parse original
      else if (trimmedLine.startsWith('Original:') || trimmedLine.startsWith('原文:')) {
        entry.original = trimmedLine.replace(/^(Original:|原文:)\s*/, '');
      }
      // Parse subtitle
      else if (trimmedLine.startsWith('Subtitle:') || trimmedLine.startsWith('字幕:')) {
        entry.subtitle = trimmedLine.replace(/^(Subtitle:|字幕:)\s*/, '');
      }
      // If no prefix, treat as content
      else if (!entry.content && !entry.subtitle) {
        entry.content = trimmedLine;
      }
    }

    // Use subtitle if available, otherwise use content
    if (entry.subtitle || entry.content) {
      entries.push(entry);
    }
  }

  return entries;
}

/**
 * Convert text entries to SRT format
 */
export function convertToSRT(entries: TextEntry[]): string {
  let srtContent = '';
  let index = 1;

  for (const entry of entries) {
    // Skip if no time or content
    if (!entry.time || (!entry.subtitle && !entry.content)) {
      continue;
    }

    // Use subtitle if available, otherwise use content
    const text = entry.subtitle || entry.content || '';
    
    // Build subtitle text
    let subtitleText = text;
    if (entry.translation && entry.translation !== text) {
      subtitleText = `${text}\n${entry.translation}`;
    } else if (entry.original && entry.original !== text) {
      subtitleText = `${entry.original}\n${text}`;
    }

    // Format time (ensure comma separator)
    const formattedTime = entry.time.replace(/\./g, ',');

    // Write SRT entry
    srtContent += `${index}\n`;
    srtContent += `${formattedTime}\n`;
    srtContent += `${subtitleText}\n`;
    srtContent += '\n';

    index++;
  }

  return srtContent.trim();
}

/**
 * Generate time codes automatically if not provided
 * This is a simple implementation that distributes time evenly
 */
export function generateTimeCodes(entries: TextEntry[], startTime: string = '00:00:00,000', durationPerEntry: number = 3000): TextEntry[] {
  const entriesWithTime = [...entries];
  let currentTime = parseTime(startTime);

  for (let i = 0; i < entriesWithTime.length; i++) {
    if (!entriesWithTime[i].time) {
      const start = formatTime(currentTime);
      const end = formatTime(currentTime + durationPerEntry);
      entriesWithTime[i].time = `${start} --> ${end}`;
      currentTime += durationPerEntry;
    } else {
      // Extract end time from existing time code
      const timeMatch = entriesWithTime[i].time?.match(/-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/);
      if (timeMatch) {
        currentTime = parseTime(timeMatch[1]);
      }
    }
  }

  return entriesWithTime;
}

function parseTime(timeStr: string): number {
  const parts = timeStr.split(/[:,]/);
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseInt(parts[2], 10);
  const milliseconds = parseInt(parts[3], 10);
  return hours * 3600000 + minutes * 60000 + seconds * 1000 + milliseconds;
}

function formatTime(milliseconds: number): string {
  const hours = Math.floor(milliseconds / 3600000);
  const minutes = Math.floor((milliseconds % 3600000) / 60000);
  const seconds = Math.floor((milliseconds % 60000) / 1000);
  const ms = milliseconds % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

