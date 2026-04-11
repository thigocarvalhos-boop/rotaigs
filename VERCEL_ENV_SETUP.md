# VERCEL_ENV_SETUP.md

## Setting Up Environment Variables in Vercel

To ensure your Vercel deployment works correctly, add the following environment variables in the **Production** environment on Vercel.

### Required Environment Variables

| Variable | How to Get the Value |
|---|---|
| `DATABASE_URL` | Copy your Railway PostgreSQL connection string from Railway → your Postgres service → **Connect** tab (public URL format: `postgresql://postgres:<PASSWORD>@<HOST>:<PORT>/railway`) |
| `JWT_SECRET` | Run `openssl rand -base64 32` in your terminal and paste the output |
| `JWT_REFRESH_SECRET` | Run `openssl rand -base64 32` again (use a different value from JWT_SECRET) |

### Step-by-step Instructions for Adding Variables to Vercel

1. Go to [Vercel Dashboard → Environment Variables](https://vercel.com/institutoguiaosocials-projects/rotaigs/settings/environment-variables)
2. For each row in the table above, click **Add New** and enter the key and value.
3. Make sure **Production** is checked for each variable.
4. Click **Save** after adding all three variables.

### Redeploying Your Application

After saving the variables:
1. Navigate to the **Deployments** tab in your Vercel dashboard.
2. Click **⋯** → **Redeploy** on the latest failed build.
3. Wait for the build to complete successfully.
4. Visit [https://rotaigs.vercel.app](https://rotaigs.vercel.app) to confirm the app is running.

### Why the Build Was Failing

The Vercel build was failing because `prisma generate` requires `DATABASE_URL` to be set at build time, but the variable was missing. This has been fixed in `vercel.json` — the build command now uses a placeholder `DATABASE_URL` just for the `prisma generate` step. The real `DATABASE_URL` value (added in Vercel's dashboard) is used at runtime by the serverless API functions.