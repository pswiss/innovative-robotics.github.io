# Swissler Innovative Robotics Lab website

A single-page GitHub Pages site. All content comes from **`data/site.csv`**.

## Deploy
1. Push this folder to your repo (for `https://innovative-robotics.github.io/`, the repo `innovative-robotics.github.io`).
2. Settings -> Pages -> Deploy from branch -> `main` / root.
3. Settings -> Actions -> General -> Workflow permissions -> **Read and write**.

Preview locally: `python3 -m http.server` then open http://localhost:8000
(opening index.html directly will not work because the browser blocks loading the CSV).

## Editing site.csv
Columns: `type,name,position,photo,scholar,linkedin,text,url`. One row per item, in display order.

| type | fields used | what it does |
|---|---|---|
| `site` | name, photo (logo file), text | Lab name, nav logo, hero headline |
| `intro` | text | A paragraph in the Introduction |
| `link` | name, url | Button under the intro (first is solid) |
| `image` | photo, text | Group photo + caption |
| `video` | name, url | Embedded YouTube video (embed, watch or youtu.be URLs all work) |
| `press` | name, text (source label), url | Media/press link |
| `member` | name, position, photo, scholar, linkedin | Lab member card |
| `contact` | name (label), text (value), url (optional link) | Contact line |
| `funder` | name, photo, url | Logo in the Funding strip |

Photos: put every file named in the `photo` column into `images/`. If a photo is missing, the card shows initials.

## Research list (Google Scholar)
Google Scholar has no public API and blocks browsers from reading it directly, so the list is refreshed by a
GitHub Action (`.github/workflows/update-publications.yml`) every Monday, on demand (Actions tab -> Run workflow),
and whenever `site.csv` changes. It reads the `scholar` column of each `member` row, merges and de-duplicates the
publications, and commits `data/publications.json`, which the page loads each visit.

Paste a member's profile URL (e.g. `https://scholar.google.com/citations?user=XXXXXXXXXXXX`) into their `scholar` cell.
The Scholar link also appears on their card. If Scholar blocks the runner, the previous list is kept.
