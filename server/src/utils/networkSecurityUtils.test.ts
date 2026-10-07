import { ipMatchesCidr, isIpAllowed, normalizeIp, extractClientIp } from './networkSecurityUtils';

describe('Network Security Utilities', () => {
  describe('normalizeIp', () => {
    it('should normalize standard IPv4 addresses', () => {
      expect(normalizeIp('198.51.100.45')).toBe('198.51.100.45');
    });

    it('should strip ::ffff: prefix from IPv4-mapped IPv6 addresses', () => {
      expect(normalizeIp('::ffff:198.51.100.45')).toBe('198.51.100.45');
      expect(normalizeIp('::ffff:127.0.0.1')).toBe('127.0.0.1');
    });

    it('should handle empty or undefined IPs', () => {
      expect(normalizeIp(undefined)).toBe('127.0.0.1');
      expect(normalizeIp('')).toBe('127.0.0.1');
    });
  });

  describe('ipMatchesCidr', () => {
    it('should match exact IPs', () => {
      expect(ipMatchesCidr('203.0.113.5', '203.0.113.5')).toBe(true);
      expect(ipMatchesCidr('203.0.113.5', '203.0.113.6')).toBe(false);
    });

    it('should match wildcard CIDRs', () => {
      expect(ipMatchesCidr('198.51.100.10', '*')).toBe(true);
      expect(ipMatchesCidr('198.51.100.10', '0.0.0.0/0')).toBe(true);
      expect(ipMatchesCidr('2001:db8::1', '::/0')).toBe(true);
    });

    it('should match IPv4 CIDR ranges correctly', () => {
      const cidr = '198.51.100.0/24';
      expect(ipMatchesCidr('198.51.100.1', cidr)).toBe(true);
      expect(ipMatchesCidr('198.51.100.254', cidr)).toBe(true);
      expect(ipMatchesCidr('198.51.101.1', cidr)).toBe(false);
      expect(ipMatchesCidr('10.0.0.1', cidr)).toBe(false);
    });

    it('should match IPv6 CIDR ranges correctly', () => {
      const cidr = '2001:db8::/32';
      expect(ipMatchesCidr('2001:db8:85a3::8a2e:370:7334', cidr)).toBe(true);
      expect(ipMatchesCidr('2001:dc9::1', cidr)).toBe(false);
    });
  });

  describe('isIpAllowed', () => {
    const whitelist = ['198.51.100.0/24', '203.0.113.5', '::1/128'];

    it('should allow IPs within the whitelist', () => {
      expect(isIpAllowed('198.51.100.45', whitelist)).toBe(true);
      expect(isIpAllowed('203.0.113.5', whitelist)).toBe(true);
      expect(isIpAllowed('::1', whitelist)).toBe(true);
    });

    it('should deny IPs outside the whitelist', () => {
      expect(isIpAllowed('1.1.1.1', whitelist)).toBe(false);
      expect(isIpAllowed('203.0.113.6', whitelist)).toBe(false);
    });
  });

  describe('extractClientIp', () => {
    it('should extract client IP from X-Forwarded-For header', () => {
      const req: any = {
        headers: { 'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178' },
        socket: { remoteAddress: '127.0.0.1' },
      };
      expect(extractClientIp(req)).toBe('203.0.113.195');
    });

    it('should fall back to socket.remoteAddress if headers absent', () => {
      const req: any = {
        headers: {},
        socket: { remoteAddress: '::ffff:192.168.1.10' },
      };
      expect(extractClientIp(req)).toBe('192.168.1.10');
    });
  });
});
