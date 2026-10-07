# GamerZ Hub — Network Access Control & Whitelisting Architecture

## 1. Threat Model & Security Goals

### Threat Landscape
- **Unauthorized External Access**: Attackers on the public internet attempting credential stuffing, brute force, or exploits against exposed endpoints.
- **Insider & Compromised Credential Threat**: Compromised user/admin accounts used from unapproved, non-corporate, or malicious network locations.
- **Man-In-The-Middle & Misrouted Traffic**: Traffic originating outside authorized corporate subnets or unverified proxies.

### Assets to Protect
- GamerZ Hub Core Web Application (`web/`)
- Backend REST APIs & WebSockets (`server/src/index.ts`)
- Sensitive Administrative & Data Endpoints (`/api/admin/*`)
- PostgreSQL Database & Redis Cache layers

### Defense-in-Depth Goals
1. **Network Whitelisting**: Restrict app and administrative access strictly to pre-approved corporate VPN subnets, static IP ranges, or client TLS certificate holders.
2. **Fail-Closed Default**: In case of network check failure or missing credentials, default to HTTP 403 Access Denied.
3. **Auditability**: Log all allowed and blocked network attempts with client source IP, timestamp, method, URI, and user agent.
4. **Zero Trust Ready**: Seamlessly interface with managed Zero Trust Network Access (ZTNA) solutions like Cloudflare Access, AWS WAF, and Azure AD Conditional Access.

---

## 2. Layered Architecture Overview

```
[ Client Request ]
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│ 1. Edge Firewall / Cloud WAF (Cloudflare / AWS WAF)     │
│    - Block untrusted CIDRs at edge                      │
│    - Enforce mTLS / Access policies                     │
└─────────────────────────────────────────────────────────┘
       │ (Allowed)
       ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Reverse Proxy (NGINX / ALB Security Group)          │
│    - Layer 4/7 IP Allow/Deny filtering                  │
│    - Client Certificate TLS verification                │
└─────────────────────────────────────────────────────────┘
       │ (Allowed)
       ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Express App Middleware (Node.js)                     │
│    - `globalNetworkSecurityMiddleware`                  │
│    - `adminNetworkSecurityMiddleware`                   │
│    - Audit Logging & Header Sanitization                │
└─────────────────────────────────────────────────────────┘
       │ (Allowed)
       ▼
[ GamerZ Hub Services & Postgres DB ]
```

---

## 3. Configuration & Environment Variables

The server reads network security settings from `server/src/config/index.ts`:

| Environment Variable | Description | Default / Example |
|---|---|---|
| `NETWORK_WHITELIST_ENABLED` | Enables global IP whitelisting across all routes | `false` (dev) / `true` (prod) |
| `ALLOWED_IP_CIDRS` | Comma-separated list of allowed IP CIDRs | `127.0.0.1/32,::1/128,198.51.100.0/24` |
| `ADMIN_NETWORK_WHITELIST_ONLY` | Restricts `/api/admin/*` to admin CIDRs | `true` |
| `ADMIN_ALLOWED_IP_CIDRS` | Allowed CIDRs specifically for `/api/admin` | `203.0.113.0/24,127.0.0.1/32` |
| `LOG_BLOCKED_NETWORK_ATTEMPTS` | Enable audit logging for network security events | `true` |

---

## 4. Reverse Proxy & Infrastructure Setup Examples

### NGINX Configuration (`/etc/nginx/sites-available/gamerzhub`)

```nginx
server {
    listen 443 ssl http2;
    server_name gamerzhub-api.onrender.com api.gamerzhub.com;

    ssl_certificate /etc/ssl/certs/gamerzhub.crt;
    ssl_certificate_key /etc/ssl/private/gamerzhub.key;

    # Enforce Client TLS Certificates (mTLS)
    ssl_client_certificate /etc/ssl/certs/corporate_ca.crt;
    ssl_verify_client optional_no_ca; # or 'on' for strict mTLS

    # Pass client certificate verification status to Express
    proxy_set_header X-Client-Cert-Verified $ssl_client_verify;
    proxy_set_header X-Client-Cert-DN $ssl_client_s_dn;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Host $host;

    location / {
        # Allow Corporate Subnet
        allow 198.51.100.0/24;
        # Allow Corporate VPN Exit IP
        allow 203.0.113.5;
        # Allow IPv6 Office Subnet
        allow 2001:db8::/32;
        # Deny all unapproved networks
        deny all;

        proxy_pass http://127.0.0.1:4000;
    }

    location /api/admin/ {
        # Stricter IP restriction for Administrative API
        allow 198.51.100.10/32;
        deny all;

        proxy_pass http://127.0.0.1:4000;
    }
}
```

### AWS ALB + WAF Integration
1. **Security Group**: Set ALB Ingress rule to allow TCP 443 only from corporate public CIDRs (`198.51.100.0/24`).
2. **AWS WAF Web ACL**:
   - Create an **IPSet** (`GamerZHub-Corporate-IPs`).
   - Create a Rule: **BlockAllExceptCorporate** (Default Action: Block, Rule: Allow if IP in `GamerZHub-Corporate-IPs`).
3. **AWS Shield**: Default DDoS protection active at edge.

### Cloudflare Access Setup
- **Application Domain**: `*.gamerzhub.com`
- **Access Policy**:
  - `Action`: **Allow**
  - `Include`: `Email Domain = @gamerzhub.com`
  - `Require`: `Client Certificate = Valid Corporate Cert`
  - `Require`: `IP Range = 198.51.100.0/24`

---

## 5. Team Task Breakdown (Person 1 – Person 6)

| Person | Role | Assigned Security Tasks |
|---|---|---|
| **Person 1** | Frontend Developer | - Update UI to display user-friendly `403 Access Denied: Unapproved Network` notification.<br>- Handle client cert browser prompts gracefully.<br>- Add redirect flow to corporate VPN login instructions when blocked. |
| **Person 2** | Backend Developer | - Maintain `server/src/middleware/networkSecurity.ts` and `networkSecurityUtils.ts`.<br>- Expand unit tests for IPv4/IPv6 CIDR matching.<br>- Connect network audit loggers to centralized SIEM / CloudWatch. |
| **Person 3** | Product / UX | - Map out endpoint classification (public vs network-restricted vs admin-restricted).<br>- Define fallback UX for remote employees on dynamic IPs.<br>- Coordinate QA testing for network fail-closed edge cases. |
| **Person 4** | Marketing / Community | - Communicate network access changes to internal staff and alpha/beta partners.<br>- Publish corporate VPN setup guides for employees.<br>- Coordinate access windows for external tournaments. |
| **Person 5** | BizDev / Partnerships | - Collect and verify static IP CIDRs for enterprise partners.<br>- Manage issuance and lifecycle of client TLS certificates for external B2B partners. |
| **Person 6** | DevOps / Infrastructure | - Configure AWS ALB Security Groups and AWS WAF IPSets.<br>- Maintain NGINX reverse proxy allow/deny rules.<br>- Monitor network block rates and configure CloudWatch/SIEM alarms. |

---

## 6. Testing & Verification

Run the network security utility unit tests:
```bash
npm test -- server/src/utils/networkSecurityUtils.test.ts
```

### Manual Verification Checklist
- [x] **Allowed IP Access**: Requests originating from whitelisted CIDRs receive `HTTP 200 OK`.
- [x] **Blocked IP Access**: Requests originating outside whitelisted CIDRs receive `HTTP 403 Forbidden` with JSON audit detail.
- [x] **Admin Restriction**: `/api/admin/*` endpoints strictly reject requests not in `ADMIN_ALLOWED_IP_CIDRS`.
- [x] **Audit Logging**: Verified console logs contain `[NETWORK-SECURITY-DENIED]` entries with source IP and URI.
- [x] **Header Spoofing Protection**: `X-Forwarded-For` correctly resolved via trusted proxy configuration (`trust proxy = 1`).
