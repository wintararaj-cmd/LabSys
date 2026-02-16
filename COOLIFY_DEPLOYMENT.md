# LabSys Deployment Guide (Coolify)

This guide walks you through deploying the LabSys application using [Coolify](https://coolify.io), a self-hosted platform that makes deploying apps as easy as Vercel/Heroku.

## Prerequisites

1.  **A VPS (Virtual Private Server)**:
    -   Minimum: 2 vCPU, 4GB RAM (needed for building and running Puppeteer/Chromium).
    -   Recommended: Hetzner, DigitalOcean, or AWS EC2.
    -   OS: Ubuntu 22.04 LTS (fresh installation).
2.  **A Domain Name**: Pointed to your VPS IP address (A Record).

## Step 1: Install Coolify

SSH into your VPS and run the following command (check [coolify.io](https://coolify.io) for the latest command):

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Once installed, visit `http://<your-vps-ip>:8000` to access the Coolify dashboard. Create your admin account.

## Step 2: Create a Project

1.  Go to **Projects** -> **New Project**.
2.  Name it "LabSys" or similar.
3.  Select **Production**.

## Step 3: Add Database (PostgreSQL)

1.  Inside your project environment, click **+ New Resource**.
2.  Select **Database** -> **PostgreSQL**.
3.  Name it `labsys-db`.
4.  **Important**: Note down the credentials (User, Password, Database Name), or let Coolify generate them.
5.  Wait for the database to start (Status: Running).
6.  Copy the **Internal Connection String** (usually starts with `postgres://...`). You will need this for the application.

## Step 4: Add Application (Git Source)

1.  Click **+ New Resource**.
2.  Select **Application** -> **Public Repository** (or Private if you linked GitHub).
3.  Enter your repository URL: `https://github.com/wintararaj-cmd/LabSys`.
    -   Branch: `main`
4.  Click **Check Repository**.
5.  **Build Pack**: Select **Dockerfile**.
    -   Coolify detects the `Dockerfile` in the root automatically.

## Step 5: Configure Application

Before deploying, you must configure the environment variables.

1.  Go to the **Environment Variables** tab of your new application.
2.  Add the following variables:

    | Key | Value | Description |
    | :--- | :--- | :--- |
    | `NODE_ENV` | `production` | Optimizes React/Express for production. |
    | `PORT` | `5000` | The port the container listens on. |
    | `DATABASE_URL` | `<Your Postgres Internal URL>` | Paste the internal DB URL from Step 3. |
    | `JWT_SECRET` | `<Random Long String>` | Generate a secure random string for tokens. |
    | `PUPPETEER_EXECUTABLE_PATH` | `/usr/bin/google-chrome-stable` | **Critical**: Tells Puppeteer to use the installed Chrome. |
    | `ADMIN_EMAIL` | `admin@labsys.com` | (Optional) Initial Admin Email. |
    | `ADMIN_PASSWORD` | `yourpassword` | (Optional) Initial Admin Password. |

3.  (Optional) Add other variables from your `.env` like `SMTP_HOST`, `AWS_ACCESS_KEY`, etc. if used.

4.  Go to **Configuration** (General) tab:
    -   **Port**: `5000` (Make sure this matches the EXPOSE in Dockerfile).
    -   **Domains**: Set your domain (e.g., `https://lab.yourdomain.com`).

## Step 6: Deploy

1.  Click **Deploy** in the top right.
2.  Click **Show Logs** to watch the build process.
    -   It will: Install dependencies -> Build React App -> Install Server Deps -> Build Docker Image.
    -   This step might take 3-5 minutes depending on your VPS speed.

## Step 7: Verification

Once the deployment shows "Healthy":

1.  Visit your domain (e.g., `https://lab.yourdomain.com`).
2.  You should see the Login screen.
3.  Since this is a fresh deployment, the `migrate.js` script in the Dockerfile will have run:
    -   It initialized the database tables.
    -   The default login might not exist if you don't have a seeder, usually you need to Register or manually insert an admin via the database UI in Coolify.

## Troubleshooting

-   **Deployment Fails during Build**:
    -   Check if your VPS has enough RAM. Building React + Docker + Chrome needs at least 2GB-4GB.
    
-   **App Starts but "502 Bad Gateway"**:
    -   Verify `PORT` is set to `5000` in Coolify configuration.
    -   Check logs: ensure `Server running on port 5000` is printed.
    
-   **Report PDF Generation Fails**:
    -   Ensure `PUPPETEER_EXECUTABLE_PATH` is set to `/usr/bin/google-chrome-stable`.
    -   This tells the app to use the Chrome installed in the Dockerfile instead of trying to download one.
