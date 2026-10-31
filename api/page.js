// Serves index.html with real <title>/<meta>/canonical for each series & chapter (for Google + link previews).
const SB = "https://eosccauingnmjwcxfztn.supabase.co";
const KEY = "sb_publishable_e-8IcxGvQba2B2AtQSi3SA_NmWX_mLN"; // public key (read-only by RLS)
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const q = async p => {
  try { const r = await fetch(SB + "/rest/v1/" + p, { headers: { apikey: KEY } }); return r.ok ? await r.json() : []; }
  catch (e) { return []; }
};

module.exports = async (req, res) => {
  const { type, slug, n } = req.query;
  const origin = "https://" + (req.headers["x-forwarded-host"] || req.headers.host);
  let html = await (await fetch(origin + "/index.html")).text();
  let title = "Novelfly – Read Web Novels", desc = "Read web novels online for free on Novelfly.";
  let canon = origin + (type === "read" ? `/read/${slug}/${n}` : `/series/${slug}`), body = "", image = "", status = 200;

  const s = (await q(`series?slug=eq.${encodeURIComponent(slug)}&select=id,title,author,description,cover_url&limit=1`))[0];
  if (!s) status = 404;
  else {
    title = `${s.title} – Read Online | Novelfly`;
    desc = (s.description || `Read ${s.title} online on Novelfly.`).replace(/\s+/g, " ").slice(0, 155);
    image = s.cover_url || "";
    body = `<h1>${esc(s.title)}</h1>${s.author ? `<p>by ${esc(s.author)}</p>` : ""}<p>${esc(s.description)}</p>`;
    if (type === "read") {
      const c = (await q(`chapters?series_id=eq.${s.id}&number=eq.${encodeURIComponent(n)}&select=number,title&limit=1`))[0];
      if (!c) status = 404;
      else {
        title = `${s.title} – Chapter ${c.number}${c.title ? ": " + c.title : ""} | Novelfly`;
        desc = `Read chapter ${c.number} of ${s.title} online on Novelfly.`;
        body = `<h1>${esc(s.title)} – Chapter ${esc(c.number)}</h1><p>${esc(c.title || "")}</p>`;
      }
    }
  }
  const head = `<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${esc(canon)}">` +
    `<meta property="og:site_name" content="Novelfly"><meta property="og:type" content="article"><meta property="og:title" content="${esc(title)}">` +
    `<meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${esc(canon)}">` +
    (image ? `<meta property="og:image" content="${esc(image)}"><meta name="twitter:card" content="summary_large_image">` : "") +
    (status === 404 ? `<meta name="robots" content="noindex">` : "");
  html = html.replace(/<title>[\s\S]*?<\/title>/, () => head).replace('<main id="app"></main>', () => `<main id="app">${body}</main>`);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.status(status).send(html);
};
