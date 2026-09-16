/**
 * In-memory temporary file store for public report downloads via Meta WhatsApp Cloud API.
 * Files expire after 1 hour automatically.
 */

interface CachedReportFile {
  buffer: Buffer;
  filename: string;
  contentType: string;
  expiresAt: number;
}

const fileStore = new Map<string, CachedReportFile>();

/** Clean up expired files every 15 minutes */
setInterval(() => {
  const now = Date.now();
  for (const [token, file] of fileStore.entries()) {
    if (file.expiresAt < now) {
      fileStore.delete(token);
    }
  }
}, 15 * 60 * 1000);

/**
 * Store a report file buffer and return a unique download token.
 */
export function storeReportFile(
  buffer: Buffer,
  filename: string,
  contentType: string = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
): string {
  const token = `rpt_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour TTL

  fileStore.set(token, {
    buffer,
    filename,
    contentType,
    expiresAt,
  });

  return token;
}

/**
 * Retrieve a cached report file buffer by token.
 */
export function getReportFile(token: string): CachedReportFile | null {
  const file = fileStore.get(token);
  if (!file) return null;
  if (file.expiresAt < Date.now()) {
    fileStore.delete(token);
    return null;
  }
  return file;
}
