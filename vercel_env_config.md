# Vercel Environment Variable Configuration

## Environment Variables for Production

| Variable | How to Get the Value |
|---|---|
| `DATABASE_URL` | Copy the public connection string from Railway → Postgres service → **Connect** tab |
| `JWT_SECRET` | Run `openssl rand -base64 32` and paste the output |
| `JWT_REFRESH_SECRET` | Run `openssl rand -base64 32` again (must be different from JWT_SECRET) |

## Instructions to Add Environment Variables to Vercel

### Step 1: Open Vercel Dashboard
- Go to [Vercel Dashboard](https://vercel.com/dashboard)

### Step 2: Select Your Project
- Click on the `rotaigs` project.

### Step 3: Navigate to Settings
- Click on the `Settings` tab → `Environment Variables`.

### Step 4: Add Each Variable
For each row in the table above:
- Click **Add New**
- Enter the **Key** and **Value**
- Ensure **Production** is selected
- Click **Save**

### Step 5: Redeploy
- Go to the **Deployments** tab
- Click **⋯** → **Redeploy** on the latest failed build

---

## Build Fix

The `vercel.json` build command was updated to provide a dummy `DATABASE_URL` placeholder for the `prisma generate` step. This prevents build failures when the environment variable is not available at compile time. The real `DATABASE_URL` (added in Vercel's dashboard) is used at runtime.
