# HYPERSCREEN

Static site for the paper and hosted model files.

## Site URL: https://hyper-screen-tool.github.io/

This project targets the GitHub org **`hyper-screen-tool`**. The user/org Pages repo must be named **`hyper-screen-tool.github.io`**. That publishes the site at the **root**: **https://hyper-screen-tool.github.io/**

### Publish with one script (after you log in to GitHub CLI)

On your Mac, run once:

```bash
gh auth login
```

Then from this project:

```bash
cd "/Users/ctang/Desktop/Sapru Lab Materials/ML PAPER/Website"
./scripts/publish-to-hyper-screen-tool-github-io.sh
```

That script creates **`hyper-screen-tool/hyper-screen-tool.github.io`** if it does not exist, adds a git remote named **`hyper-screen-tool-io`**, and pushes **`main`**. You need permission to create repositories in the **hyper-screen-tool** org (or ask an org owner to create an empty **`hyper-screen-tool.github.io`** repo and run only the `git remote` / `git push` parts).

Then in that repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

This codebase does not need structural changes for that URL: paths like `css/style.css` stay root-relative.

### Manual remote (if you created the empty repo on the web)

```bash
cd "/Users/ctang/Desktop/Sapru Lab Materials/ML PAPER/Website"
git remote add hyper-screen-tool-io https://github.com/hyper-screen-tool/hyper-screen-tool.github.io.git
git push -u hyper-screen-tool-io main
```

---

## Mirror on personal account (optional)

If you also use **ctangtyy/HYPERSCREEN.github.io** (or similar) as a project site, add **`origin`** and push as needed. Project sites use **`https://ctangtyy.github.io/<repo>/`**.

## Local preview

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000

## Deploy contents

The Pages workflow copies `index.html`, `.nojekyll`, `css/`, and `assets/` into the published site. If you add other top-level folders (for example `js/` or `images/`), add them to the **Prepare static output** step in `.github/workflows/pages.yml`.
