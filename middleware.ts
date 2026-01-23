import { clerkMiddleware, clerkClient, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)"]);
const isPendingRoute = createRouteMatcher(["/pending-approval"]);

// Check if user is approved (has approved flag or has a role set - grandfathered)
function isUserApproved(publicMetadata: Record<string, unknown>): boolean {
  // Explicitly approved
  if (publicMetadata.approved === true) return true;
  // Grandfathered: has a role but no approved flag (existing users before approval system)
  if (publicMetadata.role && publicMetadata.approved === undefined) return true;
  return false;
}

export default clerkMiddleware(async (auth, req) => {
  // Allow public routes
  if (isPublicRoute(req)) {
    return;
  }

  // Protect all non-public routes
  const { userId } = await auth.protect();

  // Allow pending-approval page for authenticated users
  if (isPendingRoute(req)) {
    return;
  }

  // Check approval status
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const publicMetadata = user.publicMetadata as Record<string, unknown>;

  if (!isUserApproved(publicMetadata)) {
    const url = new URL("/pending-approval", req.url);
    return NextResponse.redirect(url);
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
