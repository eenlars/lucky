# Clerk Authentication Testing Checklist

## 🔐 Pre-Testing Setup
- [ ] Create Clerk account at https://clerk.com
- [ ] Create new application in Clerk dashboard
- [ ] Copy Publishable Key and Secret Key
- [ ] Update `.env.local` with Clerk keys:
  ```env
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
  CLERK_SECRET_KEY=sk_test_...
  ```
- [ ] Run `bun install` to ensure all dependencies are installed
- [ ] Run `bun run dev` to start the development server

## 🧪 Authentication Flow Tests

### Sign Up Flow
- [ ] Navigate to `/` while unauthenticated → Should redirect to `/sign-in`
- [ ] Click "Sign up" link on sign-in page → Should navigate to `/sign-up`
- [ ] Complete sign-up form with email/password
- [ ] Verify email (if email verification is enabled)
- [ ] Confirm redirect to home page after successful sign-up

### Sign In Flow
- [ ] Navigate to any protected route while signed out → Should redirect to `/sign-in`
- [ ] Enter valid credentials on sign-in page
- [ ] Confirm redirect to originally requested page or home
- [ ] Verify navbar shows with UserButton

### Sign Out Flow
- [ ] Click UserButton in navbar
- [ ] Select "Sign out" option
- [ ] Confirm redirect to `/sign-in` page
- [ ] Verify cannot access protected routes after sign out

## 📱 Page Access Tests

### Public Pages (should be accessible without auth)
- [ ] `/sign-in` - Sign in page
- [ ] `/sign-up` - Sign up page
- [ ] `/api/health/*` - Health check endpoints

### Protected Pages (require authentication)
- [ ] `/` - Home page
- [ ] `/edit` - Editor page
- [ ] `/invocations` - Traces page
- [ ] `/structures` - Structures page
- [ ] `/evolution` - Evolution page
- [ ] `/experiments/*` - All experiment pages

## 🔌 API Route Tests

### Test Protected API Routes
For each route, test both authenticated and unauthenticated access:

#### Without Authentication (should return 401)
- [ ] `GET /api/workflow/invocations`
- [ ] `POST /api/workflow/invoke`
- [ ] `POST /api/workflow/verify`
- [ ] `GET /api/evolution-runs`
- [ ] `POST /api/invoke`

#### With Authentication (should work normally)
- [ ] Same routes as above should return proper data/responses

### Test with curl (replace YOUR_COOKIE with actual session cookie):
```bash
# Without auth (should fail with 401)
curl -X GET http://localhost:3000/api/evolution-runs

# With auth (get cookie from browser DevTools after signing in)
curl -X GET http://localhost:3000/api/evolution-runs \
  -H "Cookie: __session=YOUR_SESSION_COOKIE"
```

## 🎨 UI Component Tests

### Navbar
- [ ] UserButton visible when authenticated
- [ ] UserButton shows user email/avatar
- [ ] Dropdown menu works (profile, sign out)
- [ ] Navigation links work correctly

### Protected Components
- [ ] Components requiring auth data render correctly
- [ ] No authentication errors in console
- [ ] Proper loading states while auth is checking

## 🔧 Configuration Tests

### Environment Variables
- [ ] App fails to start without CLERK_SECRET_KEY
- [ ] App fails to start without NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
- [ ] Proper error messages for missing env vars

### Middleware
- [ ] Middleware correctly identifies protected routes
- [ ] Public routes remain accessible
- [ ] API routes properly protected

## 🚀 Production Readiness

### Build Tests
- [ ] `bun run build` completes without errors
- [ ] `bun run start` serves production build
- [ ] Authentication works in production mode

### TypeScript & Linting
- [ ] `bun run tsc` passes without errors
- [ ] `bun run lint` passes without errors
- [ ] No console errors in browser

### Performance
- [ ] Page loads don't hang on auth check
- [ ] Quick redirects for unauthenticated users
- [ ] UserButton loads without delay

## 🐛 Edge Cases

### Session Management
- [ ] Multiple tabs stay in sync (sign out in one = signed out in all)
- [ ] Session persists across browser restart
- [ ] Expired session redirects to sign-in

### Error Handling
- [ ] Network failure during auth shows appropriate error
- [ ] Invalid credentials show clear error message
- [ ] Rate limiting handled gracefully

## 📊 Monitoring & Logs

### Check Application Logs
- [ ] No authentication-related errors in server logs
- [ ] API routes log authentication failures appropriately
- [ ] No sensitive data (keys, tokens) in logs

### Clerk Dashboard
- [ ] Users appear in Clerk dashboard
- [ ] Sign-in attempts logged
- [ ] User sessions visible

## ✅ Final Verification

### User Experience
- [ ] Smooth authentication flow
- [ ] Clear error messages
- [ ] Appropriate loading states
- [ ] Consistent behavior across all pages

### Security
- [ ] No way to bypass authentication
- [ ] API routes properly secured
- [ ] Sensitive data protected
- [ ] No authentication tokens in URLs

## 📝 Notes
- Document any issues found:
  - 
  - 
  - 

## 🎉 Sign-off
- [ ] All tests pass
- [ ] Ready for deployment
- [ ] Documentation updated

---

**Testing completed by:** _______________
**Date:** _______________
**Environment:** Development / Staging / Production