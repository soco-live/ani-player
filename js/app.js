function initTheme() {
  const storedTheme = localStorage.getItem("tvphone-theme");
  if (storedTheme) {
    document.documentElement.setAttribute("data-theme", storedTheme);
  } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.setAttribute("data-theme", "light");
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("tvphone-theme", next);
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getFallbackPromo() {
  return `
    <div class="promo-card">
      <div class="promo-badge" style="background:var(--c-primary);color:#fff">AIRING NOW</div>
      <div class="promo-content text-center py-3">
        <span class="promo-meta text-xs font-bold text-[var(--c-primary)] mb-1 block"><i class="fa-solid fa-fire"></i> Trending & Airing Anime</span>
        <h3 class="text-base font-bold text-[var(--c-text)] mb-2">Anime on Android TV & Phone</h3>
        <p class="text-xs text-[var(--c-text-secondary)] mb-3 leading-relaxed">Full D-pad Leanback remote navigation, adaptive 360p to 1080p playback, episode trackers, and ad-free viewing.</p>
        <a href="#download" class="promo-btn inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[var(--c-primary)] text-white no-underline"><i class="fa-solid fa-cloud-arrow-down"></i> Download AnimePahe TV</a>
      </div>
    </div>
  `;
}

async function loadAiringAnime() {
  const container = document.getElementById("dynamic-promo");
  if (!container) return;

  const query = `
    query {
      Page(page: 1, perPage: 6) {
        airingSchedules(notYetAired: false, sort: TIME_DESC) {
          episode
          airingAt
          media {
            id
            title {
              english
              romaji
            }
            coverImage {
              medium
              large
            }
            averageScore
          }
        }
      }
    }
  `;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const resp = await fetch("https://graphql.anilist.co", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ query })
    });
    clearTimeout(timeoutId);

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    const items = json?.data?.Page?.airingSchedules || [];

    if (!items.length) {
      container.innerHTML = getFallbackPromo();
      return;
    }

    const cardsHtml = items.map(item => {
      const media = item.media || {};
      const title = media.title?.english || media.title?.romaji || "Anime Title";
      const cover = media.coverImage?.medium || media.coverImage?.large || "";
      const ep = item.episode || 1;
      const score = media.averageScore ? `${(media.averageScore / 10).toFixed(1)}★` : "HD";

      return `
        <a href="#download" style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:rgba(225,29,72,0.06);border-radius:12px;border-left:3px solid var(--c-primary);text-decoration:none;color:inherit;transition:all 0.2s">
          <img src="${escapeHtml(cover)}" alt="${escapeHtml(title)}" style="width:40px;height:54px;object-fit:cover;border-radius:6px;flex-shrink:0" loading="lazy" onerror="this.style.display='none'">
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px">
              <span style="font-size:0.62rem;font-weight:800;color:var(--c-primary);background:rgba(225,29,72,0.12);padding:1px 6px;border-radius:4px">EP ${ep}</span>
              <span style="font-size:0.6rem;font-weight:700;color:#f59e0b">${score}</span>
            </div>
            <div style="font-weight:600;font-size:0.78rem;color:var(--c-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(title)}</div>
          </div>
        </a>
      `;
    }).join("");

    container.innerHTML = `
      <div class="promo-card">
        <div class="promo-badge" style="background:var(--c-primary);color:#fff">AIRING TODAY</div>
        <div style="display:grid;grid-template-columns:1fr;gap:6px;margin-top:4px">
          ${cardsHtml}
        </div>
        <a href="#download" class="promo-btn" style="margin-top:12px;display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:10px;border-radius:10px;background:var(--c-primary);color:#ffffff;font-weight:700;font-size:0.8rem;text-decoration:none">
          <i class="fa-solid fa-play"></i> Watch Airing Episodes on TV & Phone
        </a>
      </div>
    `;
  } catch (err) {
    console.log("[Client] Airing anime fallback active:", err.message);
    container.innerHTML = getFallbackPromo();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  loadAiringAnime();
});
