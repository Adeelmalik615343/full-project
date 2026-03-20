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
// ROBOTS.TXT
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
// Escape XML helper
// -----------------------
const escapeXml = (str = "") =>
  str.replace(/[<>&'"]/g, c =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c])
  );

// -----------------------
// BLOG PAGE (UPDATED)
// -----------------------
app.get("/post/:slug", async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug });
    if (!blog) return res.status(404).send("Post not found");

    // 🔥 Latest posts
    const latestPosts = await Blog.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .select("title slug image");

    const latestHTML = latestPosts.map(p => `
      <a href="/post/${p.slug}" style="display:block;margin-bottom:12px;text-decoration:none;color:#111;">
        ${p.image ? `<img src="${p.image}" style="width:100%;border-radius:8px;">` : ""}
        <p style="margin:6px 0;font-weight:600;">${escapeXml(p.title)}</p>
      </a>
    `).join("");

    const isUrdu = blog.language === "urdu";

    res.send(`<!DOCTYPE html>
<html lang="${isUrdu ? "ur" : "en"}" dir="${isUrdu ? "rtl" : "ltr"}">
<head>
<meta charset="UTF-8">
<title>${escapeXml(blog.seoTitle || blog.title)}</title>
<meta name="description" content="${escapeXml(blog.seoDescription || "")}">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<style>
body{
  margin:0;
  background:#f3f4f6;
  font-family:${isUrdu ? '"Noto Nastaliq Urdu", serif' : 'system-ui'};
  direction:${isUrdu ? "rtl" : "ltr"};
}

.wrapper{
  max-width:1100px;
  margin:auto;
  display:flex;
  gap:20px;
  padding:16px;
}

.main{
  flex:3;
  background:#fff;
  padding:20px;
  border-radius:10px;
}

.sidebar{
  flex:1;
  background:#fff;
  padding:16px;
  border-radius:10px;
  position:sticky;
  top:20px;
  height:fit-content;
}

h1{
  margin-bottom:10px;
}

.featured{
  width:100%;
  border-radius:10px;
  margin:16px 0;
}

.content{
  line-height:1.8;
}

.sidebar h3{
  margin-bottom:10px;
}

@media(max-width:768px){
  .wrapper{
    flex-direction:column;
  }
}
</style>
</head>

<body>

<div class="wrapper">

  <!-- MAIN -->
  <div class="main">
    <h1>${escapeXml(blog.title)}</h1>

    ${blog.image ? `<img class="featured" src="${blog.image}" alt="${escapeXml(blog.title)}">` : ""}

    <div class="content">
      ${blog.content}
    </div>
  </div>

  <!-- SIDEBAR -->
  <div class="sidebar">
    <h3>Latest Posts</h3>
    ${latestHTML}
  </div>

</div>

</body>
</html>`);

  } catch (err) {
    console.error("Blog error:", err);
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
    console.error("Error updating sitemap:", err);
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
    console.error("MongoDB failed:", err.message);
    process.exit(1);
  }
}

startServer();
