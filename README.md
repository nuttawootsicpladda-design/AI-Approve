# 🚀 PO Approval System

A modern, AI-powered web application for automating Purchase Order (PO) approval workflows. Built with Next.js 14, TypeScript, and OpenAI.

![PO Approval System](https://img.shields.io/badge/Next.js-14-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue) ![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-green)

## ✨ Features

- 📤 **File Upload**: Support for PDF, DOCX, XLSX, and image files
- 🤖 **AI-Powered Extraction**: Automatic data extraction using OpenAI GPT-4o
- ✏️ **Editable Tables**: Review and edit extracted data before sending
- 📧 **Email Integration**: Send approval requests via Microsoft Outlook
- 📊 **History Tracking**: View and manage all sent PO records
- 🌐 **Multi-language**: English and Thai language support
- 🎨 **Modern UI**: Beautiful, responsive design with Tailwind CSS

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **AI**: OpenAI GPT-4o (Vision & Text)
- **Email**: Microsoft Graph API
- **File Processing**: pdf-parse, mammoth, xlsx
- **UI Components**: Custom components with shadcn/ui patterns

## 📋 Prerequisites

Before you begin, ensure you have:

- Node.js 18+ installed
- OpenAI API key
- Microsoft Azure app registration (for email sending)

## 🚀 Quick Start

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd po-approval-system
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env.local` file in the root directory:

```env
# OpenAI API Key (for document extraction)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Microsoft Graph API (for sending emails via Outlook)
MICROSOFT_CLIENT_ID=your-client-id
MICROSOFT_CLIENT_SECRET=your-client-secret
MICROSOFT_TENANT_ID=your-tenant-id

# Email Configuration
DEFAULT_EMAIL_RECIPIENT=pitchaya.n@icpladda.com
EMAIL_SENDER=your-email@icpladda.com

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Set up Microsoft Azure App (for email)

1. Go to [Azure Portal](https://portal.azure.com)
2. Create a new App Registration
3. Add the following API permissions:
   - `Mail.Send`
   - `User.Read`
4. Create a client secret
5. Copy the Client ID, Client Secret, and Tenant ID to your `.env.local`

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📖 Usage Guide

### Upload & Extract

1. Click or drag-and-drop a PO document (PDF, DOCX, XLSX, or image)
2. AI automatically extracts line items from the document
3. Review the extracted data

### Edit & Customize

1. Click the edit icon (✏️) to modify any item
2. Add new rows with the "Add Row" button
3. Delete unwanted items with the trash icon (🗑️)
4. Adjust email recipient and subject

### Send Email

1. Preview the email before sending
2. Click "Send Email" to submit the approval request
3. Email is sent with formatted table and attachments

### View History

1. Click "View History" to see all sent POs
2. Click on any record to view details
3. Delete old records as needed

## 🌐 Language Support

Toggle between English and Thai using the language switcher in the top-right corner.

## 📁 Project Structure

```
po-approval-system/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── extract/       # Document extraction endpoint
│   │   ├── send-email/    # Email sending endpoint
│   │   └── history/       # History management endpoint
│   ├── history/           # History page
│   ├── page.tsx           # Home page
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # UI components (Button, Card, Input)
│   ├── FileUpload.tsx    # File upload component
│   ├── POTable.tsx       # Editable table component
│   ├── EmailPreview.tsx  # Email preview component
│   └── LanguageSwitcher.tsx # Language switcher
├── lib/                   # Utility libraries
│   ├── types.ts          # TypeScript types
│   ├── utils.ts          # Utility functions
│   ├── translations.ts   # Language translations
│   ├── db.ts             # Database helper (JSON file storage)
│   ├── openai.ts         # OpenAI integration
│   ├── microsoft-graph.ts # Microsoft Graph API
│   └── file-processor.ts # File processing utilities
├── data/                  # Data storage (auto-generated)
│   └── po-records.json   # PO history records
└── public/               # Static assets
```

## 🔧 Configuration

### Supported File Formats

- **PDF**: `.pdf`
- **Word**: `.docx`, `.doc`
- **Excel**: `.xlsx`, `.xls`
- **Images**: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`
- **Text**: `.txt`, `.csv`

### Email Template Customization

Edit the email template in `app/page.tsx` (search for `htmlBody`).

### Language Customization

Add or modify translations in `lib/translations.ts`.

## 🚢 Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com)
3. Import your repository
4. Add environment variables
5. Deploy!

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

### Deploy to Other Platforms

The app can be deployed to any platform that supports Node.js:
- Netlify
- Railway
- AWS (Amplify, Elastic Beanstalk)
- Google Cloud Run
- Azure App Service

## 📝 License

MIT License - feel free to use this project for your own purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues or questions, please open an issue on GitHub.

## 🙏 Acknowledgments

- OpenAI for GPT-4o
- Microsoft for Graph API
- Vercel for hosting platform
- Next.js team for the amazing framework

---

Made with ❤️ for automated PO approval
