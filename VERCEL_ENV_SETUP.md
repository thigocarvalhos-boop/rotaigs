# VERCEL_ENV_SETUP.md

## Setting Up Environment Variables in Vercel

To ensure your Vercel deployment works correctly, you need to set up the following environment variables:

### Required Environment Variables
1. **DATABASE_URL**: `postgresql://postgres:1234@localhost:5432/railway`  
   *Note: Please replace this placeholder with your actual Railway URL.*

2. **JWT_SECRET**:  
   *Generate a secure random value using the following command:*  
   ```bash
   openssl rand -base64 32
   ```  
   *Example Output: `abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890`*

3. **JWT_REFRESH_SECRET**:  
   *Generate a different secure random value using the following command:*  
   ```bash
   openssl rand -base64 32
   ```  
   *Example Output: `zyxwvu9876543210zyxwvu9876543210zyxwvu9876543210zyxwvu9876543210`*

### Step-by-step Instructions for Adding Variables to Vercel
1. Go to [Vercel Dashboard](https://vercel.com/institutoguiaosocials-projects/rotaigs/settings/environment-variables)
2. Click on **Add Environment Variable** for each variable you need to add.
3. Set each variable's environment to **Production**.
4. Click **Save** after adding each variable.

### Redeploying Your Application
After adding the environment variables, perform the following steps:
1. Navigate to the **Deployments** section in your Vercel dashboard.
2. Click **Redeploy** on the latest failed build.
3. Wait for the build to complete.
4. Test the API by visiting [https://rotaigs.vercel.app](https://rotaigs.vercel.app) to ensure everything is working.

Make sure to follow these instructions carefully to avoid any deployment issues!