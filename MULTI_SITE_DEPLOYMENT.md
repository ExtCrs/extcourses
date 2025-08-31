# Multi-Site Deployment Guide

## Your Current Sites
- **Tampa Courses**: https://tampacourses.vercel.app
- **Extension Courses**: https://extcourses.vercel.app  
- **Port Elizabeth Courses**: https://portelizabethcourses.vercel.app

## Quick Setup for Each Site

### 1. Vercel Environment Variables

For each Vercel project, go to **Settings → Environment Variables** and add:

#### Tampa Courses Project
```
NEXT_PUBLIC_SITE_URL = https://tampacourses.vercel.app
```

#### Extension Courses Project  
```
NEXT_PUBLIC_SITE_URL = https://extcourses.vercel.app
```

#### Port Elizabeth Courses Project
```
NEXT_PUBLIC_SITE_URL = https://portelizabethcourses.vercel.app
```

### 2. Redeploy Each Project

After setting the environment variable, trigger a new deployment for each project.

### 3. Supabase Configuration

In your Supabase dashboard (**Authentication → Settings → URL Configuration**):

#### Site URL
Set to any one of your domains (or leave as is):
```
https://tampacourses.vercel.app
```

#### Redirect URLs  
Add all your domains:
```
https://tampacourses.vercel.app/**
https://extcourses.vercel.app/**
https://portelizabethcourses.vercel.app/**
```

## How It Works

### Development
- No `NEXT_PUBLIC_SITE_URL` needed in `.env.local`
- Automatically uses `http://localhost:3000`
- Works for all sites during development

### Production
- Each site uses its own `NEXT_PUBLIC_SITE_URL`
- Password recovery emails contain correct domain
- Users get redirected to the same site they started from

### Example Flow
1. User visits `https://tampacourses.vercel.app`
2. Requests password recovery
3. Email contains: `redirect_to=https://tampacourses.vercel.app/ru/auth/reset-password`
4. User clicks link and returns to Tampa site

## Testing

After deployment, test each site:

1. **Go to each site's login page**
2. **Click "Восстановить пароль"**  
3. **Enter a valid email**
4. **Check that the recovery email contains the correct domain**

Expected email redirect URLs:
- Tampa: `redirect_to=https://tampacourses.vercel.app/ru/auth/reset-password`
- Ext: `redirect_to=https://extcourses.vercel.app/ru/auth/reset-password`
- PE: `redirect_to=https://portelizabethcourses.vercel.app/ru/auth/reset-password`

## Benefits of This Approach

✅ **No code changes needed** - Same codebase for all sites  
✅ **Clean development** - No environment variables needed locally  
✅ **Site-specific emails** - Each site gets its own recovery URLs  
✅ **Easy maintenance** - One codebase, multiple deployments  
✅ **Automatic detection** - Falls back to current domain if not set

## Troubleshooting

### Still getting localhost URLs?
1. Check environment variable is set in Vercel project settings
2. Trigger a new deployment after setting variable
3. Clear browser cache and test again

### Recovery email not received?
1. Check Supabase Auth settings include all domains
2. Verify email exists in profiles table
3. Check spam folder

### Wrong domain in recovery link?
1. Verify `NEXT_PUBLIC_SITE_URL` is set correctly for each project
2. Check browser console for debug log: "Using site URL for password recovery: ..."

## Quick Commands

```bash
# Development (no environment variable needed)
npm run dev

# Check environment variable in production
# Add this temporarily to your component:
console.log('Site URL:', process.env.NEXT_PUBLIC_SITE_URL);
console.log('Current origin:', window.location.origin);
```