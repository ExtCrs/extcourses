# Deployment Configuration

## Environment Variables

For proper password recovery functionality across different deployment environments, configure the following environment variables:

### Required Environment Variables

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Organization Configuration (optional)
NEXT_PUBLIC_ORG=organization_id

# Site URL for Password Recovery (important for production)
NEXT_PUBLIC_SITE_URL=https://your-production-domain.com
```

### Password Recovery Configuration

The `NEXT_PUBLIC_SITE_URL` environment variable is critical for proper password recovery functionality:

- **Development**: If not set, the system automatically uses `window.location.origin` (e.g., `http://localhost:3000`)
- **Production**: **Must be set** to your production domain to ensure password recovery emails contain the correct reset links

### Example Configurations

#### Development (.env.local)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_ORG=4
# NEXT_PUBLIC_SITE_URL is optional in development
```

#### Production
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_ORG=4
NEXT_PUBLIC_SITE_URL=https://your-production-domain.com
```

#### Multiple Sites (Different Domains)
For the same codebase deployed to multiple sites:

**Site 1:**
```bash
NEXT_PUBLIC_SITE_URL=https://site1.com
```

**Site 2:**
```bash
NEXT_PUBLIC_SITE_URL=https://site2.com
```

## Deployment Steps

1. **Set Environment Variables**: Configure all required environment variables for your deployment platform
2. **Update NEXT_PUBLIC_SITE_URL**: Ensure this matches your production domain
3. **Build**: Run `npm run build`
4. **Deploy**: Deploy using your preferred platform (Vercel, Netlify, etc.)

## Troubleshooting

### Password Recovery Links Show localhost
- **Problem**: Password recovery emails contain `localhost` links in production
- **Solution**: Set `NEXT_PUBLIC_SITE_URL` to your production domain

### Password Recovery Not Working
- **Check**: Supabase Auth settings for the correct redirect URL patterns
- **Verify**: `NEXT_PUBLIC_SITE_URL` is correctly set
- **Ensure**: The redirect URL pattern `{SITE_URL}/{lang}/auth/reset-password` is allowed in Supabase Auth settings

### Multilingual Email Templates
- **Problem**: Password recovery emails always in English
- **Solution**: Configure Supabase email templates with conditional language support
- **Reference**: See `SUPABASE_EMAIL_CONFIG.md` for detailed configuration guide
- **Note**: The application automatically passes the user's current language (`lang` parameter) to Supabase for email template customization