require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const Blog = require("./models/Blog");
const blogRoutes = require("./routes/blogRoutes");
const adminRoutes = require("./routes/adminRoutes");
const generateSitemap = require("./src/utils/generateSitemap");

const app = express();

// -----------------------
// Mongoose Settings
// -----------------------
mongoose.set("strictQuery", true);
mongoose.set("bufferCommands", false);

// -----------------------
// Middleware
// -----------------------
app.use(cors({ origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// -----------------------
// ROBOTS.TXT (STATIC)
// -----------------------
app.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  res.send(`User-agent: *
Allow: /

Sitemap: https://full-project-5.onrender.com/sitemap.xml`);
});

// -----------------------
// SITEMAP.XML
// -----------------------
app.get("/sitemap.xml", (req, res) => {
  const sitemapPath = path.join(__dirname, "frontend/sitemap.xml");
  if (fs.existsSync(sitemapPath)) {
    res.header("Content-Type", "application/xml");
    res.sendFile(sitemapPath);
  } else {
    res.status(404).send("Sitemap not found");
  }
});

// -----------------------
// Static Frontend
// -----------------------
app.use(express.static(path.join(__dirname, "frontend")));

// -----------------------
// API Routes
// -----------------------
app.use("/api/blogs", blogRoutes);
app.use("/admin/api", adminRoutes);

// -----------------------
// Landing Page
// -----------------------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend/index.html"));
});

// -----------------------
// Admin Page
// -----------------------
app.get("/admin", (req, res) => {
  const key = req.query.key;
  if (!key) return res.status(403).send("Admin key missing");
  res.sendFile(path.join(__dirname, "frontend/admin/admin.html"));
});

// -----------------------
// Escape helper
// -----------------------
const escapeXml = (str = "") =>
  str.replace(/[<>&'"]/g, c =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c])
  );

// -----------------------
// BLOG PAGE (PRO DESIGN)
// -----------------------
app.get("/post/:slug", async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug });
    if (!blog) return res.status(404).send("Post not found");

    // Latest posts
    const latestPosts = await Blog.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .select("title slug image");

    const isUrdu = blog.language === "urdu";

    res.send(`<!DOCTYPE html>
<html lang="${isUrdu ? "ur" : "en"}" dir="${isUrdu ? "rtl" : "ltr"}">
<head>
<meta charset="UTF-8">
<title>${escapeXml(blog.seoTitle || blog.title)}</title>
<meta name="description" content="${escapeXml(blog.seoDescription || "")}">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<style>
*{margin:0;padding:0;box-sizing:border-box;}

body{
  background:#f5f7fa;
  color:#111;
  font-family:${isUrdu ? '"Noto Nastaliq Urdu", serif' : '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif'};
  line-height:1.8;
}

.container{
  max-width:1200px;
  margin:auto;
  padding:16px;
}

.grid{
  display:grid;
  grid-template-columns:3fr 1fr;
  gap:24px;
}

.post{
  background:#fff;
  padding:24px;
  border-radius:12px;
  box-shadow:0 4px 10px rgba(0,0,0,0.05);
}

.post h1{
  font-size:2rem;
  margin-bottom:10px;
}

.meta{
  color:#666;
  font-size:0.9rem;
  margin-bottom:10px;
}

.featured{
  width:100%;
  border-radius:12px;
  margin:20px 0;
}

.content{
  font-size:1.05rem;
}

.content img{
  max-width:100%;
  border-radius:10px;
  margin:16px 0;
}

.sidebar{
  background:#fff;
  padding:20px;
  border-radius:12px;
  position:sticky;
  top:20px;
  height:fit-content;
  box-shadow:0 4px 10px rgba(0,0,0,0.05);
}

.sidebar h3{
  margin-bottom:16px;
}

.latest-post{
  display:block;
  text-decoration:none;
  color:#111;
  margin-bottom:16px;
}

.latest-post img{
  width:100%;
  border-radius:8px;
}

.latest-post p{
  font-size:0.95rem;
  margin-top:6px;
  font-weight:600;
}

/* MOBILE */
@media(max-width:900px){
  .grid{
    grid-template-columns:1fr;
  }

  .sidebar{
    position:relative;
    top:0;
  }
}

@media(max-width:600px){
  .post{
    padding:16px;
  }

  .post h1{
    font-size:1.5rem;
  }
}
</style>
</head>

<body>

<div class="container">

  <div class="grid">

    <!-- MAIN POST -->
    <article class="post">

      <h1>${escapeXml(blog.title)}</h1>

      <div class="meta">
        ${new Date(blog.createdAt).toDateString()}
      </div>

      ${blog.image ? `<img class="featured" src="${blog.image}" alt="${escapeXml(blog.title)}">` : ""}

      <div class="content">
        ${blog.content}
      </div>

    </article>

    <!-- SIDEBAR -->
    <aside class="sidebar">
      <h3>Latest Posts</h3>

      ${latestPosts.map(p => `
        <a class="latest-post" href="/post/${p.slug}">
          ${p.image ? `<img src="${p.image}">` : ""}
          <p>${escapeXml(p.title)}</p>
        </a>
      `).join("")}

    </aside>

  </div>

</div>

</body>
</html>`);

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// -----------------------
// Sitemap Update
// -----------------------
async function updateSitemap() {
  try {
    const blogs = await Blog.find({}, "slug updatedAt");
    generateSitemap(blogs);
  } catch (err) {
    console.error(err);
  }
}

// -----------------------
// Start Server
// -----------------------
async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");

    await updateSitemap();

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log("Server running on port", PORT);
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

startServer();
