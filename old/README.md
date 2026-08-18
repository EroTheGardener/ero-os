# Retired modules

These are the four sections that used to sit beside Financials in the
pill bar at the bottom of the screen: the Ero OS board, Quote Studio, the
Delegate board, and the Work board. They were taken out on 2026-08-17.

Nothing here is loaded or built. The files sit in this folder untouched.

**Your data was not deleted.** Each of these still has its row in the
Supabase `app_storage` table, exactly as it was:

| Module      | Row key                |
|-------------|------------------------|
| Ero OS      | `ero-os-v1`            |
| Quote Studio| `gnws-quote-studio-v1` |
| Delegate    | `gnws-delegate-v1`     |
| Work        | `gnws-work-v1`         |

There is also a file copy of all of it in `~/ero-os-backup/`.

## Bringing one back

Move the file back into `src/`, then in `src/main.jsx` import it and
render it. Ask Claude to do it and point at this note.

## One thing to know

Financials still reads the Work board's row (`gnws-work-v1`) for the
upcoming income and costs on its dashboard. That row is still in the
database, so those numbers keep working, but nothing updates it now that
the Work board is gone. It is frozen at what it held on 2026-08-17.
