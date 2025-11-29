export interface SRTEntry {
  index: number;
  startTime: string;
  endTime: string;
  text: string;
  translation?: string;
  original?: string;
}

export function parseSRT(content: string): SRTEntry[] {
  const entries: SRTEntry[] = [];
  const blocks = content.trim().split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 3) continue;

    const index = parseInt(lines[0], 10);
    if (isNaN(index)) continue;

    const timeLine = lines[1];
    const timeMatch = timeLine.match(/(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/);
    if (!timeMatch) continue;

    const startTime = timeMatch[1];
    const endTime = timeMatch[2];
    const textLines = lines.slice(2);

    // Try to detect translation and original text
    let text = '';
    let translation = '';
    let original = '';

    if (textLines.length > 1) {
      // Assume first line is original, second is translation, or vice versa
      text = textLines.join(' ');
      original = textLines[0];
      translation = textLines.length > 1 ? textLines[1] : '';
    } else {
      text = textLines[0];
    }

    entries.push({
      index,
      startTime,
      endTime,
      text,
      translation: translation || undefined,
      original: original || undefined,
    });
  }

  return entries;
}

export function convertToText(entries: SRTEntry[]): string {
  let output = '';
  
  for (const entry of entries) {
    output += `Time: ${entry.startTime} --> ${entry.endTime}\n`;
    output += `Content: ${entry.text}\n`;
    if (entry.translation) {
      output += `Translation: ${entry.translation}\n`;
    }
    if (entry.original && entry.original !== entry.text) {
      output += `Original: ${entry.original}\n`;
    }
    output += `Subtitle: ${entry.text}\n`;
    output += '\n';
  }

  return output.trim();
}

