/**
 * @deprecated This file is no longer used - users are now managed through Clerk.
 *
 * To create users with specific roles:
 * 1. Users can self-register at /sign-up (defaults to "learner" role)
 * 2. Admins can create users via /admin/roster
 * 3. Roles can be changed via Clerk Dashboard or /admin/roster
 *
 * To set an initial admin user:
 * 1. Sign up at /sign-up
 * 2. Go to Clerk Dashboard > Users > select user
 * 3. Edit publicMetadata: { "role": "admin" }
 */

export async function seedDemoUsers() {
  console.warn(
    "seedDemoUsers is deprecated. Users are now managed through Clerk. " +
      "See lib/seed.ts for instructions on creating users."
  );
}
