const MAX_CHAPTERS = 50;

const CHAPTER_PATTERNS = [
  /^(chapter|unit|module|section)\s+(\d+[A-Za-z]?)(?:\s*[:\-–])?\s*(.*)$/i
];

const normalizeLine = (line) => String(line || '').replace(/\s+/g, ' ').trim();

const NOISE_TITLE_PATTERNS = [
  /^summary\b/i,
  /^quotes?\b/i,
  /^table of contents\b/i,
  /^contents\b/i,
  /^index\b/i,
  /^references\b/i,
  /^bibliography\b/i
];

const isLikelyPageNumber = (text) => {
  if (!text) return false;
  const cleaned = String(text).trim();
  return /^\d+(\s*[-–]\s*\d+)?$/.test(cleaned);
};

const isChapterHeading = (line) => Boolean(extractChapterFromLine(line));

const stripTrailingPageRange = (text) => {
  if (!text) return '';
  return String(text)
    .replace(/\s*[-–]\s*\d+(\s*[-–]\s*\d+)?\s*$/g, '')
    .trim();
};

const extractChapterFromLine = (line) => {
  const cleaned = normalizeLine(line);
  if (!cleaned) return null;

  if (/^\d+\s*[-–]\s*\d+$/.test(cleaned)) {
    return null;
  }

  for (const pattern of CHAPTER_PATTERNS) {
    const match = cleaned.match(pattern);
    if (!match) continue;

    if (pattern === CHAPTER_PATTERNS[0]) {
      const [, label, number, name] = match;
      return {
        number: number?.trim() || '',
        name: stripTrailingPageRange(name?.trim() || ''),
        label: label?.trim() || 'Chapter'
      };
    }

    if (pattern === CHAPTER_PATTERNS[1]) {
      const [, number, label, name] = match;
      return {
        number: number?.trim() || '',
        name: stripTrailingPageRange(name?.trim() || ''),
        label: label?.trim() || 'Chapter'
      };
    }

    const [, number, name] = match;
    return {
      number: number?.trim() || '',
      name: stripTrailingPageRange(name?.trim() || ''),
      label: 'Chapter'
    };
  }

  return null;
};

const formatChapterTitle = ({ label, number, name }) => {
  const parts = [];
  if (label && number) {
    parts.push(`${label.charAt(0).toUpperCase() + label.slice(1)} ${number}`);
  } else if (number) {
    parts.push(`Chapter ${number}`);
  }
  if (name) {
    parts.push(name);
  }
  return parts.join(' - ').trim();
};

const extractChapters = (content = '') => {
  const lines = String(content || '').split(/\r?\n/).map(normalizeLine).filter(Boolean);
  const chapters = [];
  const seen = new Set();
  const seenNumbers = new Set();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const chapter = extractChapterFromLine(line);
    if (!chapter) continue;

    let name = chapter.name || '';
    if (isLikelyPageNumber(name)) {
      name = '';
    }

    if (!name) {
      const nextLine = lines[i + 1];
      if (
        nextLine &&
        nextLine.length <= 120 &&
        !isChapterHeading(nextLine) &&
        !isLikelyPageNumber(nextLine)
      ) {
        name = nextLine;
      }
    }

    if (NOISE_TITLE_PATTERNS.some((pattern) => pattern.test(name))) {
      name = '';
    }

    if (!name && !chapter.name) {
      // Skip headings without a meaningful title when no title is detected.
      continue;
    }

    const normalizedChapter = {
      ...chapter,
      name
    };

    const title = formatChapterTitle(normalizedChapter);
    const key = `${normalizedChapter.number || ''}::${normalizedChapter.name || ''}`.toLowerCase();
    if (!title || seen.has(key)) continue;

    if (normalizedChapter.number && seenNumbers.has(normalizedChapter.number)) {
      continue;
    }

    seen.add(key);
    if (normalizedChapter.number) {
      seenNumbers.add(normalizedChapter.number);
    }
    chapters.push({
      number: normalizedChapter.number || '',
      name: normalizedChapter.name || '',
      title,
      raw: line
    });

    if (chapters.length >= MAX_CHAPTERS) break;
  }

  return chapters;
};

const extractChapterRanges = (content = '') => {
  const rawLines = String(content || '').split(/\r?\n/);
  const normalized = rawLines.map(normalizeLine);

  const chapterMarkers = [];
  for (let i = 0; i < normalized.length; i++) {
    const chapter = extractChapterFromLine(normalized[i]);
    if (!chapter) continue;

    let name = chapter.name || '';
    if (isLikelyPageNumber(name)) {
      name = '';
    }

    if (!name) {
      const nextLine = normalized[i + 1];
      if (
        nextLine &&
        nextLine.length <= 120 &&
        !isChapterHeading(nextLine) &&
        !isLikelyPageNumber(nextLine)
      ) {
        name = nextLine;
      }
    }

    if (NOISE_TITLE_PATTERNS.some((pattern) => pattern.test(name))) {
      name = '';
    }

    if (!name && !chapter.name) {
      continue;
    }

    const normalizedChapter = {
      ...chapter,
      name
    };

    const title = formatChapterTitle(normalizedChapter);
    if (!title) continue;

    chapterMarkers.push({
      ...normalizedChapter,
      title,
      startLine: i
    });
  }

  const ranges = [];
  for (let i = 0; i < chapterMarkers.length; i++) {
    const current = chapterMarkers[i];
    const next = chapterMarkers[i + 1];
    const endLine = next ? Math.max(current.startLine, next.startLine - 1) : rawLines.length - 1;

    const contentLines = rawLines.slice(current.startLine, endLine + 1).join('\n');
    ranges.push({
      number: current.number || '',
      name: current.name || '',
      title: current.title || '',
      content: contentLines
    });
  }

  return ranges;
};

module.exports = {
  extractChapters,
  extractChapterRanges,
  formatChapterTitle
};
