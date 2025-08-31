# Supabase Email Template Configuration for Multilingual Support

## Overview

This guide explains how to configure Supabase email templates to send password recovery emails in the user's preferred language (Russian or English).

## Current Implementation

The application now passes the user's current language to Supabase when requesting password recovery:

```javascript
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${siteUrl}/${lang}/auth/reset-password`,
  emailRedirectTo: `${siteUrl}/${lang}/auth/reset-password`,
  data: {
    lang: lang // Pass language to email template
  }
})
```

## Supabase Configuration Required

### 1. Access Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Settings** → **Email Templates**

### 2. Configure Reset Password Template

You'll need to create conditional email templates that check the `lang` parameter:

#### Template Structure
```html
<!-- Reset Password Email Template -->
<!DOCTYPE html>
<html>
<head>
    <title>
        {{ if .Data.lang == "en" }}
            Password Reset
        {{ else }}
            Восстановление пароля
        {{ end }}
    </title>
</head>
<body>
    {{ if .Data.lang == "en" }}
        <!-- English Content -->
        <h1>Reset Your Password</h1>
        <p>You have requested to reset your password. Click the link below to set a new password:</p>
        <a href="{{ .ConfirmationURL }}">Reset Password</a>
        <p>If you didn't request this, please ignore this email.</p>
    {{ else }}
        <!-- Russian Content -->
        <h1>Восстановление пароля</h1>
        <p>Вы запросили восстановление пароля. Нажмите на ссылку ниже, чтобы установить новый пароль:</p>
        <a href="{{ .ConfirmationURL }}">Восстановить пароль</a>
        <p>Если вы не запрашивали восстановление пароля, проигнорируйте это письмо.</p>
    {{ end }}
</body>
</html>
```

### 3. Template Variables Available

Supabase provides these variables in email templates:
- `{{ .ConfirmationURL }}` - The reset password link
- `{{ .Email }}` - User's email address
- `{{ .Data.lang }}` - Custom language parameter we're passing
- `{{ .SiteURL }}` - Your site URL

### 4. Alternative Approach: Separate Templates

If conditional templates become complex, you can create separate email flows:

#### Method 1: Different Auth URLs
```javascript
// For Russian users
const russianResetURL = `${siteUrl}/ru/auth/reset-password`

// For English users  
const englishResetURL = `${siteUrl}/en/auth/reset-password`
```

#### Method 2: Multiple Supabase Projects
- Use separate Supabase projects for different languages
- Configure each with language-specific templates

### 5. Email Template Best Practices

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>
        {{ if eq .Data.lang "en" }}Password Reset{{ else }}Восстановление пароля{{ end }}
    </title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { 
            display: inline-block; 
            padding: 12px 24px; 
            background-color: #007bff; 
            color: white; 
            text-decoration: none; 
            border-radius: 4px; 
            margin: 20px 0;
        }
        .footer { 
            margin-top: 30px; 
            padding-top: 20px; 
            border-top: 1px solid #eee; 
            font-size: 14px; 
            color: #666; 
        }
    </style>
</head>
<body>
    <div class="container">
        {{ if eq .Data.lang "en" }}
            <h1>Reset Your Password</h1>
            <p>Hello,</p>
            <p>You have requested to reset your password for your account. Click the button below to set a new password:</p>
            <a href="{{ .ConfirmationURL }}" class="button">Reset Password</a>
            <p>This link will expire in 24 hours for security reasons.</p>
            <div class="footer">
                <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
                <p>If you're having trouble clicking the button, copy and paste the URL below into your web browser:</p>
                <p>{{ .ConfirmationURL }}</p>
            </div>
        {{ else }}
            <h1>Восстановление пароля</h1>
            <p>Здравствуйте,</p>
            <p>Вы запросили восстановление пароля для вашей учетной записи. Нажмите на кнопку ниже, чтобы установить новый пароль:</p>
            <a href="{{ .ConfirmationURL }}" class="button">Восстановить пароль</a>
            <p>Эта ссылка действительна в течение 24 часов по соображениям безопасности.</p>
            <div class="footer">
                <p>Если вы не запрашивали восстановление пароля, проигнорируйте это письмо. Ваш пароль останется без изменений.</p>
                <p>Если у вас возникли проблемы с нажатием кнопки, скопируйте и вставьте URL ниже в ваш веб-браузер:</p>
                <p>{{ .ConfirmationURL }}</p>
            </div>
        {{ end }}
    </div>
</body>
</html>
```

## Testing

### 1. Test Email Templates
1. Use Supabase's email template preview feature
2. Test with different language parameters
3. Verify URLs are correctly formatted

### 2. End-to-End Testing
```javascript
// Test Russian email
await supabase.auth.resetPasswordForEmail('test@example.com', {
  redirectTo: 'https://yoursite.com/ru/auth/reset-password',
  data: { lang: 'ru' }
})

// Test English email  
await supabase.auth.resetPasswordForEmail('test@example.com', {
  redirectTo: 'https://yoursite.com/en/auth/reset-password',
  data: { lang: 'en' }
})
```

## Troubleshooting

### Common Issues

1. **Template not updating**: Clear browser cache and wait a few minutes
2. **Language parameter not working**: Verify the template syntax `{{ .Data.lang }}`
3. **URLs incorrect**: Check `NEXT_PUBLIC_SITE_URL` environment variable
4. **Emails not sending**: Verify SMTP configuration in Supabase

### Debug Steps

1. Check Supabase logs for email delivery status
2. Verify email template syntax in dashboard
3. Test with different email providers
4. Check spam folders

## Security Considerations

1. **URL Validation**: Ensure redirect URLs are whitelisted in Supabase
2. **Token Expiration**: Configure appropriate expiration times
3. **Rate Limiting**: Consider implementing rate limiting for password reset requests
4. **Domain Verification**: Verify email domains to prevent abuse

## Additional Features

### Custom Email Subjects
```html
<!-- In Supabase email subject field -->
{{ if eq .Data.lang "en" }}
Password Reset Request
{{ else }}
Запрос на восстановление пароля
{{ end }}
```

### Enhanced Template Data
You can pass additional data for more personalization:

```javascript
await supabase.auth.resetPasswordForEmail(email, {
  data: {
    lang: lang,
    siteName: 'Extension Courses',
    supportEmail: 'support@example.com'
  }
})
```

Then use in template:
```html
<p>{{ .Data.siteName }} Support Team</p>
<p>Contact us: {{ .Data.supportEmail }}</p>
```