import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { extractClientIp, isIpAllowed } from '../utils/networkSecurityUtils';

/**
 * Audit logs network access attempts (allowed or denied).
 */
function logNetworkAudit(req: Request, clientIp: string, allowed: boolean, context: string) {
  if (!config.networkSecurity.logBlockedAttempts && allowed) return;
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl || req.url;
  const userAgent = req.headers['user-agent'] || 'unknown';

  if (!allowed) {
    console.warn(
      `[NETWORK-SECURITY-DENIED] timestamp=${timestamp} ip=${clientIp} method=${method} url=${url} context=${context} userAgent="${userAgent}"`
    );
  } else {
    console.log(
      `[NETWORK-SECURITY-ALLOWED] timestamp=${timestamp} ip=${clientIp} method=${method} url=${url} context=${context}`
    );
  }
}

/**
 * Global Network Whitelisting Middleware (Fail-Closed).
 * Enforces network access restrictions across all API endpoints if enabled.
 */
export function globalNetworkSecurityMiddleware(req: Request, res: Response, next: NextFunction) {
  // If global whitelist is disabled, skip global check
  if (!config.networkSecurity.enabled) {
    return next();
  }

  const clientIp = extractClientIp(req);
  const allowed = isIpAllowed(clientIp, config.networkSecurity.allowedCidrs);

  logNetworkAudit(req, clientIp, allowed, 'GlobalWhitelist');

  if (!allowed) {
    return res.status(403).json({
      success: false,
      error: 'Access Denied: Unapproved Network',
      message: 'Your IP address or network context is not authorized to access GamerZ Hub.',
      clientIp,
      timestamp: new Date().toISOString(),
    });
  }

  next();
}

/**
 * Admin Endpoint Network Security Middleware (Fail-Closed).
 * Strictly restricts access to administrative endpoints (/api/admin/*) to trusted CIDRs.
 */
export function adminNetworkSecurityMiddleware(req: Request, res: Response, next: NextFunction) {
  const isEnabled = config.networkSecurity.adminWhitelistOnly || config.networkSecurity.enabled;

  if (!isEnabled) {
    return next();
  }

  const clientIp = extractClientIp(req);
  const allowed = isIpAllowed(clientIp, config.networkSecurity.adminAllowedCidrs);

  logNetworkAudit(req, clientIp, allowed, 'AdminWhitelist');

  if (!allowed) {
    return res.status(403).json({
      success: false,
      error: 'Access Denied: Admin Network Restriction',
      message: 'Access to GamerZ Hub administrative endpoints requires an authorized network connection.',
      clientIp,
      timestamp: new Date().toISOString(),
    });
  }

  next();
}
