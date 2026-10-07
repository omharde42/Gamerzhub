import { Request } from 'express';

/**
 * Normalizes an IP string by trimming and removing IPv4-mapped IPv6 prefixes (::ffff:).
 */
export function normalizeIp(ip: string | undefined): string {
  if (!ip) return '127.0.0.1';
  let cleaned = ip.trim();
  if (cleaned.startsWith('::ffff:')) {
    cleaned = cleaned.substring(7);
  }
  return cleaned;
}

/**
 * Extracts the real client IP address from express request, honoring proxy headers.
 */
export function extractClientIp(req: Request): string {
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    const ips = (Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor).split(',');
    if (ips.length > 0 && ips[0].trim()) {
      return normalizeIp(ips[0]);
    }
  }
  const xRealIp = req.headers['x-real-ip'];
  if (xRealIp) {
    const realIpStr = Array.isArray(xRealIp) ? xRealIp[0] : xRealIp;
    if (realIpStr && realIpStr.trim()) {
      return normalizeIp(realIpStr);
    }
  }
  return normalizeIp(req.socket?.remoteAddress);
}

/**
 * Converts an IPv4 string to an unsigned 32-bit integer.
 */
function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
    return null;
  }
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

/**
 * Checks if a client IP matches a single IP or CIDR block (IPv4 & IPv6).
 */
export function ipMatchesCidr(clientIp: string, cidrOrIp: string): boolean {
  const normalizedClient = normalizeIp(clientIp);
  const normalizedTarget = normalizeIp(cidrOrIp);

  // Wildcard match
  if (cidrOrIp === '*' || cidrOrIp === '0.0.0.0/0' || cidrOrIp === '::/0') return true;

  // Exact string match
  if (normalizedClient === normalizedTarget) return true;

  // Handle CIDR notation (e.g. 192.168.1.0/24 or 2001:db8::/32)
  if (cidrOrIp.includes('/')) {
    const [rangeIp, prefixStr] = cidrOrIp.split('/');
    const prefixLen = parseInt(prefixStr, 10);
    const normRangeIp = normalizeIp(rangeIp);

    // IPv4 CIDR matching
    const clientNum = ipv4ToInt(normalizedClient);
    const rangeNum = ipv4ToInt(normRangeIp);

    if (clientNum !== null && rangeNum !== null && !isNaN(prefixLen) && prefixLen >= 0 && prefixLen <= 32) {
      if (prefixLen === 0) return true;
      const mask = prefixLen === 32 ? 0xFFFFFFFF : (~((1 << (32 - prefixLen)) - 1)) >>> 0;
      return (clientNum & mask) === (rangeNum & mask);
    }

    // IPv6 CIDR prefix matching fallback
    if (normalizedClient.includes(':') && normRangeIp.includes(':')) {
      const clientParts = normalizedClient.split(':');
      const rangeParts = normRangeIp.split(':');
      const blocksToCompare = Math.min(Math.max(1, Math.floor(prefixLen / 16)), clientParts.length, rangeParts.length);
      for (let i = 0; i < blocksToCompare; i++) {
        if (clientParts[i] !== rangeParts[i]) return false;
      }
      return true;
    }
  }

  return false;
}

/**
 * Validates if client IP matches any allowed CIDR in the list.
 */
export function isIpAllowed(clientIp: string, allowedCidrs: string[]): boolean {
  if (!allowedCidrs || allowedCidrs.length === 0) return false;
  return allowedCidrs.some(cidr => ipMatchesCidr(clientIp, cidr));
}
