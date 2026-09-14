# BORNTOWIN5 Dynamic Test Project

This package converts the existing two-page BORNTOWIN5 UI into a Node.js/Express dynamic test application.

## Current test behavior
- Member login: Mobile Number + OTP
- Testing OTP: `123456`
- Admin password: `ADMIN`
- Registration and PIN usage are server-side API operations
- Random `B5-XXXXXX` Member IDs and PINs
- Referral chain API up to 7 levels
- Admin PIN generation/assignment, member search, messages and tree
- Data is stored in `data/db.json` for local testing.

## Run locally
```bash
npm install
npm start
```
Open `http://localhost:3000/member.html` and `http://localhost:3000/admin.html`.

## Render
Create a Web Service from this repository and use:
- Build Command: `npm install`
- Start Command: `npm start`

Important: the included JSON file is suitable for testing only. Render's free service can restart/redeploy and local filesystem data should not be treated as permanent production storage. Before production, replace the JSON store with PostgreSQL, add secure sessions/authentication, real SMS OTP, and protected file storage.
