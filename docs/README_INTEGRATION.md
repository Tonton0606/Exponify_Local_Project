# Hermes 1.0 - Enterprise Architecture

## Overview

This is a comprehensive enterprise management platform with AI-powered features across all modules:

1. **AI Intelligence Layer** - AI-powered features for chatbot, CRM, ERP, analytics, and automation (powered by Groq API)
2. **Business Operations Layer** - CRM, ERP, project management, inventory, and workflow automation
3. **Security & Compliance Layer** - Security audits, compliance monitoring, and access control via Supabase

## Project Structure

```
Hermes_1.0/
├── client/                          # React Frontend (Vercel)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Admin/
│   │   │   │   ├── Admin_Dashboard.jsx
│   │   │   │   ├── Admin_AccountControl.jsx
│   │   │   │   ├── Admin_HermesChatbot.jsx
│   │   │   │   └── Modules/
│   │   │   │       ├── Admin_CRM.jsx
│   │   │   │       ├── Admin_ERP.jsx
│   │   │   │       ├── Admin_Analytics.jsx
│   │   │   │       ├── Admin_Infrastructure.jsx
│   │   │   │       └── Admin_Security.jsx
│   │   │   ├── Components/
│   │   │   │   └── Admin_Components/
│   │   │   │       ├── Admin_Layout.jsx
│   │   │   │       ├── Admin_Navbar.jsx
│   │   │   │       └── Admin_Sidebar.jsx
│   │   │   └── Client/
│   │   │       └── Client_Dashboard.jsx
│   │   ├── services/
│   │   │   ├── openClaude/
│   │   │   │   └── index.js
│   │   │   ├── openfang/
│   │   │   │   └── index.js
│   │   │   └── pentagi/
│   │   │       └── index.js
│   │   ├── styles/
│   │   │   └── Admin_styles/
│   │   │       └── Admin_Style.css
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   └── package.json
└── server/                          # Express Backend
    ├── routes/
    │   ├── main.js
    │   └── services/
    │       ├── openClaude.js
    │       ├── openfang.js
    │       └── pentagi.js
    ├── config/
    │   └── supabase.js
    ├── app.js
    ├── server.js
    ├── .env.example
    └── package.json
```

## Setup Instructions

### 1. Environment Configuration

Copy the example environment files and add your API keys:

**Client (.env):**
```bash
cp client/.env.example client/.env
```

**Server (.env):**
```bash
cp server/.env.example server/.env
```

### 2. Required Environment Variables

#### Client (.env)
- `VITE_OPENCLAUDE_API_KEY` - Your OpenClaude API key
- `VITE_OPENCLAUDE_API_URL` - OpenClaude API endpoint
- `VITE_OPENFANG_API_KEY` - Your Openfang API key
- `VITE_OPENFANG_API_URL` - Openfang API endpoint
- `VITE_PENTAGI_API_KEY` - Your PentAgi API key
- `VITE_PENTAGI_API_URL` - PentAgi API endpoint
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `VITE_API_URL` - Backend API URL

#### Server (.env)
- `PORT` - Server port (default: 3000)
- `OPENCLAUDE_API_KEY` - Your OpenClaude API key
- `OPENCLAUDE_API_URL` - OpenClaude API endpoint
- `OPENFANG_API_KEY` - Your Openfang API key
- `OPENFANG_API_URL` - Openfang API endpoint
- `PENTAGI_API_KEY` - Your PentAgi API key
- `PENTAGI_API_URL` - PentAgi API endpoint
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `JWT_SECRET` - JWT secret for authentication
- `CORS_ORIGIN` - CORS origin for frontend

### 3. Installation

**Install Client Dependencies:**
```bash
cd client
npm install
```

**Install Server Dependencies:**
```bash
cd server
npm install
```

### 4. Running the Application

**Start the Server:**
```bash
cd server
npm start
```

**Start the Client:**
```bash
cd client
npm run dev
```

## Module Overview

### Admin Dashboard
- **Location:** `/AdminDashboard`
- **Features:** System status monitoring, module navigation

### Hermes Chatbot
- **Location:** `/AdminHermesChatbot`
- **Features:** AI-powered chatbot configuration

### CRM Workflows
- **Location:** `/AdminCRM`
- **Features:** Customer management, AI insights

### ERP Documentation
- **Location:** `/AdminERP`
- **Features:** Document management, AI-generated documentation

### Analytics & Reports
- **Location:** `/AdminAnalytics`
- **Features:** Business intelligence, AI-powered insights

### Infrastructure
- **Location:** `/AdminInfrastructure`
- **Features:** Model deployment, resource management

### Security & Compliance
- **Location:** `/AdminSecurity`
- **Features:** Security audits, compliance monitoring

## API Endpoints

### OpenClaude Service
- `POST /api/openclaude/chat` - Chat completion
- `POST /api/openclaude/crm-insights` - Generate CRM insights
- `POST /api/openclaude/erp-docs` - Generate ERP documentation
- `POST /api/openclaude/analytics-insights` - Generate analytics insights
- `POST /api/openclaude/market-research` - Generate market research

### Openfang Service
- `GET /api/openfang/health` - Health check
- `GET /api/openfang/infrastructure/status` - Infrastructure status
- `POST /api/openfang/models/deploy` - Deploy model
- `GET /api/openfang/models` - List models
- `POST /api/openfang/infrastructure/scale` - Scale resources

### PentAgi Service
- `GET /api/pentagi/health` - Health check
- `POST /api/pentagi/security/audit` - Run security audit
- `GET /api/pentagi/security/reports` - List security reports
- `POST /api/pentagi/compliance/check` - Check compliance
- `GET /api/pentagi/compliance/status` - Compliance status

## Deployment

### Frontend (Vercel)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

### Backend (Render/Railway)
1. Connect your GitHub repository to Render/Railway
2. Set environment variables
3. Deploy automatically on push

### Database (Supabase)
1. Create tables in Supabase dashboard
2. Configure Row Level Security (RLS)
3. Set up authentication

## Security & Compliance

- **PH-DPA** - Philippine Data Privacy Act compliance
- **GDPR** - General Data Protection Regulation compliance
- **ISO-27001** - Information Security Management System

## Support

For issues and questions, please refer to the project documentation or contact the development team.
