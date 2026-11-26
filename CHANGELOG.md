# Changelog

All notable changes to ypacapy are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- **Task manager.** See what ypacapy is running on every open connection, and stop it. While nothing runs, the title strip shows an Activity button that opens the Task manager. Once a query has run for 0.8 s, a chip takes its place showing how many are running and how long the oldest has gone. Click the chip for a popover of the runs: each shows its connection, tab and query text, with Stop and Stop all. The Task manager dialog shows the same runs as a table. `⌥⌘A` opens the popover while something runs and the dialog when nothing does. Stop is the result pane's Cancel (`pg_cancel_backend`, `KILL QUERY`). Writes get a tag, and a note says what stopping does: PostgreSQL and MySQL roll back the statement they're on, and MongoDB may still finish the write. The list comes from ypacapy's own tabs, so nothing is asked of the server.
- **Pin connections on Home.** Pin to top in a card's menu puts the connection in Pinned, above every group. Unpin takes it back. Dragging a card onto Pinned pins it, and dragging it out unpins it. A pinned connection stays in its group (Open all, rename and ungroup still include it), and its card names that group. Duplicating a connection doesn't copy the pin.
- **Drag tabs to reorder them.** A pinned tab moves among the pinned ones, and the others move after them. The other tabs slide aside to show where it lands. The row scrolls when you hold the tab near an edge, and `Esc` puts the tab back.
- **Close several tabs at once.** A tab's right-click menu adds Close other tabs, Close tabs to the right and Close tabs to the left. Each is greyed out when there's nothing to close. Pinned tabs stay open. One ask covers every tab with unsaved changes among them.

### Changed

- **Empty states redesigned.** Panes, lists and dialogs with nothing to show share one look: a mark, a title, one line, and the way out as a button. The colour says why it's empty: nothing there yet, a read that came back empty, or a filter that found nothing (its chip clears the filter). The capy greets you when there are no connections or no tab open, and No tab open offers New query (`⌘T`).

## [0.1.2] - 2026-11-25

### Added

- **Edit a table's columns.** On a table tab's Columns view (PostgreSQL, MySQL/MariaDB, SQLite), click a cell to rename a column or change its type, nullable or default. The shredder marks a column to drop, and Add column adds one. Changed cells are green and a dropped column is red until you apply or discard. Your changes stay while you're on another tab, and closing the tab asks first. Review SQL (`⌘S`) shows the exact `ALTER` statements and warns about table rewrites, a column becoming `NOT NULL` (it fails if any row holds null), a new `NOT NULL` column with no default on PostgreSQL, and keys or indexes that go with a dropped column. Apply runs them through the write guard: on Strict it asks for the passphrase (or Touch ID) right there. PostgreSQL and SQLite run them in one transaction; MySQL gets one `ALTER`, which restates each changed column's charset, `auto_increment`, `ON UPDATE`, `INVISIBLE` and comment so it keeps them. If anything fails, nothing changes and your edits stay. The one exception is a MySQL `ALTER` stopped by the statement timeout: the server may still finish it, so refresh the columns to see where it ended up. SQLite can only rename, add and drop columns, so the other cells are locked there, and it won't drop a column that's a key or indexed. MySQL generated columns are locked, and MySQL won't drop a column while a foreign key uses it. Open in a console instead puts the SQL in a new query tab.
- **Edit Redis keys in their tab.** A string's Edit opens its value in a text box (pretty JSON when it's JSON) and Save writes `SET … KEEPTTL`, so the expiry stays. JSON that was compact goes back compact, and numbers are kept exactly as written. In a hash, double-click a value to change it, or press `⌘⌫` to mark a field for deletion. Save writes them with `HSET` and `HDEL`. Refresh or another page asks before it reads over unsaved hash changes. Click the expiry in the key's head to set it (`EXPIRE`, in seconds, minutes, hours or days) or remove it (`PERSIST`). Every write goes through the write guard, the ask shows the exact command, and the command lands in History. Values with raw bytes (shown as `\xHH`) and strings longer than the 1 MB read are locked.

### Changed

- **Dialogs ease in and out.** A dialog fades and rises in over a blurred backdrop, and fades out when it closes, however it closes. Reduce motion in macOS turns it off.
- **A single-column result hugs its column** (a count, a list of ids) instead of stretching across the pane.
- **MySQL defaults show as SQL** in a table's Columns view: `'pending'` instead of `pending`, and an expression in parentheses. A MariaDB column with no default says none instead of `NULL`.
- **Dev builds keep their own workspace.** `bun tauri dev` uses `~/.config/ypacapy_dev` and the Keychain service `ypacapy_dev`, so hacking on the app never touches your real connections or passphrase.

### Fixed

- **A string's JSON view no longer rounds big numbers.** It used to show `12345678901234567890` as `12345678901234567000`.
- **The editor's caret stays on its line.** WebKit drew it a little higher on every line further down. The caret is now drawn by the editor itself, the same height on every line.
- **The editor's focus ring shows over its lines.** The caret line's band used to cover it.

## [0.1.1] - 2026-11-20

### Added

- **Warnings per connection.** A SQL query that can return more than 100 rows (its own LIMIT, the row limit ypacapy adds, or nothing limiting it), and an `UPDATE` without `WHERE`, ask before they run. They ask at every security level, None included; at Strict the passphrase ask carries them. Settings › Security › Warnings sets them for every connection (on by default); a connection can follow that or pick On or Off. The warnings are not behind the passphrase, Strict included. Table tabs do not warn about size.
- **Keep query history per connection.** Use Settings, On or Off, so a production connection can keep its runs out of History.
- **Connection settings in Settings.** Opened from a connection tab, Settings starts with that connection's own Security (level, what it asks about, warnings) and Queries (row limit, timeout, history, heartbeat), above the app-wide ones under Global. Opened from Home, only Global shows.
- **Connection status.** With the heartbeat on (for the connection or in Settings; SQLite is never pinged), each connection tab in the title strip shows a green dot when the server answers, a red one when it doesn't, and a turning icon while it connects or reconnects. The foot of the sidebar says Connecting, Connected, Disconnected or Reconnecting.
- **Dropped connections come back on their own.** A connection that a run lost, or that stops answering the heartbeat, is opened again on a later heartbeat once the server answers. Each check waits up to 10 s. While it's down, a bar over the work area says since when and offers Reconnect. A run that lost the connection says so in its own results, with a note that the heartbeat keeps trying. Redis gets a fresh connection in place of one that stopped answering.
- **Edit MongoDB documents in place.** In a collection tab's JSON view each document has Edit, Duplicate, Copy and Delete. Edit changes values, field names and types, adds or removes fields, and undoes one change at a time; double-click a value to start. `_id` stays fixed. Update, Insert or Delete sends one `updateOne`, `insertOne` or `deleteOne` on the document's `_id` through the write guard, and the ask shows the exact command. Values that can't be written back yet (binary data that isn't a UUID, the deprecated types) are locked.
- **Add document.** Add document on a collection tab (also offered by an empty collection) opens a blank document at the top. Example from fields fills it with the fields seen on the page, each with an empty value of its type. Nothing is read from the server for it.
- **Rows per page on table and collection tabs.** A picker in the pager sets the page size for that tab (50 to 1,000, plus the row limit) and reads from the first page again. Settings stay as they are.
- **Pages in the console.** When ypacapy added the row limit to a query (SQL, or a MongoDB find or aggregate), Next and Previous read the next or previous page of the same query. Pages don't warn about size again and stay out of History. Without an `ORDER BY` (or a sort), a hint says rows can shift between pages.
- **Collection pager with a total.** It reads `1 – 20 of ~N`. With no filter, N is the estimate from the collection's metadata, never counted. With a filter, click count to run one `countDocuments` for it; the number stays until the filter changes. Refresh reads the page again.

### Changed

- **MongoDB documents open as JSON.** Collection tabs and console results show JSON first, as one card per document. Objects and arrays start folded and say their size, with a peek inside; click a line to open it, or Expand all on the card. Copy and Export work from the JSON view too.
- **Project, Sort, Skip and Limit fold under Options** in a collection's query bar, with a count of the ones set. A box with an error opens it. In a narrow window the buttons of the query bar, and of a Redis key tab, turn into icons.
- **Paging goes until an empty page.** Table, collection and console pages keep Next on until a page comes back empty, since nothing is counted. An empty page keeps the columns of the last page.
- **Settings › Updates redesigned.** The capy soaks in its onsen as in About, with the version, a status pill, one line of detail and the action under it, plus a progress bar while an update downloads.
- **Friendlier wording across the app.** One name per thing (Cancelled, Discard, Refresh, Pick tables, Engine, Open as a query, Use Global, Allow Touch ID, Unlock), no colon reveals or "X, not Y" lines, and engine-neutral messages where they fit. The copy is casual now, and messages where the app speaks for itself call it Capy ("Capy doesn't run JavaScript…"). The About tagline is now "A hot spring for your databases."
- **Settings keeps a minimum height,** so a short pane does not shrink the window.
- **New passphrase asks for Strict connections.** Lowering from Strict (tabs bar, Settings, the connection dialog) shows the level it leaves and the one it goes to and what that means for writes; Change shows what it unlocks. Both have a show/hide passphrase field, a Caps Lock hint, Touch ID when the connection allows it, and Abort beside the action. Picking None or Low on a locked Strict connection asks right there instead of needing Change first.
- **Lowering the default security level from Strict asks for the passphrase.** Settings › Security › Default security level for new connections now uses the same ask as lowering a connection.
- **Passphrase dialogs redesigned.** Set, Change, Reset and Disable passphrase share the same look: a badge, what the action does (Disable lists what turns off and what stays), show/hide on every field, a Caps Lock hint, "They match" / "They differ" while typing the new one twice, and Abort beside the action. While the app checks, the action (or Use Touch ID) shows a turning loader instead of only greying out.
- **Confirm, rename and write-guard asks redesigned.** They now look like the passphrase asks. A badge says what kind of ask it is: red when something goes for good, amber when something is lost or risky, blue when nothing is. Under the question is one line on why, and the action says what it does (Remove, Rename, Move, Run KEYS) instead of OK. Remove connection lists what goes and what stays. Closing a changed tab or discarding row edits shows the tab itself: a query's first line, a saved query's folder, a table's schema. The write guard puts the statements, and for a document edit the exact command, in one card, lists warnings as rows, and asks a Strict connection for the passphrase with Touch ID under it. Save and close and Use SCAN instead sit under an "or".

### Fixed

- **Closing a connection tab no longer waits.** Its pools close in the background, so a query still running or the MongoDB driver's shutdown doesn't hold the tab up. Opening it again gets a fresh pool.

## [0.1.0] - 2026-11-19

### Added

- **MongoDB.** Connect with a host and port, a seed list or an SRV record (`mongodb+srv`), or paste a `mongodb://` URL. Includes the auth database, TLS (with a CA file, or a client certificate for X.509 sign-in), replica set, read preference, direct connection and how often the driver checks the servers. The password stays in the macOS login keychain.
- **Collections open on a query bar.** Filter, Project and Sort take mongosh values over several lines (`ObjectId()`, `ISODate()`, `/regex/` and unquoted keys included), with Skip and Limit beside Run. Each box is read before anything is sent, so a typo never reaches the server. No sort is added that you did not ask for. Open in console turns the bar into a `db.<collection>.find(…)` query.
- **Documents as a table or as JSON.** The table has one column per top-level field, typed by BSON (`objectId`, `date`, `decimal128` …), and says how many documents have each field. A missing field is hatched, not shown as null. The JSON view prints the documents as mongosh does. Copy and export as mongosh, Extended JSON, CSV or Markdown.
- **Fields and Indexes.** Fields lists the dotted paths seen in the documents on the page; ypacapy does not sample the collection. Indexes shows keys, uniqueness and options (sparse, TTL, partial, hidden).
- **Collection Info.** From a collection's menu: the document count kept by the server, data and on-disk sizes, compression, each index's size, the collection type and its validator. Read once with `$collStats` when it opens, and again on Refresh.
- **mongosh console.** `db.orders.find({ … }).sort({ … }).limit(50)`, `aggregate`, `countDocuments`, `distinct`, the write methods, `createIndex`, `runCommand` and `.explain()`. The text is parsed, never run as JavaScript. A find or aggregate without a limit gets the row limit, and `maxTimeMS` stops a slow query on the server.
- **Write guard for MongoDB.** Low and Strict ask about kinds of write method (insert, update, delete, findAndModify, `$out`/`$merge` in an aggregate, drop, create, rename, users) and show the method that will run. A `runCommand` ypacapy does not know asks too.
- **Redis.** Connect with host, port, user (ACL) and a database number, or paste a `redis://` or `rediss://` URL. Includes TLS (with a CA file or a client certificate), the client name and a connect timeout. A connection shows its own database only, 0 unless it names another. The password stays in the macOS login keychain.
- **Keys in the sidebar.** Keys are read with `SCAN`, about 1,000 at a time and more only on Scan more; ypacapy never sends `KEYS` on its own. They sit in folders on the key separator (`:` by default, set per connection), with a type badge and a timer on keys that expire. The TTLs come with the scan, in the same pipeline as `TYPE`. Expiring only narrows the tree to keys with a TTL. Enter in the filter scans the database for keys that match.
- **Key tabs.** A key opens on its type, length and TTL over one page of its value: a hash's fields (`HSCAN`, with a pattern), a list's items, a set's members, a sorted set's members by score, a stream's newest entries, or a string as text or pretty JSON. Info reads its encoding, sampled memory and idle time when it opens.
- **redis-cli console.** One command per line, quoted as redis-cli quotes, `#` for comments. Replies show as a table (pairs for `HGETALL` and `WITHSCORES`, a column per field for stream entries, the fields of `INFO`) or as redis-cli prints them. A `WRONGTYPE` error offers the command that reads the key's real type. `SELECT`, transactions and subscriptions are not sent. Cancel and the command timeout stop the wait and open a fresh connection, since Redis cannot stop a command it started.
- **Write guard for Redis.** Low and Strict ask about commands, grouped by what they write to (strings, hashes, lists, sets, sorted sets, streams, keys, expiry, flush, scripts, server), plus `KEYS`, which holds the server while it reads every key. Its ask offers Use SCAN instead. A command ypacapy does not know asks too.
- **Asks say when something cannot be undone.** The write guard, Remove connection, Clear history and Delete saved query say so in red, with the shredder on the button, when what they do deletes or overwrites data.
- **ER diagrams.** Show diagram on a schema, or on a table for that table and the tables it links to (PostgreSQL, MySQL/MariaDB, SQLite). A picker chooses the tables to draw, with a filter, Select all, Unselect all and Add linked tables. Only the ticked tables are read, from the catalog only. Tables of other schemas that a picked table links to are drawn with a dashed border. Drag tables, pan and zoom; selecting a table marks its linked columns and the cardinality at each end. Ported from opengrip's diagram view (Apache-2.0).
- **Saved diagram layouts.** Save (`⌘S`) keeps a diagram's tables, box positions, zoom and column choice with the connection, so Show diagram reopens it as saved, also after a restart. Nothing is saved on its own: the toolbar shows Not saved or when it was last saved, and closing with changes asks (Cancel, Save and close, Close). Tables ticked after a save are placed to the right of the saved ones. A saved table that was altered keeps its place. Diagram tabs can't be pinned.
- **Diagram export.** PNG (filled or transparent background) or JPG, Mermaid `erDiagram` code, DBML for dbdiagram.io, and diagrams.net `.drawio` files. Files go through the save dialog. ypacapy never opens or sends anything to those sites.
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

[Unreleased]: https://github.com/jimmyfish/ypacapy/compare/v0.1.2...HEAD
[0.1.2]: https://github.com/jimmyfish/ypacapy/releases/tag/v0.1.2
[0.1.1]: https://github.com/jimmyfish/ypacapy/releases/tag/v0.1.1
[0.1.0]: https://github.com/jimmyfish/ypacapy/releases/tag/v0.1.0
[0.0.1]: https://github.com/jimmyfish/ypacapy/releases/tag/v0.0.1
