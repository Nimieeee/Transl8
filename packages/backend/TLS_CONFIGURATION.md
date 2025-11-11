# TLS 1.3 Configuration Guide

This document provides instructions for configuring TLS 1.3 for the AI Video Dubbing Platform API.

## Overview

TLS (Transport Layer Security) 1.3 is the latest version of the TLS protocol, providing enhanced security and performance. All API endpoints must be served over HTTPS with TLS 1.3 to ensure data encryption in transit.

## Production Deployment Options

### Option 1: Reverse Proxy (Recommended)

Use a reverse proxy like Nginx or a cloud load balancer to handle TLS termination.

#### Nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name api.example.com;

    # TLS 1.3 Configuration
    ssl_protocols TLSv1.3;
    ssl_prefer_server_ciphers off;
    
    # Certificate and Key
    ssl_certificate /etc/ssl/certs/api.example.com.crt;
    ssl_certificate_key /etc/ssl/private/api.example.com.key;
    
    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/ssl/certs/ca-bundle.crt;
    
    # Session Configuration
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    
    # HSTS (HTTP Strict Transport Security)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    
    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Proxy to Node.js backend
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # WebSocket support
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name api.example.com;
    return 301 https://$server_name$request_uri;
}
```

#### Apache Configuration

```apache
<VirtualHost *:443>
    ServerName api.example.com
    
    # TLS 1.3 Configuration
    SSLEngine on
    SSLProtocol -all +TLSv1.3
    SSLHonorCipherOrder off
    
    # Certificate and Key
    SSLCertificateFile /etc/ssl/certs/api.example.com.crt
    SSLCertificateKeyFile /etc/ssl/private/api.example.com.key
    SSLCertificateChainFile /etc/ssl/certs/ca-bundle.crt
    
    # OCSP Stapling
    SSLUseStapling on
    SSLStaplingCache "shmcb:logs/ssl_stapling(32768)"
    
    # HSTS
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    
    # Security Headers
    Header always set X-Frame-Options "DENY"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    
    # Proxy to Node.js backend
    ProxyPreserveHost On
    ProxyPass / http://localhost:3001/
    ProxyPassReverse / http://localhost:3001/
    
    # WebSocket support
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} =websocket [NC]
    RewriteRule /(.*)           ws://localhost:3001/$1 [P,L]
</VirtualHost>

# Redirect HTTP to HTTPS
<VirtualHost *:80>
    ServerName api.example.com
    Redirect permanent / https://api.example.com/
</VirtualHost>
```

### Option 2: Cloud Load Balancer

#### AWS Application Load Balancer (ALB)

1. Create an ALB in the AWS Console
2. Configure HTTPS listener on port 443
3. Select TLS 1.3 security policy: `ELBSecurityPolicy-TLS13-1-2-2021-06`
4. Upload or import SSL certificate from ACM
5. Configure target group pointing to EC2 instances running the Node.js backend
6. Enable access logs and connection logs

#### Google Cloud Load Balancer

1. Create an HTTPS load balancer in GCP Console
2. Configure SSL certificate (managed or self-managed)
3. Set minimum TLS version to 1.3 in SSL policy
4. Configure backend service pointing to instance groups
5. Enable Cloud CDN and Cloud Armor for additional security

#### Azure Application Gateway

1. Create an Application Gateway in Azure Portal
2. Configure HTTPS listener with SSL certificate
3. Set minimum TLS version to 1.3 in SSL policy
4. Configure backend pool with VM instances
5. Enable Web Application Firewall (WAF)

### Option 3: Node.js Native HTTPS (Development/Testing Only)

For development or testing purposes, you can enable HTTPS directly in Node.js:

```typescript
// packages/backend/src/index.ts
import https from 'https';
import fs from 'fs';

const httpsOptions = {
  key: fs.readFileSync('./certs/server.key'),
  cert: fs.readFileSync('./certs/server.crt'),
  minVersion: 'TLSv1.3' as const,
  maxVersion: 'TLSv1.3' as const,
};

const server = https.createServer(httpsOptions, app);

server.listen(PORT, () => {
  console.log(`HTTPS server running on port ${PORT}`);
});
```

**Note:** This approach is NOT recommended for production as it lacks advanced features like load balancing, auto-scaling, and DDoS protection.

## Certificate Management

### Let's Encrypt (Free SSL Certificates)

Use Certbot to obtain free SSL certificates from Let's Encrypt:

```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate for Nginx
sudo certbot --nginx -d api.example.com

# Obtain certificate for Apache
sudo certbot --apache -d api.example.com

# Auto-renewal (runs twice daily)
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### AWS Certificate Manager (ACM)

For AWS deployments:

1. Request a public certificate in ACM
2. Validate domain ownership via DNS or email
3. Attach certificate to ALB or CloudFront distribution
4. ACM handles automatic renewal

### Custom Certificate Authority

For enterprise deployments with internal CA:

1. Generate Certificate Signing Request (CSR)
2. Submit CSR to internal CA
3. Install signed certificate on load balancer or reverse proxy
4. Configure certificate chain and intermediate certificates

## Verification

### Test TLS Configuration

Use SSL Labs to test your TLS configuration:

```bash
# Online test
https://www.ssllabs.com/ssltest/analyze.html?d=api.example.com

# Command-line test with OpenSSL
openssl s_client -connect api.example.com:443 -tls1_3

# Test with curl
curl -v --tlsv1.3 https://api.example.com/health
```

### Expected Results

- TLS version: 1.3
- Certificate valid and trusted
- No SSL/TLS vulnerabilities
- HSTS header present
- Security headers configured
- A+ rating on SSL Labs

## Environment Variables

Add the following to `.env` for production:

```bash
# TLS Configuration
NODE_ENV=production
FORCE_HTTPS=true
TRUST_PROXY=true

# CORS Configuration
ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com

# Security
HSTS_MAX_AGE=31536000
```

## Docker Configuration

When running behind a reverse proxy in Docker:

```yaml
# docker-compose.yml
services:
  backend:
    environment:
      - NODE_ENV=production
      - TRUST_PROXY=true
    networks:
      - internal
  
  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/ssl/certs
    networks:
      - internal
    depends_on:
      - backend

networks:
  internal:
    driver: bridge
```

## Kubernetes Configuration

For Kubernetes deployments, use an Ingress controller:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-protocols: "TLSv1.3"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - api.example.com
    secretName: api-tls-secret
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: backend-service
            port:
              number: 3001
```

## Monitoring and Alerts

Set up monitoring for:

- Certificate expiration (alert 30 days before)
- TLS handshake failures
- Protocol downgrade attempts
- Invalid certificate errors

Use tools like:
- Prometheus + Grafana
- AWS CloudWatch
- DataDog
- New Relic

## Compliance

This TLS 1.3 configuration helps meet compliance requirements for:

- PCI DSS 4.0
- HIPAA
- SOC 2
- GDPR
- ISO 27001

## Troubleshooting

### Common Issues

1. **Certificate not trusted**: Ensure certificate chain is complete
2. **TLS 1.3 not available**: Update OpenSSL to version 1.1.1 or higher
3. **WebSocket connection fails**: Configure proxy to support WebSocket upgrade
4. **Mixed content warnings**: Ensure all resources are loaded over HTTPS

### Debug Commands

```bash
# Check OpenSSL version
openssl version

# Test TLS 1.3 connection
openssl s_client -connect api.example.com:443 -tls1_3 -showcerts

# Check certificate expiration
openssl s_client -connect api.example.com:443 | openssl x509 -noout -dates

# Test cipher suites
nmap --script ssl-enum-ciphers -p 443 api.example.com
```

## References

- [TLS 1.3 RFC 8446](https://tools.ietf.org/html/rfc8446)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [OWASP TLS Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Protection_Cheat_Sheet.html)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
