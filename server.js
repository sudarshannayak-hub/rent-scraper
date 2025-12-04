import express from "express";
import axios from "axios";
import cheerio from "cheerio";
import cors from "cors";

const app = express();
app.use(cors());

async function getRentFromURL(url) {
  try {
    const html = await axios.get(url);
    const $ = cheerio.load(html.data);

    let text = $("body").text();

    let rent = text.match(/₹\s?[0-9,.]+/g);
    if (rent && rent.length > 0) {
      return rent[0];
    }
  } catch (err) {
    return "-";
  }
  return "-";
}

app.get("/search", async (req, res) => {
  const { society, city } = req.query;

  if (!society || !city) {
    return res.json({ error: "Missing parameters" });
  }

  const query = `${society} ${city} rent`;
  const googleURL = `https://www.google.com/search?q=${encodeURIComponent(
    query
  )}`;

  let sites = [];

  try {
    const response = await axios.get(googleURL, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    const $ = cheerio.load(response.data);

    const links = [];

    $("a").each((i, el) => {
      const href = $(el).attr("href");
      if (
        href &&
        href.includes("http") &&
        (href.includes("nobroker") ||
          href.includes("magicbricks") ||
          href.includes("99acres") ||
          href.includes("housing") ||
          href.includes("makaan"))
      ) {
        links.push(href.replace("/url?q=", "").split("&")[0]);
      }
    });

    const topLinks = links.slice(0, 7);

    for (let link of topLinks) {
      const rent = await getRentFromURL(link);

      sites.push({
        site: link,
        "1BHK": rent,
        "2BHK": rent,
        "3BHK": rent,
        "4BHK": rent
      });
    }

    res.json(sites);
  } catch (err) {
    res.json({ error: "Scraping failed", details: err.toString() });
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));

