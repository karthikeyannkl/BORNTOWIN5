# BORNTOWIN5 Dynamic Final

Original Admin and Member UI retained. Dynamic server APIs are connected.

- Member: Login with Mobile + OTP `123456`
- Registration: Joining PIN required
- First/root referral: `FIRST MEMBER`
- Admin password: `ADMIN`
- Admin password can be changed from the login screen
- Registration, members, verification, PINs, messages and referral levels use server-side JSON storage for testing
- Start: `npm install` then `npm start`
- Render: Build `npm install`, Start `npm start`

For production, replace JSON storage with PostgreSQL, secure sessions/authentication, real SMS OTP and persistent file storage.
