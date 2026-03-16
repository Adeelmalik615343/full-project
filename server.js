require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const Blog = require("./models/Blog");
const blogRoutes = require("./routes/blogRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

// -----------------------
// Mongoose Settings
// -----------------------
mongoose.set("strictQuery", true);
mongoose.set("bufferCommands", false);

// -----------------------
// Middleware
// -----------------------
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
}));

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
// Serve Static Frontend
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
  res.sendFile(path.join(__dirname, "frontend", "index.html"));
});

// -----------------------
// Admin Page
// -----------------------
app.get("/admin", (req, res) => {

  const key = req.query.key;

  if (!key) return res.status(403).send("Admin key missing");

  res.sendFile(path.join(__dirname, "frontend", "admin", "admin.html"));

});

// -----------------------
// Escape XML helper
// -----------------------
const escapeXml = (str = "") =>
  str.replace(/[<>&'"]/g, c =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c])
  );

// -----------------------
// SEO Blog Page
// -----------------------
app.get("/post/:slug", async (req, res) => {

  try {

    const blog = await Blog.findOne({ slug: req.params.slug });

    if (!blog) return res.status(404).send("Post not found");

    const isUrdu = blog.language === "urdu";

    res.send(`<!DOCTYPE html>
<html lang="${isUrdu ? "ur" : "en"}" dir="${isUrdu ? "rtl" : "ltr"}">

<head>

<meta charset="UTF-8">

<title>${escapeXml(blog.seoTitle || blog.title)}</title>

<meta name="description" content="${escapeXml(blog.seoDescription || "")}">

<meta name="viewport" content="width=device-width, initial-scale=1.0">

${isUrdu ? `<link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu&display=swap" rel="stylesheet">` : ""}

<style>

body{
margin:0;
background:#f9fafb;
color:#111;
font-family:${isUrdu
        ? '"Noto Nastaliq Urdu", serif'
        : 'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'};
line-height:1.9;
direction:${isUrdu ? "rtl" : "ltr"};
}

.container{
max-width:820px;
margin:auto;
padding:16px;
}

img{
max-width:100%;
border-radius:10px;
margin:16px 0;
}

.content{
font-size:${isUrdu ? "1.15rem" : "1rem"};
}

</style>

</head>

<body>

<main class="container">

<article>

<h1>${escapeXml(blog.title)}</h1>

${blog.image ? `<img src="${blog.image}" alt="${escapeXml(blog.title)}" loading="lazy">` : ""}

<div class="content">
${blog.content}
</div>

</article>

</main>

</body>

</html>`);

  } catch (err) {

    console.error("Blog error:", err);
    res.status(500).send("Server error");

  }

});

// -----------------------
// Start Server
// -----------------------
async function startServer() {

  try {

    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB Connected");

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