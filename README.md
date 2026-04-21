# HYPERSCREEN

Static site for the paper and hosted model files.

## Site URL: https://hyperscreen.github.io/

GitHub’s org account for this project is **`hyperscreen`** (all lowercase in URLs). The user/org Pages repo must be named **`hyperscreen.github.io`**. That publishes the site at the **root**: **https://hyperscreen.github.io/**

The **hyperscreen** organization already exists on GitHub. The **`hyperscreen.github.io`** repository may still need to be created and wired up to this folder.

### Publish with one script (after you log in to GitHub CLI)

I cannot create the repo or push from this environment without **your** GitHub credentials. On your Mac, run once:

```bash
gh auth login
```

Then from this project:

```bash
cd "/Users/ctang/Desktop/Sapru Lab Materials/ML PAPER/Website"
./scripts/publish-to-hyperscreen-github-io.sh
```

That script creates **`hyperscreen/hyperscreen.github.io`** if it does not exist, adds a git remote named **`hyperscreen-io`**, and pushes **`main`**. You need permission to create repositories in the **hyperscreen** org (or ask an org owner to create an empty **`hyperscreen.github.io`** repo and run only the `git remote` / `git push` parts).

Then in that repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

This codebase does not need structural changes for that URL: paths like `css/style.css` stay root-relative.

### Manual remote (if you created the empty repo on the web)

```bash
cd "/Users/ctang/Desktop/Sapru Lab Materials/ML PAPER/Website"
git remote add hyperscreen-io https://github.com/hyperscreen/hyperscreen.github.io.git
git push -u hyperscreen-io main
```

---

## Mirror on personal account (optional)

**ctangtyy/HYPERSCREEN** is a **project** site: **https://ctangtyy.github.io/HYPERSCREEN/**

```bash
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
