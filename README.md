# m-g2

*Automatically synced with your [v0.dev](https://v0.dev) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/pablotinf-8344s-projects/v0-m-g2-7j)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.dev-black?style=for-the-badge)](https://v0.dev/chat/projects/8bxeHxRL6yV)

## Overview

This repository will stay in sync with your deployed chats on [v0.dev](https://v0.dev).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.dev](https://v0.dev).

## Deployment

Your project is live at:

**[https://vercel.com/pablotinf-8344s-projects/v0-m-g2-7j](https://vercel.com/pablotinf-8344s-projects/v0-m-g2-7j)**

## Build your app

Continue building your app on:

**[https://v0.dev/chat/projects/8bxeHxRL6yV](https://v0.dev/chat/projects/8bxeHxRL6yV)**

## How It Works

1. Create and modify your project using [v0.dev](https://v0.dev)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository

## Local Development

1. Install dependencies with `pnpm install`.
2. Copy `.env.example` to `.env` and fill in the values below.

   ```
   DATABASE_URL=postgres://neondb_owner:npg_A0xHBt4NIUCq@ep-falling-glade-adoqeyb5-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
   JWT_SECRET=TxFEUjXbqEfbaawTVmdE
   JWT_EXPIRES_IN=1d
   CORS_ORIGIN=http://localhost:3000
   NEXT_PUBLIC_API_URL=http://localhost:3001/api
   ```

3. Start the API server with `node src/server.js`.
4. In another terminal run `pnpm dev` to start the Next.js app.
5. Login requests set an HTTP-only `token` cookie used for authentication.
6. Run tests with `pnpm test` (Vitest).
