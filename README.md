# HYPERSCREEN

Static site for the paper and hosted model files. Repository: **HYPERSCREEN** on GitHub.

## Connect this folder and push

If you have not added a remote yet:

```bash
cd "/Users/ctang/Desktop/Sapru Lab Materials/ML PAPER/Website"
git remote add origin https://github.com/ctangtyy/HYPERSCREEN.git
git push -u origin main
```

## GitHub Pages

1. In **HYPERSCREEN** on GitHub: **Settings → Pages → Build and deployment**.
2. Under **Source**, choose **GitHub Actions** (not “Deploy from a branch”).
3. Push to `main` or run the **Deploy to GitHub Pages** workflow manually (**Actions** tab → workflow → **Run workflow**).

After the first successful run, the site URL appears in the workflow summary and under Pages settings. For this repo: **https://ctangtyy.github.io/HYPERSCREEN/**

## Local preview

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000

## Deploy contents

The Pages workflow copies `index.html`, `.nojekyll`, `css/`, and `assets/` into the published site. If you add other top-level folders (for example `js/` or `images/`), add them to the **Prepare static output** step in `.github/workflows/pages.yml`.
