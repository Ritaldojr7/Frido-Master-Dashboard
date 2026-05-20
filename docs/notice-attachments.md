# Notice attachments

Staff and ISD NM notices can include up to **5 attachments** (PDF, PNG, or JPEG — 3 MB each). Files are stored in **Supabase Storage** when configured, or on local disk under `server/data/notice-attachments` for development.

## Supabase setup

1. In Supabase → **Storage**, create a bucket named `notice-attachments` (or set `SUPABASE_NOTICE_BUCKET`).
2. Keep the bucket **private** (no public read).
3. Add to Render / local `.env`:
   - `SUPABASE_URL` — project API URL
   - `SUPABASE_SERVICE_ROLE_KEY` — service role key (never expose to the browser)

4. Deploy/restart the API so `notice_attachments` table is created (boot migration).

## Admin workflow

- **New notice:** attach PDFs or images in the modal; audience receives email (Microsoft Graph) with embedded files when size allows, plus in-app popup.
- **Edit notice:** change text and/or attachments; saving **always** re-emails the audience and **re-shows** the login popup (acknowledgements reset).

## Email limits

Microsoft Graph `sendMail` has a practical per-attachment size limit (~3 MB). Larger or many files may be sent as **download links** in the email body instead of attachments.
