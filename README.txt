BORNTOWIN5 + LEVELTRACK SERVER DYNAMIC PACKAGE

Files:
- admin.html              BORNTOWIN5 Admin + LevelTrack Admin menu
- member.html             BORNTOWIN5 Member + LevelTrack Member menu
- leveltrack-admin.html   Server-connected LevelTrack Admin Portal
- leveltrack-member.html  Server-connected LevelTrack Member Portal
- server.js               BORNTOWIN5 + LevelTrack API/backend
- package.json             Express dependency

IMPORTANT:
1. Keep the existing server data/db.json. Do NOT replace/delete it if you already have live members, PINs and messages.
2. Replace the existing admin.html, member.html and server.js with these files.
3. Add leveltrack-admin.html and leveltrack-member.html to the same server folder.
4. Run: npm install
5. Run: npm start
6. Open the site through the server URL, not by opening the HTML file directly.

LevelTrack data is stored in the same data/db.json under:
levelTrack.requests
levelTrack.upgrades
levelTrack.incomingPayments

BORNTOWIN5 messages are reused by LevelTrack Notifications, so Admin messages sent through /api/admin/message appear for the logged-in member.

This package uses the existing BORNTOWIN5 password/OTP pattern. For production financial use, add proper server-side authentication, HTTPS, access control and a production database before going live.
