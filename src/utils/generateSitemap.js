const fs = require("fs");
const path = require("path");

function escapeXml(str = "") {
  return str.replace(/[<>&'"]/g, c =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c])
  );
}

function generateSitemap(blogs = []) {
  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  sitemap += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  // Homepage
  sitemap += `
    <url>
      <loc>https://full-project-5.onrender.com/</loc>
      <changefreq>daily</changefreq>
      <priority>1.0</priority>
    </url>\n
  `;

  // Blog posts
  blogs.forEach(blog => {
    sitemap += `
    <url>
      <loc>https://full-project-5.onrender.com/post/${blog.slug}</loc>
      <lastmod>${blog.updatedAt ? blog.updatedAt.toISOString() : new Date().toISOString()}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>0.8</priority>
    </url>\n
    `;
  });

  sitemap += `</urlset>`;

  // Save sitemap in frontend folder
  const filePath = path.join(__dirname, "../../frontend/sitemap.xml");
  fs.writeFileSync(filePath, sitemap, "utf8");
  console.log("✅ sitemap.xml updated in frontend folder");
}

module.exports = generateSitemap;
