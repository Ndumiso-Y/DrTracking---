# Vendored libraries

The tracker loads these two files from this folder instead of from public CDNs. A page with a sign-in
form should not run code that an outside server can change, and the tracker now also works when those
CDNs are blocked or down.

| File | Package | Version | Licence | SHA-256 |
|---|---|---|---|---|
| `supabase.js` | `@supabase/supabase-js` (`dist/umd/supabase.js`) | 2.119.0 | MIT | `a867edbcfb029370aeec7223dd6180b560b621fbe3bc64c6584fb0369d1b7bce` |
| `lucide.min.js` | `lucide` (`dist/umd/lucide.min.js`) | 0.577.0 | ISC | `0d4402f4813c6ea9d57db2b1cd7af54864e1a49aea5f1873635ed5a819df904b` |

Both files are unmodified copies from the npm packages. To update one, replace the file with the same
path from a newer package version, update this table, and run the tests in `qa/`.
