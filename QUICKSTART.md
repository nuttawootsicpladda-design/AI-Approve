# 🚀 Quick Start Guide

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set Up Environment Variables

Create `.env.local` file:

```env
OPENAI_API_KEY=sk-your-key-here
MICROSOFT_CLIENT_ID=your-client-id
MICROSOFT_CLIENT_SECRET=your-secret
MICROSOFT_TENANT_ID=your-tenant-id
EMAIL_SENDER=your-email@company.com
DEFAULT_EMAIL_RECIPIENT=recipient@company.com
```

## Step 3: Get OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy the key to your `.env.local`

## Step 4: Set Up Microsoft Azure (Optional - for email)

If you want to send emails:

1. Go to https://portal.azure.com
2. Navigate to "App registrations"
3. Click "New registration"
4. Name it "PO Approval System"
5. Add these API permissions:
   - `Mail.Send`
   - `User.Read`
6. Generate a client secret
7. Copy credentials to `.env.local`

**Skip email setup for now?** You can test without email - the app will work for extraction and preview!

## Step 5: Run the App

```bash
npm run dev
```

Open http://localhost:3000

## Step 6: Test with Example Data

```bash
node scripts/generate-example-po.js
```

Upload `examples/example-po.csv` or `examples/example-po.txt`

## 🎉 Done!

Your PO Approval System is ready to use!

## Need Help?

- Check the main [README.md](README.md) for detailed documentation
- Open an issue on GitHub if you encounter problems
