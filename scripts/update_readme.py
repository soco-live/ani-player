import json, subprocess, sys, os, re, datetime, requests

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
README = os.path.join(REPO, "README.md")
INDEX = os.path.join(REPO, "index.html")

def get_latest():
    result = subprocess.run([sys.executable, os.path.join(REPO, "scripts/get_latest.py")], capture_output=True, text=True, timeout=30)
    if result.returncode != 0:
        raise RuntimeError(result.stderr or result.stdout)
    return json.loads(result.stdout)["latest"]

def fmt_html_anime(items):
    cards = []
    for it in items[:6]:
        title = it.get("title", "Anime Title")
        cover = it.get("cover", "")
        ep = it.get("episode", 1)
        score = f"{it.get('score', '8.0')}★" if it.get("score") else "HD"

        cards.append(f'''        <a href="#download" style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:rgba(225,29,72,0.06);border-radius:12px;border-left:3px solid var(--c-primary);text-decoration:none;color:inherit;transition:all 0.2s">
          <img src="{cover}" alt="{title}" style="width:40px;height:54px;object-fit:cover;border-radius:6px;flex-shrink:0;background:#1e293b" loading="lazy" onerror="this.style.display=\'none\'">
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px">
              <span style="font-size:0.62rem;font-weight:800;color:var(--c-primary);background:rgba(225,29,72,0.12);padding:1px 6px;border-radius:4px">EP {ep}</span>
              <span style="font-size:0.6rem;font-weight:700;color:#f59e0b">{score}</span>
            </div>
            <div style="font-weight:600;font-size:0.78rem;color:var(--c-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{title}</div>
          </div>
        </a>''')

    inner = "\n".join(cards) if cards else '        <div class="py-4 text-center text-xs text-[var(--c-text-muted)]">No airing episodes today</div>'
    return f'''      <div class="promo-card">
        <div class="promo-badge" style="background:var(--c-primary);color:#fff">AIRING TODAY</div>
        <div style="display:grid;grid-template-columns:1fr;gap:6px;margin-top:4px">
{inner}
        </div>
        <a href="#download" class="promo-btn" style="margin-top:12px;display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:10px;border-radius:10px;background:var(--c-primary);color:#ffffff;font-weight:700;font-size:0.8rem;text-decoration:none">
          <i class="fa-solid fa-play"></i> Watch Airing Episodes on TV & Phone
        </a>
      </div>'''

def post_fb(latest):
    fb_page = os.environ.get("FB_PAGE_ID")
    fb_token = os.environ.get("FB_PAGE_ACCESS_TOKEN")
    if not fb_page or not fb_token:
        return
    try:
        lines = ["🔥 Today on AnimePahe TV"]
        for it in latest[:5]:
            title = it.get("title", "")
            ep = f" Ep{it.get('episode')}" if it.get("episode") else ""
            lines.append(f"🎬 {title}{ep}")
        lines.append("\n📲 https://anime.tvphone.com#download")
        message = "\n".join(lines)
        last_file = os.path.join(REPO, ".fb_last_post_id")
        if os.path.exists(last_file):
            try:
                with open(last_file) as f:
                    pid = f.read().strip()
                if pid:
                    requests.delete(f"https://graph.facebook.com/v25.0/{pid}", params={"access_token": fb_token}, timeout=15)
            except:
                pass
        cover = latest[0].get("cover") if latest else None
        if cover and cover.startswith("http"):
            url = f"https://graph.facebook.com/v25.0/{fb_page}/photos"
            data = {"url": cover, "message": message, "access_token": fb_token}
        else:
            url = f"https://graph.facebook.com/v25.0/{fb_page}/feed"
            data = {"message": message, "access_token": fb_token}
        r = requests.post(url, data=data, timeout=30)
        j = r.json()
        if "id" in j:
            with open(last_file, "w") as f:
                f.write(j["id"])
    except:
        pass

def update():
    latest = get_latest()

    # Pre-render anime directly into index.html for static SEO and instant view
    if os.path.exists(INDEX):
        html_block = fmt_html_anime(latest)
        with open(INDEX, "r", encoding="utf-8") as f:
            txt = f.read()
        new_txt = re.sub(r'<!-- AIRING_START -->.*?<!-- AIRING_END -->', f'<!-- AIRING_START -->\n{html_block}\n      <!-- AIRING_END -->', txt, flags=re.DOTALL)
        if new_txt != txt:
            with open(INDEX, "w", encoding="utf-8") as f:
                f.write(new_txt)

    post_fb(latest)

if __name__ == "__main__":
    update()
