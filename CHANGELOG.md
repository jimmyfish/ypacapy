# Changelog

All notable changes to ypacapy are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- **MongoDB.** Connect with a host and port, a seed list or an SRV record (`mongodb+srv`), or paste a `mongodb://` URL. Includes the auth database, TLS (with a CA file, or a client certificate for X.509 sign-in), replica set, read preference, direct connection and how often the driver checks the servers. The password stays in the macOS login keychain.
- **Collections open on a query bar.** Filter, Project and Sort take mongosh values over several lines (`ObjectId()`, `ISODate()`, `/regex/` and unquoted keys included), with Skip and Limit beside Run. Each box is read before anything is sent, so a typo never reaches the server. No sort is added that you did not ask for. Open in console turns the bar into a `db.<collection>.find(…)` query.
- **Documents as a table or as JSON.** The table has one column per top-level field, typed by BSON (`objectId`, `date`, `decimal128` …), and says how many documents have each field. A missing field is hatched, not shown as null. The JSON view prints the documents as mongosh does. Copy and export as mongosh, Extended JSON, CSV or Markdown.
- **Fields and Indexes.** Fields lists the dotted paths seen in the documents on the page; ypacapy does not sample the collection. Indexes shows keys, uniqueness and options (sparse, TTL, partial, hidden).
- **Collection Info.** From a collection's menu: the document count kept by the server, data and on-disk sizes, compression, each index's size, the collection type and its validator. Read once with `$collStats` when it opens, and again on Refresh.
- **mongosh console.** `db.orders.find({ … }).sort({ … }).limit(50)`, `aggregate`, `countDocuments`, `distinct`, the write methods, `createIndex`, `runCommand` and `.explain()`. The text is parsed, never run as JavaScript. A find or aggregate without a limit gets the row limit, and `maxTimeMS` stops a slow query on the server.
- **Write guard for MongoDB.** Low and Strict ask about kinds of write method (insert, update, delete, findAndModify, `$out`/`$merge` in an aggregate, drop, create, rename, users) and show the method that will run. A `runCommand` ypacapy does not know asks too.
- **Duplicate a connection.** From a connection's menu on Home. The copy is named `<name> copy`, sits in the same group and gets its own keychain item holding the same password, so it connects as it is.

### Changed

- **One menu per connection on Home.** Edit, Duplicate, Move to group and Remove now live behind a single ⋮ button on each card. Remove shows a shredder, since it deletes the connection, its keychain password and its history for good.
- **Lucide icons 1.75.0** (from 0.460.0), in the app and in the design preview. GitHub's mark, which Lucide no longer ships, is kept locally.

## [0.0.1] - 2026-11-18

First release.

### Added

- **PostgreSQL, MySQL/MariaDB and SQLite.** Connect with host, port, database and user, or open a SQLite file in place. Includes SSL modes (`disable` to `verify-full`, with a CA file), a connect timeout, the PostgreSQL `application_name` and a connection test.
- **Home with connection groups.** Connections show as coloured tiles in named groups you can fold, rename or ungroup. `⌘F` finds a connection.
- **Schema tree.** Databases, schemas, tables, views, materialized views, foreign tables and functions load on demand. Row counts are planner estimates, never `count(*)`.
- **SQL console.** `⌘↵` runs the selection or, with nothing selected, the statement at the cursor up to the next `;`. `⇧⌘↵` runs the whole editor. Run shows a play icon and its shortcut, and turns into a spinner while a query runs. Save sits before Run and reads "Saved" with a green check when nothing is unsaved. Also: autocomplete for tables, aliases and columns, Format, `⌘/` comment toggle, cancel, and a statement timeout that stops the query on the server.
- **Row limit.** The row limit from Settings is added to queries without a `LIMIT`. Results that cannot take a limit are capped at 10,000 rows.
- **Result grid.** Sorting, frozen key columns, typed cells (numbers, timestamps, booleans, JSON, bytes), a cell inspector, copy, and export as CSV, JSON, Markdown table or plain text.
- **Inline row editing.** Edit or delete rows of a single-table result that has its full primary key. `⌘S` writes all changes in one transaction. If any statement does not change exactly one row, nothing is kept.
- **Table view.** Rows with a `WHERE` filter and paging, plus columns, indexes and foreign keys.
- **Write guard with security levels.** Each connection has a level: None runs every statement, Low asks to confirm, Strict asks for the app passphrase or Touch ID. You pick the statement kinds each level asks about. The level shows in the tabs bar as a tinted pill: grey for None, orange for Low, red for Strict. Statements are classified from the parsed SQL, never by regex.
- **Unlock window.** A Strict connection can stay unlocked for a set time after the passphrase. Lowering a Strict connection needs the passphrase. A forgotten passphrase can be reset with Touch ID or the macOS login password.
- **Tabs restored after exit.** Each connection's open tabs, including unsaved SQL, come back when it is opened again. Tabs are coloured by connection.
- **Tabs bar.** Open a query tab with the `+` after the tabs or `⌘T`. With many tabs open, tabs shrink to a minimum width, then the row scrolls sideways (a mouse wheel works too) and fades at the edge where more tabs are hidden.
- **Pinned tabs.** Right-click a tab and choose Pin tab. A pinned tab moves to the left of the row and shows a pin where its close button was; click the pin to unpin it. Pinned tabs, table tabs included, come back after a restart and after you close and reopen the connection. A pinned tab can't be closed, with `⌘W` or otherwise, until you unpin it.
- **History and saved queries.** History is kept per connection: the last 2,000 runs, searchable and clearable. Saved queries are kept in folders.
- **Settings.** General, Appearance, Queries, Security, Data on this Mac and Updates. Includes the ypacapy Light/Dark themes, built-in colour schemes (including Xcode Light and Xcode Dark), compact mode, and UI, table and code fonts from the fonts installed on the Mac.
- **Connection heartbeat.** An optional `select 1` on idle PostgreSQL and MySQL connections, for servers that drop idle sessions. It is off by default and can be overridden per connection.
- **Local-only storage.** Settings and connections are kept in `~/.config/ypacapy`. Passwords and the passphrase hash are kept in the macOS login keychain, never in a file and never synced to iCloud.
- **In-app updates.** Signed updates from GitHub Releases, with release notes in the title-strip update chip and the About dialog. Check for Updates… is in the app menu.
- **About dialog.** Shows the version, the update state and, in dev builds, the git commit, branch and tag.
- **Release pipeline.** GitHub Actions builds Apple silicon and Intel bundles from a version tag into a draft release, with `latest.json` for the updater. The notes are taken from this file.

[0.0.1]: https://github.com/jimmyfish/ypacapy/releases/tag/v0.0.1
