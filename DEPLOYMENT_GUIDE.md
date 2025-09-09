# Deployment Guide - Clerk Authentication

## 🚀 Quick Start

### 1. Set Up Clerk
1. Sign up at [clerk.com](https://clerk.com)
2. Create a new application
3. Configure authentication methods (email/password, OAuth, etc.)
4. Get your API keys from the dashboard

### 2. Configure Environment
Create `.env.local` (or set in your deployment platform):
```env
# Required Clerk Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...

# Clerk URLs (already configured)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# Your other API keys...
```

### 3. Deploy
```bash
# Install dependencies
bun install

# Build the application
bun run build

# Start production server
bun run start
```

## 📦 Deployment Platforms

### Vercel
1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Railway
1. Connect GitHub repo
2. Add environment variables
3. Set build command: `bun run build`
4. Set start command: `bun run start`

### Docker
```dockerfile
FROM oven/bun:1 as base
WORKDIR /app

# Install dependencies
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# Copy application
COPY . .

# Build
RUN bun run build

# Production stage
FROM oven/bun:1
WORKDIR /app
COPY --from=base /app .

EXPOSE 3000
CMD ["bun", "run", "start"]
```

## 🔒 Security Checklist

### Environment Variables
- ✅ Never commit `.env.local` to git
- ✅ Use production keys in production (not test keys)
- ✅ Set all required environment variables
- ✅ Rotate keys periodically

### Clerk Configuration
- ✅ Enable appropriate authentication methods
- ✅ Configure password requirements
- ✅ Set up email verification if needed
- ✅ Configure session duration
- ✅ Enable MFA for sensitive applications

### Application Security
- ✅ All API routes protected with `requireAuth()`
- ✅ Middleware configured correctly
- ✅ No sensitive data in client-side code
- ✅ HTTPS enabled in production

## 🎯 Production Configuration

### Clerk Dashboard Settings
1. **Authentication**
   - Email/Password
   - OAuth providers (Google, GitHub, etc.)
   - Magic links
   - MFA options

2. **Security**
   - Password complexity requirements
   - Session lifetime
   - Concurrent session limits
   - IP restrictions (if needed)

3. **Customization**
   - Brand colors
   - Logo
   - Email templates
   - Custom domain for emails

### Application Settings
1. **Rate Limiting**
   - Consider adding rate limiting to API routes
   - Clerk handles auth rate limiting automatically

2. **Monitoring**
   - Set up error tracking (Sentry, etc.)
   - Monitor API route performance
   - Track authentication metrics in Clerk dashboard

## 🔍 Verification Steps

### After Deployment
1. **Test Authentication Flow**
   ```bash
   # Test sign-up
   curl https://your-app.com/sign-up
   
   # Test protected route (should return 401)
   curl https://your-app.com/api/evolution-runs
   ```

2. **Check Middleware**
   - Verify redirects work correctly
   - Ensure API routes are protected
   - Test public routes remain accessible

3. **Monitor Logs**
   - Check for authentication errors
   - Verify no sensitive data in logs
   - Monitor response times

## 📊 Monitoring & Analytics

### Clerk Dashboard
- User sign-ups and sign-ins
- Authentication methods used
- Failed authentication attempts
- Active sessions

### Application Metrics
- API route usage by authenticated users
- User engagement metrics
- Performance metrics

## 🆘 Troubleshooting

### Common Issues

**"Unauthorized" on all routes**
- Check CLERK_SECRET_KEY is set correctly
- Verify middleware configuration
- Check Clerk dashboard for app status

**Sign-in redirects not working**
- Verify NEXT_PUBLIC_CLERK_* URLs are set
- Check middleware matcher patterns
- Ensure cookies are enabled

**API routes returning 401**
- Verify user is signed in
- Check requireAuth() implementation
- Verify API route has authentication

**Build failures**
- Ensure all environment variables are set
- Check TypeScript errors: `bun run tsc`
- Verify dependencies: `bun install`

## 📚 Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Application README](./README.md)
- [API Authentication Guide](./app/API_AUTHENTICATION.md)
- [Testing Checklist](./TESTING_CHECKLIST.md)

## ✅ Final Checklist

Before going live:
- [ ] Production Clerk keys configured
- [ ] All environment variables set
- [ ] Authentication tested end-to-end
- [ ] API routes verified secure
- [ ] Monitoring configured
- [ ] Backup plan for auth issues
- [ ] User support documentation ready

---

**Deployment completed by:** _______________
**Date:** _______________
**Environment:** Production
**URL:** _______________