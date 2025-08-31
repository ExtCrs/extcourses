# Custom Password Reset Setup Guide

## 🚨 Issue Fixed
The `pg_cron` extension error has been resolved. The migration no longer depends on the cron extension and provides alternative cleanup solutions.

## 📋 Setup Steps

### Step 1: Database Setup ✅

**Run the updated SQL migration in Supabase SQL Editor:**

```sql
-- The migration is now cron-free and ready to run
-- Execute: supabase/migrations/create_password_reset_tokens.sql
```

**What this creates:**
- `password_reset_tokens` table with proper structure
- Performance indexes for efficient queries
- Row Level Security (RLS) policies
- Cleanup function for manual/automated use

### Step 2: Code Deployment ✅

**Files already created/updated:**
- ✅ `/lib/auth/customPasswordReset.js` - Core reset logic
- ✅ `/components/auth/Auth.js` - Updated auth component  
- ✅ `/app/[lang]/auth/reset-password/page.js` - Updated reset page
- ✅ Application-level token cleanup included

### Step 3: Token Cleanup Solutions

Choose one of these cleanup approaches:

#### Option A: Application-Level Cleanup (Automatic) ✅
**Already implemented** - tokens are cleaned up automatically when verifying tokens.

#### Option B: Supabase Edge Function (JavaScript) ✅
```bash
# Deploy the cleanup function
supabase functions deploy cleanup-tokens

# Set up external cron (cron-job.org, EasyCron)
# Schedule daily HTTP POST to:
# https://your-project.supabase.co/functions/v1/cleanup-tokens
```

#### Option C: Next.js API Route (Easiest) ⭐
**File created:** `pages/api/cleanup-tokens.js`

**Setup:**
1. Add to `.env.local`: `CLEANUP_SECRET=your-random-secret-key`
2. Deploy your Next.js app
3. Schedule external HTTP POST to: `https://your-site.vercel.app/api/cleanup-tokens`

#### Option D: GitHub Actions (Automated)
**File created:** `.github/workflows/cleanup-tokens.yml`

**Setup:**
1. Add secrets to your GitHub repository:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_ANON_KEY`: Your Supabase anon key
2. Workflow runs daily at 2 AM UTC automatically

#### Option D: Manual Cleanup
```sql
-- Run manually in Supabase SQL Editor when needed
SELECT cleanup_expired_reset_tokens();
```

### Step 4: Email Service Configuration

Configure email sending in `/lib/auth/customPasswordReset.js`:

#### Recommended: Resend (Simple)
```bash
npm install resend
```

```javascript
// In customPasswordReset.js
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

async function sendPasswordResetEmail(email, resetUrl, lang) {
  await resend.emails.send({
    from: 'noreply@yourdomain.com',
    to: email,
    subject: lang === 'en' ? 'Password Reset' : 'Восстановление пароля',
    html: generateEmailTemplate(resetUrl, lang)
  })
}
```

#### Alternative: Supabase Edge Function
Create an email-sending Edge Function and call it from the reset logic.

#### Alternative: API Route
Create `/pages/api/send-reset-email.js` with your preferred email service.

### Step 5: Environment Variables

Add to your `.env.local` (and production environment):

```bash
# Email service (choose one)
RESEND_API_KEY=your_resend_api_key
# or
SENDGRID_API_KEY=your_sendgrid_api_key
# or
SMTP_HOST=your_smtp_host
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
```

## 🧪 Testing Checklist

### Database Setup Test
```sql
-- Verify table exists
SELECT * FROM password_reset_tokens LIMIT 1;

-- Test cleanup function
SELECT cleanup_expired_reset_tokens();
```

### Application Test
1. **Go to any of your sites** (Tampa, Extension, PE)
2. **Click "Восстановить пароль"**
3. **Enter a valid email**
4. **Check console logs** for reset URL (temporary)
5. **Verify token is stored** in database
6. **Visit reset URL** and test password update

### Multi-Site Test
- Verify each site generates its own reset URLs
- Test that reset links work on the originating site
- Confirm tokens include correct site URLs

### Email Service Test
Once configured:
- Verify emails are sent
- Check email content and formatting
- Test both Russian and English emails
- Confirm reset links work from email

## 🔧 Troubleshooting

### Database Issues
```sql
-- Check if table exists
\dt password_reset_tokens

-- Check table structure
\d password_reset_tokens

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'password_reset_tokens';
```

### Application Issues
```javascript
// Add debug logging to customPasswordReset.js
console.log('Token generated:', token)
console.log('Reset URL:', resetUrl)
console.log('Site URL:', siteUrl)
```

### Email Issues
- Check email service API keys
- Verify sender domain configuration
- Test with simple console.log first
- Check spam folders

## 🚀 Production Deployment

1. **Deploy code** to all sites (Tampa, Extension, PE)
2. **Run database migration** in production Supabase
3. **Configure email service** with production credentials
4. **Set up token cleanup** (choose one method above)
5. **Test thoroughly** on all sites
6. **Monitor logs** for any issues

## 📊 Monitoring

### Database Monitoring
```sql
-- Check token usage
SELECT 
  COUNT(*) as total_tokens,
  COUNT(*) FILTER (WHERE used = true) as used_tokens,
  COUNT(*) FILTER (WHERE expires_at < NOW()) as expired_tokens
FROM password_reset_tokens;

-- Check recent activity
SELECT * FROM password_reset_tokens 
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

### Application Monitoring
- Monitor reset request frequency
- Track successful vs failed resets
- Watch for error patterns in logs

## 🎯 Benefits Achieved

✅ **Multi-Site Support**: Each site gets its own reset URLs  
✅ **No Supabase Limitations**: Full control over redirect URLs  
✅ **Enhanced Security**: Custom token validation with expiration  
✅ **Flexible Email**: Use any email service  
✅ **Automatic Cleanup**: Multiple cleanup options available  
✅ **Backward Compatible**: Works alongside existing Supabase auth  

## 🔄 Rollback Plan

If needed, you can quickly disable custom reset:

1. **Comment out the custom logic** in Auth.js
2. **Revert to original Supabase flow**
3. **Keep the database table** for future use

The system is designed to be backward compatible and safe to deploy.