# API Route Authentication Guide

## How to Protect API Routes

To protect any API route with Clerk authentication, follow this pattern:

### 1. Import the authentication helper
```typescript
import { requireAuth } from "@/lib/api-auth"
```

### 2. Add authentication check at the beginning of your route handler
```typescript
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth()
    if (authResult instanceof NextResponse) return authResult
    
    // Your protected route logic here
    // The authResult variable contains the userId if authentication succeeded
    
  } catch (error) {
    // Error handling
  }
}
```

### 3. Alternative: Direct auth check
If you need more control, you can use Clerk's auth directly:

```typescript
import { auth } from "@clerk/nextjs/server"

export async function GET(request: NextRequest) {
  const { userId } = await auth()
  
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }
  
  // Your protected route logic here
}
```

## Public Routes
Routes that should remain public (like health checks) are configured in `/src/middleware.ts`. Add them to the `isPublicRoute` matcher if needed.