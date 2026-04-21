# HYPERSCREEN

Static site for the paper and hosted model files.

## Site URL: https://HYPERSCREEN.github.io

GitHub only serves that address when **both** are true:

1. The **owner** of the repo is the GitHub user or organization named **`HYPERSCREEN`** (not your personal account name in the URL).
2. The **repository name** is exactly **`HYPERSCREEN.github.io`** (the special Pages name for the root site).

Then the site is published at the **root**: **https://HYPERSCREEN.github.io/** (no extra path).

### Set it up

1. On GitHub, create an **organization** named **HYPERSCREEN** (or use a user account named HYPERSCREEN if you prefer and the name is available).
2. Under that account, create a **new public** repository named **`HYPERSCREEN.github.io`** (case must match your account name’s casing rules).
3. Point this project at that repo and push `main`:

```bash
cd "/Users/ctang/Desktop/Sapru Lab Materials/ML PAPER/Website"
git remote remove origin   # only if you still have the old remote
git remote add origin https://github.com/HYPERSCREEN/HYPERSCREEN.github.io.git
git push -u origin main
```

4. In that repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

After the workflow succeeds, the live URL is **https://HYPERSCREEN.github.io/**

This codebase does not need structural changes for that URL: paths like `css/style.css` stay root-relative and work for a user/org Pages site.

---

## Current repo (personal account)

If you keep publishing from **ctangtyy/HYPERSCREEN** instead, the URL is a **project** site:

**https://ctangtyy.github.io/HYPERSCREEN/**

Connect / push:

```bash
cd "/Users/ctang/Desktop/Sapru Lab Materials/ML PAPER/Website"
git remote add origin https://github.com/ctangtyy/HYPERSCREEN.git
git push -u origin main
```

## Local preview

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000

## Deploy contents

The Pages workflow copies `index.html`, `.nojekyll`, `css/`, and `assets/` into the published site. If you add other top-level folders (for example `js/` or `images/`), add them to the **Prepare static output** step in `.github/workflows/pages.yml`.
