# Multi-Site Password Reset Solutions

## 🚨 **Problem Analysis**

Supabase overrides the `redirect_to` parameter with the default Site URL configured in the dashboard. This causes all password reset emails to redirect to the same domain, regardless of which site initiated the request.

**Root Cause:** Supabase Auth's security model enforces the Site URL setting to prevent redirect attacks.

## 🎯 **Solution Options**

### **Option 1: Custom Password Reset (Recommended) ✅**

**Advantages:**
- ✅ Full control over redirect URLs
- ✅ Works with multiple sites seamlessly  
- ✅ More secure (custom token validation)
- ✅ Can customize email templates completely
- ✅ No Supabase limitations

**Implementation:** Already provided in the code above.

**Steps:**
1. Create `password_reset_tokens` table (SQL provided)
2. Implement custom reset flow (code provided)
3. Update Auth component (done)
4. Update reset password page (done)
5. Set up email service

### **Option 2: Separate Supabase Projects**

**Create separate Supabase projects for each site:**
- Tampa Courses: Own Supabase project
- Extension Courses: Own Supabase project  
- Port Elizabeth: Own Supabase project

**Advantages:**
- ✅ Native Supabase functionality works
- ✅ Complete isolation between sites
- ✅ No custom implementation needed

**Disadvantages:**
- ❌ Data duplication
- ❌ Multiple databases to manage
- ❌ Higher costs (3 projects)
- ❌ Complex user management across sites

### **Option 3: Dynamic Site URL with Supabase Management API**

**Programmatically update Supabase Site URL before each reset:**

```javascript
// Pseudo-code - requires Supabase Management API
await supabase.management.updateProjectSettings({
  site_url: currentSiteUrl
})

await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${currentSiteUrl}/auth/reset-password`
})
```

**Disadvantages:**
- ❌ Complex implementation
- ❌ Race conditions possible
- ❌ Requires Management API access
- ❌ Not reliable for concurrent requests

### **Option 4: Smart Redirect Proxy**

**Set Supabase Site URL to a proxy that detects the original site:**

1. Set Site URL to: `https://reset-proxy.yourapp.com`
2. Proxy detects original site from token/session data
3. Redirects to correct site

**Disadvantages:**
- ❌ Additional infrastructure needed
- ❌ Complex token parsing
- ❌ Single point of failure

### **Option 5: Unified Domain with Subdirectories**

**Use one domain with subdirectories:**
- `https://mycourses.com/tampa/`
- `https://mycourses.com/extcourses/`
- `https://mycourses.com/portelizabeth/`

**Advantages:**
- ✅ Single Supabase Site URL works
- ✅ Native functionality preserved

**Disadvantages:**
- ❌ Requires domain restructuring
- ❌ May not fit business requirements
- ❌ Complex routing logic needed

## 🏆 **Recommended Solution: Custom Password Reset**

### **Why This is Optimal:**

1. **Multi-Site Native Support**: Each site gets its own reset URLs automatically
2. **No Supabase Limitations**: Complete control over the flow
3. **Enhanced Security**: Custom token validation with expiration
4. **Flexible Email Templates**: Use any email service (SendGrid, Resend, etc.)
5. **Future-Proof**: No dependency on Supabase Auth limitations

### **Implementation Status:**

✅ **Database Schema**: `password_reset_tokens` table created  
✅ **Custom Reset Logic**: `customPasswordReset.js` implemented  
✅ **Auth Component**: Updated to use custom flow  
✅ **Reset Page**: Updated to handle custom tokens  
🔄 **Email Service**: Needs configuration (see below)

## 📧 **Email Service Setup**

### **Option A: Supabase Edge Function**

Create an Edge Function to send emails:

```javascript
// supabase/functions/send-reset-email/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { email, resetUrl, lang } = await req.json()
  
  // Use your preferred email service
  // SendGrid, Resend, Amazon SES, etc.
  
  return new Response(JSON.stringify({ success: true }))
})
```

### **Option B: API Route**

```javascript
// pages/api/send-reset-email.js
export default async function handler(req, res) {
  const { email, resetUrl, lang } = req.body
  
  // Send email using your service
  
  res.json({ success: true })
}
```

### **Option C: External Service (Resend, SendGrid)**

Configure in `customPasswordReset.js`:

```javascript
async function sendPasswordResetEmail(email, resetUrl, lang) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'noreply@yourdomain.com',
      to: email,
      subject: lang === 'en' ? 'Password Reset' : 'Восстановление пароля',
      html: generateEmailTemplate(resetUrl, lang)
    })
  })
}
```

## 🚀 **Migration Steps**

### **Phase 1: Database Setup**
1. Run the SQL migration in Supabase
2. Verify `password_reset_tokens` table created

### **Phase 2: Code Deployment**  
1. Deploy updated code to all sites
2. Test with development environment

### **Phase 3: Email Service**
1. Choose email service (Resend recommended)
2. Configure email templates
3. Test email delivery

### **Phase 4: Production Rollout**
1. Deploy to production
2. Test password reset on all sites
3. Monitor error logs

### **Phase 5: Cleanup (Optional)**
- Remove old Supabase reset references
- Update documentation

## 🧪 **Testing Checklist**

### **Custom Reset Flow:**
- [ ] Email validation works (shows error for non-existent emails)
- [ ] Custom tokens are generated and stored
- [ ] Email contains correct site-specific reset URL
- [ ] Reset page validates tokens correctly
- [ ] Password update works with custom tokens
- [ ] Tokens expire after 24 hours
- [ ] Used tokens cannot be reused

### **Multi-Site Testing:**
- [ ] Tampa site generates Tampa reset URLs
- [ ] Extension site generates Extension reset URLs  
- [ ] Port Elizabeth site generates PE reset URLs
- [ ] All sites work independently

### **Edge Cases:**
- [ ] Expired tokens show appropriate error
- [ ] Invalid tokens show appropriate error
- [ ] Already used tokens show appropriate error
- [ ] Password validation works (length, confirmation)

## 💡 **Benefits Achieved**

✅ **Site-Specific URLs**: Each site gets its own reset links  
✅ **No Hardcoding**: Dynamic URL detection  
✅ **Enhanced Security**: Custom token validation  
✅ **Multilingual Support**: Maintained for emails  
✅ **Scalable**: Easy to add new sites  
✅ **Maintainable**: Single codebase for all sites

## 🔧 **Fallback Plan**

If the custom solution has issues, you can quickly revert to:

1. **Separate Supabase Projects** (Option 2) - Most reliable but expensive
2. **Unified Domain Structure** (Option 5) - Requires domain changes

The custom solution provides the best balance of functionality, cost, and maintainability for your multi-site setup.