# Financial AI App - Production Ready Multi-Tenant SaaS

A comprehensive financial management application with AI-powered transaction analysis, multi-tenant architecture, and complete accounting functionality.

## 🚀 Production Features

### ✅ **Multi-Tenant SaaS Architecture**
- **Complete tenant isolation** - Each company's data is fully separated
- **Row-level security** - Database queries filtered by company_id
- **Clean slate onboarding** - New users start with empty workspace
- **Scalable tenant management** - Ready for thousands of companies

### ✅ **Core Financial Features**
- **Chart of Accounts Management** - GAAP-compliant account structure
- **Transaction Processing** - Double-entry bookkeeping validation
- **Customer/Vendor Management** - Complete contact management
- **Invoice & Bill Processing** - Professional invoicing system
- **Payment Tracking** - Payment reconciliation and tracking
- **OCR Document Processing** - AI-powered receipt/invoice extraction

### ✅ **AI-Powered Features**
- **Transaction Analysis** - Multi-provider AI support (OpenAI, Anthropic, Ollama)
- **Smart Categorization** - Automatic account code suggestions
- **OCR Processing** - Extract data from receipts and invoices
- **Tax Agent Integration** - AI-powered tax assistance

## 🏗️ Architecture

### **Backend (Node.js/Express)**
```
backend/
├── server.js                 # Main server with multi-tenant middleware
├── src/
│   ├── middleware/
│   │   ├── auth.ts           # Authentication middleware
│   │   └── tenant.js         # Tenant isolation middleware
│   ├── controllers/          # Business logic controllers
│   ├── routes/              # API route definitions
│   ├── services/            # Business services
│   └── utils/               # Utility functions
├── database/
│   ├── migrations/          # Database schema migrations
│   └── seeds/              # Initial data seeds
└── package.json
```

### **Frontend (Next.js/React)**
```
frontend/
├── src/
│   ├── pages/              # Application pages
│   ├── components/         # Reusable UI components
│   ├── contexts/           # React contexts (Auth, etc.)
│   ├── hooks/              # Custom React hooks
│   └── utils/              # Frontend utilities
├── public/                 # Static assets
└── package.json
```

## 🚀 Quick Start

### **Prerequisites**
- Node.js 18+ 
- npm or yarn
- SQLite (included)

### **Installation**

1. **Clone the repository**
```bash
git clone https://github.com/jasonjoplin/Financial-App.git
cd Financial-App
```

2. **Backend Setup**
```bash
cd backend
npm install
```

3. **Database Setup**
```bash
# Create database and run migrations
npm run db:migrate
npm run db:seed
```

4. **Environment Configuration**
```bash
# Create .env file
cp .env.example .env

# Configure environment variables
JWT_SECRET=your-super-secret-jwt-key
CORS_ORIGIN=http://localhost:3000
PORT=3001
```

5. **Start Backend Server**
```bash
npm start
# Server runs on http://localhost:3001
```

6. **Frontend Setup**
```bash
cd ../frontend
npm install
npm run dev
# Frontend runs on http://localhost:3000
```

## 🔐 Authentication & Multi-Tenancy

### **User Registration**
- Each user gets their own company workspace
- Automatic user-company linking
- JWT tokens include tenant context
- Complete data isolation

### **API Authentication**
```javascript
// All API requests require authentication
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

### **Tenant Isolation**
- Tenant middleware extracts company context from JWT
- All database queries automatically filtered by company_id
- Row-level security implementation
- Zero cross-tenant data leakage

## 📊 API Endpoints

### **Authentication**
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login

### **Accounts**
- `GET /api/v1/accounts/chart` - Get chart of accounts
- `POST /api/v1/accounts` - Create new account
- `PUT /api/v1/accounts/:code` - Update account
- `DELETE /api/v1/accounts/:code` - Delete account

### **Business Operations**
- `GET /api/v1/transactions` - Get transactions
- `GET /api/v1/contacts` - Get customers/vendors
- `GET /api/v1/invoices` - Get invoices/bills
- `GET /api/v1/payments` - Get payments
- `GET /api/v1/documents` - Get OCR documents

### **AI Features**
- `POST /api/v1/ai/analyze` - AI transaction analysis
- `GET /api/v1/ai/providers` - AI provider status
- `POST /api/v1/ai/providers/:provider/test` - Test AI provider

## 🛡️ Security Features

### **Authentication & Authorization**
- JWT-based authentication
- Secure password hashing (bcrypt)
- Role-based access control
- Session management

### **Data Protection**
- SQL injection prevention
- XSS protection (Helmet.js)
- Rate limiting
- Input validation
- CORS configuration

### **Multi-Tenant Security**
- Tenant context validation
- Database query filtering
- Isolated user workspaces
- Secure token management

## 🎯 Production Deployment

### **Environment Variables**
```bash
NODE_ENV=production
JWT_SECRET=production-secret-key
DATABASE_URL=production-database-url
CORS_ORIGIN=https://your-domain.com
```

### **Docker Deployment**
```bash
# Build and run with Docker
docker-compose up -d
```

### **Database Migration**
```bash
# Production database setup
npm run db:migrate
```

## 🧪 Testing

### **Run Tests**
```bash
# Backend tests
cd backend
npm test

# Frontend tests  
cd frontend
npm test
```

### **Test User Credentials**
For development/testing:
- Email: `test@example.com`
- Password: `password123`

## 📈 Features Roadmap

### **Current Version (v2.0)**
- ✅ Multi-tenant architecture
- ✅ Complete accounting functionality
- ✅ AI transaction analysis
- ✅ OCR document processing
- ✅ Payment reconciliation

### **Upcoming Features**
- 📊 Advanced reporting & analytics
- 🔄 Real-time bank sync
- 📱 Mobile application
- 🌍 Multi-currency support
- 📧 Automated invoicing
- 🔍 Advanced search & filtering

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/jasonjoplin/Financial-App/issues)
- **Documentation**: [Wiki](https://github.com/jasonjoplin/Financial-App/wiki)
- **Email**: jasonjoplin2016@gmail.com

## 🎉 Acknowledgments

- Built with modern React/Node.js stack
- AI powered by OpenAI, Anthropic, and Ollama
- UI components by Material-UI
- Database migrations by Knex.js

---

**🚀 Ready for production deployment with enterprise-grade multi-tenancy!**