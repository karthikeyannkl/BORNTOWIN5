BORNTOWIN5 + LEVELTRACK DYNAMIC SERVER V2

Files:
- admin.html
- member.html
- leveltrack-admin.html
- leveltrack-member.html
- server.js
- package.json

Deploy:
1. Keep the existing data/db.json on the server. Do NOT delete it.
2. Replace/add the HTML files and server.js from this package.
3. Run: npm install
4. Run: npm start

Dynamic connection:
- BORNTOWIN5 and LevelTrack use the same server and same data/db.json.
- Admin/member messages use the same messages store.
- Member registration and PINs use the same PIN store.
- Member approval assigns Level 1 membership ID.
- LevelTrack upgrade request -> admin assignment -> member UTR -> receiver acceptance -> admin verification -> final level activation are stored server-side.
- LevelTrack Admin and Member read the same server data.

First registration PIN:
B5-FMUXNF
The server automatically creates this PIN only when the database has no members and the PIN is absent. Existing member/PIN data is preserved.

Important:
This package is code-level integrated. Live hosting still needs npm install and deployment on your actual server. Do not replace an existing production database with an empty one.
