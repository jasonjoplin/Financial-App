# Production Deployment Guide

## Overview

This guide covers deploying the Financial AI App to production with enterprise-grade multi-tenancy, security, and scalability.

## Pre-Deployment Checklist

### ✅ Security Requirements
- [ ] Generate strong JWT secret (256+ bits)
- [ ] Configure HTTPS certificates
- [ ] Set up firewall rules
- [ ] Configure database encryption
- [ ] Enable audit logging
- [ ] Set secure CORS origins

### ✅ Infrastructure Requirements
- [ ] Node.js 18+ production server
- [ ] PostgreSQL/MySQL database (SQLite for development only)
- [ ] Redis for session/cache management
- [ ] Load balancer (for multi-instance deployment)
- [ ] SSL/TLS certificates
- [ ] Monitoring tools (optional but recommended)

### ✅ Environment Configuration
- [ ] Production environment variables
- [ ] Database connection strings
- [ ] AI provider API keys
- [ ] Email service configuration
- [ ] File upload storage configuration

## Environment Setup

### 1. Production Environment Variables

Create `.env.production`:

```bash
# Application Configuration
NODE_ENV=production
PORT=3001

# Security
JWT_SECRET=your-super-secure-256-bit-secret-key-here
CORS_ORIGIN=https://your-domain.com

# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database
# or for MySQL:
# DATABASE_URL=mysql://username:password@host:port/database

# AI Provider Configuration (Optional)
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
OLLAMA_BASE_URL=http://localhost:11434

# Email Configuration (Future feature)
EMAIL_SERVICE=sendgrid
EMAIL_API_KEY=your-email-api-key
FROM_EMAIL=noreply@your-domain.com

# File Upload Configuration (Future feature)
STORAGE_TYPE=s3
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_BUCKET_NAME=your-s3-bucket
AWS_REGION=us-east-1

# Monitoring (Optional)
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=info
```

### 2. Database Migration

#### PostgreSQL Setup (Recommended for Production)

```bash
# Install PostgreSQL client
npm install pg

# Update knexfile.js for PostgreSQL
module.exports = {
  production: {
    client: 'postgresql',
    connection: process.env.DATABASE_URL,
    migrations: {
      directory: './database/migrations'
    },
    seeds: {
      directory: './database/seeds/production'
    }
  }
};

# Run migrations
NODE_ENV=production npx knex migrate:latest

# No seeds for production (clean slate)
```

#### MySQL Setup (Alternative)

```bash
# Install MySQL client
npm install mysql2

# Update knexfile.js for MySQL
module.exports = {
  production: {
    client: 'mysql2',
    connection: process.env.DATABASE_URL,
    migrations: {
      directory: './database/migrations'
    }
  }
};
```

## Deployment Methods

### Method 1: Traditional Server Deployment

#### 1. Server Setup
```bash
# Clone repository
git clone https://github.com/jasonjoplin/Financial-App.git
cd Financial-App

# Install dependencies
cd backend && npm install --production
cd ../frontend && npm install --production
```

#### 2. Build Frontend
```bash
cd frontend
npm run build
# Serve built files with nginx or serve them from Express
```

#### 3. Process Management with PM2
```bash
# Install PM2 globally
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'financial-ai-backend',
    script: 'server.js',
    cwd: './backend',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    instances: 'max',
    exec_mode: 'cluster',
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log'
  }]
};
EOF

# Start application
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

#### 4. Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;

    # Frontend
    location / {
        root /path/to/frontend/build;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
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

    # Health check
    location /health {
        proxy_pass http://localhost:3001;
    }
}
```

### Method 2: Docker Deployment

#### 1. Create Dockerfiles

**Backend Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodeuser -u 1001
USER nodeuser

EXPOSE 3001

CMD ["npm", "start"]
```

**Frontend Dockerfile:**
```dockerfile
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### 2. Docker Compose for Production

```yaml
version: '3.8'

services:
  database:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: financial_ai
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped

  backend:
    build: ./backend
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD}@database:5432/financial_ai
      JWT_SECRET: ${JWT_SECRET}
      CORS_ORIGIN: https://your-domain.com
    depends_on:
      - database
      - redis
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
```

### Method 3: Cloud Platform Deployment

#### Heroku Deployment
```bash
# Install Heroku CLI
# Create Heroku apps
heroku create financial-ai-backend
heroku create financial-ai-frontend

# Add PostgreSQL
heroku addons:create heroku-postgresql:hobby-dev --app financial-ai-backend

# Set environment variables
heroku config:set JWT_SECRET=your-secret --app financial-ai-backend
heroku config:set NODE_ENV=production --app financial-ai-backend

# Deploy
git subtree push --prefix=backend heroku main
```

#### Vercel/Netlify (Frontend only)
```bash
# Frontend deployment to Vercel
cd frontend
vercel --prod

# Set environment variables in Vercel dashboard
NEXT_PUBLIC_API_URL=https://your-backend-domain.com
```

## Production Security Configuration

### 1. SSL/TLS Setup
```bash
# Using Let's Encrypt with Certbot
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 2. Firewall Configuration
```bash
# UFW firewall setup
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 3. Database Security
```sql
-- Create dedicated database user
CREATE USER financial_ai_app WITH PASSWORD 'secure-password';
GRANT CONNECT ON DATABASE financial_ai TO financial_ai_app;
GRANT USAGE ON SCHEMA public TO financial_ai_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO financial_ai_app;
```

## Monitoring and Maintenance

### 1. Health Monitoring
```bash
# Set up health check endpoints
curl https://your-domain.com/health

# Monitor with external services
# - UptimeRobot
# - Pingdom
# - New Relic
```

### 2. Log Management
```bash
# PM2 log rotation
pm2 install pm2-logrotate

# Centralized logging (optional)
# - ELK Stack
# - Splunk
# - CloudWatch
```

### 3. Database Backups
```bash
# Automated PostgreSQL backups
cat > backup-script.sh << EOF
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > backup_$DATE.sql
aws s3 cp backup_$DATE.sql s3://your-backup-bucket/
EOF

# Schedule with cron
crontab -e
# Add: 0 2 * * * /path/to/backup-script.sh
```

## Performance Optimization

### 1. Database Optimization
```sql
-- Add indexes for tenant isolation
CREATE INDEX idx_accounts_company_id ON accounts(company_id);
CREATE INDEX idx_transactions_company_id ON transactions(company_id);
CREATE INDEX idx_users_email ON users(email);
```

### 2. Caching Strategy
```javascript
// Redis caching for frequently accessed data
const redis = require('redis');
const client = redis.createClient(process.env.REDIS_URL);

// Cache chart of accounts per tenant
const cacheKey = `chart_of_accounts:${companyId}`;
```

### 3. Load Balancing
```nginx
upstream backend {
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
}
```

## Scaling Considerations

### Horizontal Scaling
- Multiple backend instances behind load balancer
- Database read replicas for query performance
- CDN for static asset delivery
- Microservices architecture for future growth

### Vertical Scaling
- Increase server resources (CPU, RAM)
- Database performance tuning
- Optimize database queries
- Code profiling and optimization

## Troubleshooting Common Issues

### Database Connection Issues
```bash
# Check database connectivity
npm run db:test-connection

# Check environment variables
echo $DATABASE_URL
```

### Authentication Problems
```bash
# Verify JWT secret
echo $JWT_SECRET | wc -c  # Should be 32+ characters

# Check token generation
curl -X POST https://your-domain.com/api/v1/auth/login
```

### CORS Issues
```bash
# Verify CORS configuration
echo $CORS_ORIGIN

# Test from different origins
curl -H "Origin: https://unauthorized-domain.com" https://your-api.com/health
```

## Maintenance Schedule

### Daily
- [ ] Monitor system health
- [ ] Check error logs
- [ ] Verify backup completion

### Weekly
- [ ] Review performance metrics
- [ ] Update dependencies (if needed)
- [ ] Security scan

### Monthly
- [ ] Update SSL certificates (if not automated)
- [ ] Database maintenance
- [ ] Security audit
- [ ] Capacity planning review

---

**🚀 Your Financial AI App is now ready for production with enterprise-grade multi-tenancy!**