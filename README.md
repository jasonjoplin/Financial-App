# Financial AI App

A comprehensive AI-powered accounting and financial management application built with Next.js, Node.js, and multiple AI providers (OpenAI, Anthropic Claude, and Ollama).

## Features

🤖 **AI-Powered Analysis**
- Intelligent transaction categorization and journal entry suggestions
- Multi-provider AI support (OpenAI GPT-4, Anthropic Claude, Local Ollama)
- Smart expense recognition and GAAP-compliant accounting entries

💼 **Complete Accounting System**
- Full Chart of Accounts management
- Double-entry bookkeeping with automatic balance validation
- Journal entries and transaction management
- Invoice and bill creation with line-item support

📊 **Financial Reporting**
- Real-time Profit & Loss statements
- Balance Sheet with automatic balance validation
- Trial Balance reports
- GAAP-compliant financial statements

💳 **Payment & Banking**
- Payment tracking and reconciliation
- AI-powered bank transaction matching
- Multiple payment method support
- Bank import functionality

📄 **Document Processing**
- OCR document processing for receipts and invoices
- AI-powered data extraction from financial documents
- Document review and approval workflow

🔍 **Advanced Features**
- Global search with keyboard shortcuts (⌘K)
- Advanced filtering and saved filter presets
- Contact and vendor management
- Comprehensive testing and validation tools

## Tech Stack

### Frontend
- **Next.js 13** with TypeScript
- **Material-UI (MUI)** for components
- **React Context** for state management
- **React Hot Toast** for notifications

### Backend
- **Node.js** with Express
- **SQLite** database
- **JWT** authentication with bcrypt
- **CORS** enabled for cross-origin requests

### AI Integration
- **OpenAI GPT-4** for advanced reasoning
- **Anthropic Claude** for detailed analysis
- **Ollama** for local AI models (DeepSeek R1 14B support)

## Project Structure

```
financial-ai-app/
├── backend/                 # Node.js/Express API
│   ├── src/
│   │   ├── controllers/     # Route handlers
│   │   ├── middleware/      # Authentication, validation
│   │   ├── models/          # Database models
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── types/           # TypeScript types
│   │   └── utils/           # Helper functions
│   ├── database/
│   │   ├── migrations/      # Database schema migrations
│   │   └── seeds/           # Default data
│   └── tests/               # Backend tests
├── frontend/                # Next.js React app
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Next.js pages
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API clients
│   │   └── types/           # TypeScript types
│   └── public/              # Static assets
├── database/                # Database configuration
└── docs/                    # Documentation
```

## Installation

### Prerequisites

- Node.js 18+ and npm
- Git
- (Optional) Ollama for local AI models

### 1. Clone the Repository

```bash
git clone https://github.com/jasonjoplin/Financial-App.git
cd Financial-App
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the backend directory:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database
DATABASE_PATH=./database.sqlite

# JWT
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random

# AI Provider API Keys (Optional - for real AI integration)
OPENAI_API_KEY=sk-your-openai-api-key-here
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key-here

# Ollama Configuration (for local AI)
OLLAMA_ENDPOINT=http://172.20.64.1:11434
OLLAMA_MODEL=deepseek-r1:14b

# CORS Configuration
CORS_ORIGIN=http://localhost:3002
```

Initialize the database and start the server:

```bash
npm run dev
```

The backend will be available at `http://localhost:3001`

### 3. Frontend Setup

Open a new terminal and navigate to the frontend directory:

```bash
cd frontend
npm install
```

Create a `.env.local` file in the frontend directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Start the frontend development server:

```bash
npm run dev
```

The frontend will be available at `http://localhost:3002`

### 4. Local AI Setup (Optional)

For local AI functionality using Ollama:

#### On Windows (if using WSL):

1. Install Ollama from https://ollama.ai
2. Start Ollama with network access:
```cmd
set OLLAMA_HOST=0.0.0.0:11434
ollama serve
```

3. Pull the DeepSeek R1 model:
```cmd
ollama pull deepseek-r1:14b
```

#### On Linux/MacOS:

1. Install Ollama:
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

2. Start Ollama:
```bash
OLLAMA_HOST=0.0.0.0:11434 ollama serve
```

3. Pull the model:
```bash
ollama pull deepseek-r1:14b
```

## Usage

### Demo Credentials

The application comes with demo credentials for testing:

- **Email**: `test@financialai.com`
- **Password**: `password123`

### Getting Started

1. **Login** using the demo credentials
2. **Configure AI Providers** in Settings > AI Providers tab
3. **Set up Chart of Accounts** in the Accounts page
4. **Create Transactions** using the AI assistant or manual entry
5. **Generate Reports** to view financial statements

### Key Features

#### AI Transaction Analysis
- Navigate to the home page or transactions page
- Click "AI Assistant" and describe a transaction
- The AI will suggest proper journal entries with confidence scores

#### Document OCR Processing
- Go to the OCR page
- Upload receipts or invoices
- AI will extract data and suggest accounting entries

#### Financial Reports
- Access comprehensive reports in the Reports section
- Generate Profit & Loss, Balance Sheet, and Trial Balance
- Export to PDF or Excel

#### Global Search
- Press `⌘K` (Mac) or `Ctrl+K` (Windows/Linux) anywhere in the app
- Search across all transactions, accounts, and contacts

## Configuration

### AI Provider Setup

1. Navigate to **Settings > AI Providers**
2. Configure your preferred AI provider:

   - **OpenAI**: Add your API key and select model (GPT-4 recommended)
   - **Anthropic**: Add your API key and select Claude model
   - **Ollama**: Set endpoint URL and select local model

3. Test connections using the "Test" button for each provider

### Company Settings

1. Go to **Settings > Company**
2. Configure:
   - Company name and details
   - Accounting method (Accrual/Cash)
   - Base currency
   - Fiscal year end

## Architecture

### Frontend Structure
```
frontend/src/
├── components/          # Reusable UI components
├── contexts/           # React contexts (Auth, etc.)
├── pages/             # Next.js pages
├── styles/            # CSS and styling
└── utils/             # Utility functions
```

### Backend Structure
```
backend/
├── src/
│   ├── controllers/   # Route handlers
│   ├── middleware/    # Express middleware
│   ├── models/        # Database models
│   ├── routes/        # API routes
│   ├── services/      # Business logic
│   └── utils/         # Utility functions
├── database.sqlite    # SQLite database
└── server.js         # Express server
```

## Development

### Available Scripts

#### Backend
- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm test` - Run tests

#### Frontend
- `npm run dev` - Start Next.js development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Database Schema

The application uses SQLite with the following main tables:
- `users` - User authentication and profiles
- `companies` - Company information
- `accounts` - Chart of accounts
- `transactions` - Journal entries and transactions
- `ai_settings` - AI provider configurations

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Security

- JWT tokens for authentication
- Bcrypt password hashing
- Input validation and sanitization
- CORS protection
- Environment variable protection for API keys

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue on GitHub or contact the development team.

## Roadmap

- [ ] Multi-company support
- [ ] Advanced reporting dashboards
- [ ] Mobile app development
- [ ] Integration with major banking APIs
- [ ] Advanced AI analytics and predictions
- [ ] Audit trail and compliance features

---

**Built with ❤️ using AI-powered development tools**