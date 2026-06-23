"""Build a branded, single-file HTML version of API_GUIDE.md.

Usage:
    python3 docs/build_html_guide.py

Outputs /app/docs/API_GUIDE.html. Open in any browser, print to PDF, email
as an attachment, or upload as a static asset. No external CSS/JS — fully
self-contained so the recipient sees the same thing you do.
"""
from __future__ import annotations

from pathlib import Path

import markdown

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "API_GUIDE.md"
OUT = ROOT / "API_GUIDE.html"

# --- Markdown → HTML ---
md = markdown.Markdown(
    extensions=[
        "fenced_code",
        "tables",
        "toc",
        "attr_list",
        "pymdownx.superfences",
    ],
    extension_configs={
        "toc": {"toc_depth": "2-3", "permalink": False},
    },
)
body_html = md.convert(SRC.read_text(encoding="utf-8"))
toc_html = md.toc

# --- Branded shell ---
TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Gazeal Surveys — API Integrator Guide</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;700;800&family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root {{
    --bg: #050505;
    --paper: #F7F4EE;
    --ink: #0B1220;
    --muted: #4A5260;
    --hairline: rgba(11,18,32,0.08);
    --brand: #025eba;
    --brand-light: #4FB6FF;
    --code-bg: #0B1220;
    --code-ink: #E8F0FB;
  }}
  * {{ box-sizing: border-box; }}
  html, body {{ margin: 0; padding: 0; background: var(--paper); color: var(--ink);
                font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
                line-height: 1.6; }}
  ::selection {{ background: rgba(2,94,186,0.25); }}

  .page {{ max-width: 920px; margin: 0 auto; padding: 0 32px 100px; }}

  /* Hero */
  header.hero {{
    background: #050505;
    color: #fff;
    margin: 0 -32px 60px;
    padding: 56px 32px 64px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    position: relative;
    overflow: hidden;
  }}
  header.hero::before {{
    content: ""; position: absolute; inset: 0;
    background: radial-gradient(60% 55% at 70% 0%, rgba(2,94,186,0.30) 0%, rgba(2,94,186,0) 60%);
    pointer-events: none;
  }}
  header.hero .inner {{ position: relative; max-width: 920px; margin: 0 auto; }}
  header.hero .eyebrow {{
    font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase;
    color: var(--brand-light); font-weight: 600; margin-bottom: 12px;
  }}
  header.hero h1 {{
    font-family: 'Archivo', sans-serif; font-weight: 800;
    font-size: clamp(32px, 5vw, 48px); line-height: 1.05; letter-spacing: -0.025em;
    margin: 0 0 14px; max-width: 18ch;
  }}
  header.hero h1 .accent {{
    background: linear-gradient(135deg, #4FB6FF 0%, #025eba 100%);
    -webkit-background-clip: text; background-clip: text; color: transparent;
  }}
  header.hero p {{
    color: rgba(255,255,255,0.70); font-size: 16px; max-width: 60ch; margin: 0;
  }}
  header.hero .meta {{
    margin-top: 22px; display: flex; flex-wrap: wrap; gap: 16px;
    color: rgba(255,255,255,0.55); font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase;
  }}
  header.hero .meta strong {{ color: #fff; font-weight: 600; letter-spacing: 0.08em; }}

  /* TOC */
  nav.toc {{
    background: #fff; border: 1px solid var(--hairline); border-radius: 16px;
    padding: 22px 26px; margin: -24px 0 56px;
    box-shadow: 0 1px 0 rgba(11,18,32,0.04);
  }}
  nav.toc .label {{
    font-family: 'Archivo', sans-serif; font-weight: 700; font-size: 11px;
    letter-spacing: 0.22em; text-transform: uppercase; color: var(--brand);
    margin-bottom: 12px;
  }}
  nav.toc ul {{ list-style: none; margin: 0; padding: 0; column-count: 2; column-gap: 32px; }}
  nav.toc ul ul {{ column-count: 1; padding-left: 14px; margin-top: 6px; }}
  nav.toc li {{ padding: 4px 0; break-inside: avoid; }}
  nav.toc a {{ color: var(--ink); text-decoration: none; font-size: 14px; }}
  nav.toc a:hover {{ color: var(--brand); }}
  @media (max-width: 720px) {{ nav.toc ul {{ column-count: 1; }} }}

  /* Body content */
  h2 {{
    font-family: 'Archivo', sans-serif; font-weight: 700; letter-spacing: -0.02em;
    font-size: 28px; line-height: 1.2; margin: 60px 0 16px;
    padding-bottom: 12px; border-bottom: 1px solid var(--hairline);
  }}
  h3 {{
    font-family: 'Archivo', sans-serif; font-weight: 700; letter-spacing: -0.015em;
    font-size: 20px; line-height: 1.25; margin: 36px 0 10px;
  }}
  h4 {{
    font-family: 'Archivo', sans-serif; font-weight: 700; font-size: 16px;
    margin: 26px 0 8px; color: var(--brand);
  }}
  p {{ margin: 0 0 14px; color: var(--ink); font-size: 15.5px; }}
  a {{ color: var(--brand); text-decoration: none; border-bottom: 1px solid rgba(2,94,186,0.25); }}
  a:hover {{ border-bottom-color: var(--brand); }}
  strong {{ font-weight: 600; }}
  hr {{ border: none; height: 1px; background: var(--hairline); margin: 56px 0; }}
  blockquote {{
    margin: 18px 0; padding: 14px 18px; background: rgba(2,94,186,0.06);
    border-left: 3px solid var(--brand); border-radius: 0 12px 12px 0;
    color: var(--ink);
  }}
  blockquote p {{ margin: 0; font-size: 14.5px; }}

  /* Lists */
  ul, ol {{ padding-left: 22px; margin: 0 0 18px; }}
  li {{ margin: 4px 0; font-size: 15.5px; }}

  /* Tables */
  table {{
    border-collapse: collapse; width: 100%; margin: 18px 0 26px;
    font-size: 14px; background: #fff;
    border: 1px solid var(--hairline); border-radius: 12px; overflow: hidden;
  }}
  thead th {{
    background: #F2EFE8; text-align: left; padding: 12px 14px;
    font-family: 'Archivo', sans-serif; font-weight: 700; font-size: 11px;
    letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink);
    border-bottom: 1px solid var(--hairline);
  }}
  tbody td {{
    padding: 12px 14px; border-bottom: 1px solid var(--hairline);
    color: var(--ink); vertical-align: top;
  }}
  tbody tr:last-child td {{ border-bottom: none; }}
  tbody code {{ background: rgba(2,94,186,0.08); color: var(--brand); }}

  /* Inline code & code blocks */
  code {{
    font-family: 'JetBrains Mono', SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 13px; background: rgba(11,18,32,0.06); color: var(--ink);
    padding: 2px 6px; border-radius: 4px;
  }}
  pre {{
    background: var(--code-bg); color: var(--code-ink);
    padding: 18px 20px; border-radius: 12px; overflow-x: auto;
    border: 1px solid rgba(255,255,255,0.06);
    font-size: 13px; line-height: 1.55; margin: 14px 0 22px;
    position: relative;
  }}
  pre::before {{
    content: ""; position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, transparent, rgba(79,182,255,0.55), transparent);
  }}
  pre code {{ background: none; color: inherit; padding: 0; font-size: 13px; }}

  /* Footer */
  footer.foot {{
    margin-top: 80px; padding: 28px 0; border-top: 1px solid var(--hairline);
    font-size: 12px; color: var(--muted); display: flex; justify-content: space-between;
    flex-wrap: wrap; gap: 12px;
  }}
  footer.foot strong {{ color: var(--ink); font-weight: 700; }}

  /* Print */
  @media print {{
    body {{ background: #fff; }}
    .page {{ padding: 0 12px 24px; }}
    header.hero {{ margin: 0 -12px 32px; padding: 32px 12px; background: #fff; color: var(--ink); border-bottom: 1px solid var(--hairline); }}
    header.hero::before {{ display: none; }}
    header.hero h1, header.hero p, header.hero .meta {{ color: var(--ink); }}
    header.hero .eyebrow {{ color: var(--brand); }}
    nav.toc {{ box-shadow: none; }}
    pre {{ background: #F7F4EE; color: var(--ink); border: 1px solid var(--hairline); }}
    pre code {{ color: var(--ink); }}
    a {{ color: var(--ink); border-bottom: none; }}
  }}
</style>
</head>
<body>
<div class="page">

<header class="hero">
  <div class="inner">
    <div class="eyebrow">Gazeal Surveys · Integrator handbook</div>
    <h1>The API <span class="accent">integrator guide.</span></h1>
    <p>For surveyor partners (RPSA), CRMs (HubSpot, Salesforce), automation tools and internal dashboards connecting to the Gazeal Surveys lead pipeline.</p>
    <div class="meta">
      <span><strong>Base URL</strong> &nbsp; https://survey-pro-10.emergent.host/api</span>
      <span><strong>Version</strong> &nbsp; v1</span>
    </div>
  </div>
</header>

<nav class="toc">
  <div class="label">On this page</div>
  {toc}
</nav>

<main>
{body}
</main>

<footer class="foot">
  <div>© Gazeal Surveys · Integrator guide</div>
  <div>Contact <strong>vignesh.sasindran@gazeal.co.uk</strong> for keys and support</div>
</footer>

</div>
</body>
</html>
"""

OUT.write_text(
    TEMPLATE.format(toc=toc_html, body=body_html), encoding="utf-8"
)
print(f"Wrote {OUT} ({OUT.stat().st_size:,} bytes)")
