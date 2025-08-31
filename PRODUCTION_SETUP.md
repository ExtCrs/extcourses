## Multi-Site Deployment Configuration

For multiple sites using the same codebase, each deployment should set its own `NEXT_PUBLIC_SITE_URL`:

### Your Sites Configuration

#### Tampa Courses
```bash
NEXT_PUBLIC_SITE_URL=https://tampacourses.vercel.app
```

#### Extension Courses  
```bash
NEXT_PUBLIC_SITE_URL=https://extcourses.vercel.app
```

#### Port Elizabeth Courses
```bash
NEXT_PUBLIC_SITE_URL=https://portelizabethcourses.vercel.app
```

### Vercel Deployment Steps

1. **For each site project in Vercel:**
   - Go to Project Settings → Environment Variables
   - Add `NEXT_PUBLIC_SITE_URL` with the specific domain
   - Redeploy the project

2. **Development:**
   - No need to set `NEXT_PUBLIC_SITE_URL` in local `.env.local`
   - Automatically uses `http://localhost:3000`

## Solution Benefits

✅ **No hardcoded URLs** - Each site automatically uses its own domain  
✅ **Clean development** - No environment variable needed locally  
✅ **Simple deployment** - Just set one variable per site  
✅ **Automatic fallback** - Uses current domain if variable not set

### 2. Platform-Specific Configuration

#### Vercel Deployment
1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add/Update:
   ```
   NEXT_PUBLIC_SITE_URL = https://your-actual-domain.com
   ```
4. Redeploy the application

#### Netlify Deployment
1. Go to your Netlify site dashboard
2. Navigate to **Site settings** → **Environment variables**
3. Add/Update:
   ```
   NEXT_PUBLIC_SITE_URL = https://your-actual-domain.com
   ```
4. Trigger a new build

#### Docker/VPS Deployment
Update your docker-compose.yml or environment file:
```yaml
environment:
  - NEXT_PUBLIC_SITE_URL=https://your-actual-domain.com
  # ... other environment variables
```

#### Railway/Render/Other Platforms
Follow the platform's documentation to set environment variables with your production domain.

### 3. Verification Steps

#### Before Deployment
```bash
# Check your local .env.local file
cat .env.local | grep NEXT_PUBLIC_SITE_URL

# Should NOT show:
# NEXT_PUBLIC_SITE_URL=https://your-production-domain.com
# NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Should show your actual domain:
# NEXT_PUBLIC_SITE_URL=https://youractualsite.com
```

#### After Deployment
1. **Test Password Recovery Flow:**
   - Go to your production site
   - Click "Восстановить пароль" / "Recover Password"
   - Enter a valid email address
   - Check the email you receive

2. **Verify Reset Link:**
   - The email should contain a link like:
   ```
   https://xfrgptcsgrqrtyprafht.supabase.co/auth/v1/verify?token=...&redirect_to=https://youractualsite.com/ru/auth/reset-password
   ```
   - NOT:
   ```
   https://xfrgptcsgrqrtyprafht.supabase.co/auth/v1/verify?token=...&redirect_to=http://localhost:3000/ru/auth/reset-password
   ```

### 4. Troubleshooting

#### Issue: Still Getting localhost URLs
**Possible Causes:**
1. Environment variable not set on production server
2. Application cache not cleared after deployment
3. Environment variable has incorrect value

**Solutions:**
1. Verify environment variable in production:
   ```javascript
   // Add temporary debug code to your component
   console.log('NEXT_PUBLIC_SITE_URL:', process.env.NEXT_PUBLIC_SITE_URL);
   console.log('window.location.origin:', window.location.origin);
   ```

2. Force redeploy/rebuild your application
3. Clear browser cache and test again

#### Issue: Environment Variable Not Available
**Check:**
1. Variable starts with `NEXT_PUBLIC_` (required for client-side access)
2. Variable is set in production environment (not just local .env file)
3. Application was rebuilt after setting the variable

#### Issue: Multiple Sites with Same Codebase
For multiple sites using the same codebase:

**Site 1 (.env.production.site1):**
```bash
NEXT_PUBLIC_SITE_URL=https://site1.example.com
```

**Site 2 (.env.production.site2):**
```bash
NEXT_PUBLIC_SITE_URL=https://site2.example.com
```

### 5. Environment File Examples

#### Development (.env.local)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xfrgptcsgrqrtyprafht.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_ORG=4
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

#### Production (.env.production or deployment platform)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xfrgptcsgrqrtyprafht.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_ORG=4
NEXT_PUBLIC_SITE_URL=https://courses.yourorganization.org
```

### 6. Fallback Logic

The application includes fallback logic:
1. **First**: Use `NEXT_PUBLIC_SITE_URL` if properly configured
2. **Fallback**: Use `window.location.origin` if environment variable is missing or is placeholder

This ensures the application works even if the environment variable is not configured, but production should always set the correct URL.

### 7. Security Considerations

#### Supabase Auth Settings
1. Go to Supabase Dashboard → Authentication → Settings → URL Configuration
2. Add your production domain to **Site URL**
3. Add redirect patterns to **Redirect URLs**:
   ```
   https://youractualsite.com/**
   https://youractualsite.com/ru/auth/reset-password
   https://youractualsite.com/en/auth/reset-password
   ```

### 8. Testing Checklist

- [ ] Environment variable set with actual production domain
- [ ] Application redeployed after environment variable change
- [ ] Password recovery email received with correct redirect_to URL
- [ ] Reset link redirects to production site, not localhost
- [ ] Reset password flow works end-to-end
- [ ] Both Russian and English interfaces work correctly
- [ ] Supabase redirect URLs whitelist updated

## Quick Fix Commands

```bash
# 1. Update environment variable (replace with your domain)
export NEXT_PUBLIC_SITE_URL=https://youractualsite.com

# 2. Rebuild and deploy
npm run build
npm run start

# 3. Or redeploy on your platform (Vercel, Netlify, etc.)
```

Remember: **Always use your actual production domain, never leave placeholder URLs in production!**