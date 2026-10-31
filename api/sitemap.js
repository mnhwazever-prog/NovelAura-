// Builds sitemap.xml from the database (home, novels, every series, and chapters up to 20,000 URLs).
const SB = "https://eosccauingnmjwcxfztn.supabase.co";
const KEY = "sb_publishable_e-8IcxGvQba2B2AtQSi3SA_NmWX_mLN";
const MAX = 20000;
const x = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const q = async p => {
  try { const r = await fetch(SB + "/rest/v1/" + p, { headers: { apikey: KEY } }); return r.ok ? await r.json() : []; }
  catch (e) { return []; }
};

module.exports = async (req, res) => {
  const origin = "https://" + (req.headers["x-forwarded-host"] || req.headers.host);
  const urls = [["/", null], ["/novels", null]];
  const series = [];
  for (let off = 0; ; off += 1000) {
    const rows = await q(`series?select=id,slug,updated_at&order=id&limit=1000&offset=${off}`);
    series.push(...rows);
    if (rows.length < 1000) break;
  }
  const slugs = new Map(series.map(s => [s.id, s.slug]));
  series.forEach(s => urls.push([`/series/${s.slug}`, s.updated_at]));
  for (let off = 0; urls.length < MAX; off += 1000) {
    const rows = await q(`chapters?select=series_id,number,created_at&order=id&limit=1000&offset=${off}`);
    for (const c of rows) { const sl = slugs.get(c.series_id); if (sl && urls.length < MAX) urls.push([`/read/${sl}/${c.number}`, c.created_at]); }
    if (rows.length < 1000) break;
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map(([p, d]) => `<url><loc>${x(origin + p)}</loc>${d ? `<lastmod>${new Date(d).toISOString().slice(0, 10)}</lastmod>` : ""}</url>`).join("\n") + `\n</urlset>`;
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=21600, stale-while-revalidate=86400");
  res.status(200).send(xml);
};
