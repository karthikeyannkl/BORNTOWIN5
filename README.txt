BORNTOWIN5 Level Tracking – V26 Dynamic Test

Files:
- index.html  : test launcher
- admin.html  : uploaded V26 Admin design
- user.html   : uploaded V26 User design

Testing:
1. Open index.html or upload the whole folder/ZIP to your static host.
2. Open Admin and User in separate tabs.
3. Both files use the same LocalStorage key:
   LT_SEQUENTIAL_UPGRADE_TEST_V26
4. User can add test referrals, request upgrade, enter UTR.
5. Admin can send payment details and final-approve after receiver confirmation.
6. RESET TEST DATA clears the local test state.

This is a front-end dynamic test build. It does not connect to a server/database.
