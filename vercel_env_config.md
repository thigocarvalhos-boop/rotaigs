# Vercel Environment Variable Configuration Script

## Environment Variables

1. **JWT_SECRET**: [Generated Secure Value]
2. **JWT_REFRESH_SECRET**: [Generated Secure Value]
3. **DATABASE_URL**: `${{ Postgres HA.DATABASE_URL }}`

## Instructions to Add Environment Variables to Vercel

### Step 1: Open Vercel Dashboard
- Go to [Vercel Dashboard](https://vercel.com/dashboard)

### Step 2: Select Your Project
- Click on the `rotaigs` project.

### Step 3: Navigate to Settings
- Click on the `Settings` tab on the sidebar.

### Step 4: Add Environment Variables
- Scroll down to the `Environment Variables` section.
- Click `Add New`.
- Enter the following values:  
  - Key: `JWT_SECRET`  
  - Value: [Generated Secure Value]  

- Click `Add New` again.  
- Enter:  
  - Key: `JWT_REFRESH_SECRET`  
  - Value: [Generated Secure Value]  

- Click `Add New` again.  
- Enter:  
  - Key: `DATABASE_URL`  
  - Value: `${{ Postgres HA.DATABASE_URL }}`  

### Step 5: Deploy Changes
- After adding the variables, ensure you redeploy your application for the changes to take effect.

---

## Generated Values
- **JWT_SECRET**: [Generated Secure Value]  
- **JWT_REFRESH_SECRET**: [Generated Secure Value]  

*Note: You must replace [Generated Secure Value] with the actual values generated below.*
