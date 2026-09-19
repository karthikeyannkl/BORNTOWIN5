MAGIZH MASTER FINAL V2

Flat root package. No nested module folders.

CUSTOMER
- index.html = Master customer login/register/dashboard/profile
- First test Activate PIN: B5-FMUXNF (one-time; consumed on first registration)
- OTP test: 123456
- Products/Referral/Level pages open original module functionality without a second login.

ADMIN
- admin.html = Master Admin Login
- Admin ID: admin
- Password: ADMIN
- Product opens original Product Admin without second login.
- Referral opens original Referral Admin menu/functionality, including PIN Management, Admin PIN Report, Members, Search, Referral Tree, Settings and LevelTrack portal.
- Level Tracking opens original LevelTrack Admin.

LOCKED RULE
Existing module functionality/options/workflows are preserved. Integration shims only bypass duplicate login and pass the master member/admin identity. Visual design can be changed later without changing module logic.

RUN
npm install
npm start
Open / for customer and /admin.html for admin.
