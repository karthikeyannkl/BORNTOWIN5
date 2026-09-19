BORNTOWIN5 + V26 Level Tracking Integration

What changed:
- Kept the existing BORNTOWIN5 Admin and Member UI/API code.
- Removed the old Level Tracking submenu items from the unified Admin and Member menus.
- Added ONE Level Tracking menu button on each side.
- That single button opens the exact V26 Admin/User Level Tracking files supplied for this test, embedded directly in the page.
- V26 test flow uses its shared LocalStorage key, so Admin and User V26 test pages can exchange test state when opened in the same browser origin.

Files to replace:
- admin.html
- member.html

Important:
This is a front-end integration test build. It keeps the existing server/API code in admin.html and member.html; the V26 module itself is the supplied front-end LocalStorage test flow.
