# 🚢 Deployment Guide - Vercel

## Prerequisites

- GitHub account
- Vercel account (free at https://vercel.com)
- Your environment variables ready

## Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: PO Approval System"
git branch -M main
git remote add origin https://github.com/your-username/po-approval-system.git
git push -u origin main
```

## Step 2: Import to Vercel

1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Select your `po-approval-system` repository
4. Click "Import"

## Step 3: Configure Environment Variables

In Vercel dashboard, add these environment variables:

```
OPENAI_API_KEY=sk-your-openai-key
MICROSOFT_CLIENT_ID=your-client-id
MICROSOFT_CLIENT_SECRET=your-client-secret
MICROSOFT_TENANT_ID=your-tenant-id
EMAIL_SENDER=your-email@company.com
DEFAULT_EMAIL_RECIPIENT=recipient@company.com
```

## Step 4: Deploy

1. Click "Deploy"
2. Wait for deployment to complete (usually 1-2 minutes)
3. Your app will be available at `https://your-project.vercel.app`

## Step 5: Update Microsoft Azure Redirect URI

If you're using email functionality:

1. Go to Azure Portal → App registrations
2. Find your app
3. Add redirect URI: `https://your-project.vercel.app/api/auth/callback`

## Step 6: Test Your Deployment

1. Visit your Vercel URL
2. Upload a test PO document
3. Verify extraction works
4. Test email sending (if configured)

## 🎉 You're Live!

Your PO Approval System is now deployed and accessible worldwide.

## Automatic Updates

Every time you push to GitHub, Vercel will automatically:
- Build your app
- Run tests
- Deploy the new version

## Custom Domain (Optional)

1. Go to your project settings in Vercel
2. Click "Domains"
3. Add your custom domain
4. Follow DNS configuration instructions

## Monitoring & Logs

- **Logs**: Vercel Dashboard → Your Project → Logs
- **Analytics**: Enable Vercel Analytics in project settings
- **Errors**: Check Runtime Logs for any issues

## Tips

- Use Vercel's environment variable groups for different environments
- Enable automatic preview deployments for pull requests
- Set up Vercel monitoring for uptime alerts

## Troubleshooting

### Build Fails

Check the build logs in Vercel dashboard. Common issues:
- Missing environment variables
- TypeScript errors
- Package installation failures

### Runtime Errors

Check runtime logs in Vercel. Common issues:
- API key not working
- Microsoft Graph authentication issues
- File size limits (50MB on Vercel)

## Alternative Deployment Options

### Railway

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

### Netlify

```bash
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod
```

### Self-Hosted

```bash
npm run build
npm start
```

Then use nginx/apache to serve your app.

---

Need help? Open an issue on GitHub or contact support.
