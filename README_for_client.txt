MDC Tool - Quick Upload Guide
=============================

1) Initial upload
- Upload and extract `mdc_tool_ready_to_upload.zip` on your server.
- Confirm it creates a folder named `mdc_tool`.
- Open in browser:
  https://YOUR-SERVER-ADDRESS/mdc_tool/

2) How to update the CSV data
- Go to this folder on the server:
  mdc_tool/questions/
- Replace only the CSV files you need to update.

Important rules:
- Do NOT rename files.
- Keep the first row (headers) exactly as it is.
- Keep comma-separated format (CSV).
- Save files in UTF-8.

3) After uploading updated CSV files
- Refresh the page in the browser.
- If changes do not appear, do a hard refresh (Ctrl+F5 or Cmd+Shift+R).

4) If something looks wrong
- Re-check that file names and headers were not changed.
- Re-upload the previous CSV backup if available.
