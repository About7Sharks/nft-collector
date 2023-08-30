import express from "express";
import path from "path";
import sqlite3 from "sqlite3";

const app = express();
const port = 3000;

app.use(express.static("public")); // Serve static files from 'public' folder

// Fetch NFT media data from SQLite database
const fetchMediaData = () => {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database("./nfts.db", (err) => {
        if (err) {
          return reject(err);
        }
      });
  
      const query = `
        SELECT nfts.accountId, accounts.address, nfts.media, nfts.contractMetadata
        FROM nfts
        JOIN accounts ON nfts.accountId = accounts.id
      `;
  
      db.all(query, [], (err, rows) => {
        if (err) {
          return reject(err);
        }
        resolve(rows.map((row) => ({
          accountId: row.accountId,
          accountAddress: row.address,  // Include account address
          media: JSON.parse(row.media),
          contractMetadata: JSON.parse(row.contractMetadata)
        })))
        db.close();
      });
    });
  };
  

app.get("/mediaData", async (req, res) => {
  try {
    const mediaData = await fetchMediaData();
    res.json(mediaData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
