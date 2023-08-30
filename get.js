import sqlite3 from "sqlite3";
import "dotenv/config";

const apiKey = process.env.APIKEY;
const baseURL = `https://eth-mainnet.g.alchemy.com/nft/v2/${apiKey}/getNFTs/`;
const ownerAddr = "rugenerous.eth";

// Promisify SQLite methods
const runAsync = (db, sql) =>
  new Promise((resolve, reject) => {
    db.run(sql, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });

const prepareAsync = (db, sql) =>
  new Promise((resolve, reject) => {
    const stmt = db.prepare(sql, (err) => {
      if (err) return reject(err);
      resolve(stmt);
    });
  });

const stmtRunAsync = (stmt, params) =>
  new Promise((resolve, reject) => {
    stmt.run(params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });

const stmtFinalizeAsync = (stmt) =>
  new Promise((resolve, reject) => {
    stmt.finalize((err) => {
      if (err) return reject(err);
      resolve();
    });
  });

// Database setup
const db = new sqlite3.Database("./nfts.db", (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log("Connected to the nfts database.");
});

const createTables = async () => {
  await runAsync(
    db,
    `CREATE TABLE IF NOT EXISTS accounts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          address TEXT UNIQUE NOT NULL
      )`
  );

  await runAsync(
    db,
    `CREATE TABLE IF NOT EXISTS nfts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          accountId INTEGER,
          contract TEXT NOT NULL,
          contractAddress TEXT NOT NULL,
          tokenId TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          tokenUri TEXT NOT NULL,
          media TEXT NOT NULL,
          metadata TEXT NOT NULL,
          timeLastUpdated TEXT NOT NULL,
          contractMetadata TEXT NOT NULL,
          FOREIGN KEY(accountId) REFERENCES accounts(id)
      )`
  );
};

const insertNFTs = async (nfts, accountId) => {
  const stmt = await prepareAsync(
    db,
    `INSERT INTO nfts (accountId, contract, contractAddress, tokenId, title, description, tokenUri, media, metadata, timeLastUpdated, contractMetadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const nft of nfts) {
    const {
      contract,
      id,
      balance,
      title,
      description,
      tokenUri,
      media,
      metadata,
      timeLastUpdated,
      contractMetadata,
    } = nft;
    await stmtRunAsync(stmt, [
      accountId,
      JSON.stringify(contract),
      JSON.stringify(id),
      balance,
      title,
      description,
      JSON.stringify(tokenUri),
      JSON.stringify(media),
      JSON.stringify(metadata),
      timeLastUpdated,
      JSON.stringify(contractMetadata),
    ]);
  }

  await stmtFinalizeAsync(stmt);
};

const insertAccount = async (accountAddress) => {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO accounts (address) VALUES (?)`,
      [accountAddress],
      function (err) {
        if (err) return reject(err);
        resolve(this.lastID);
      }
    );
  });
};

const getNFTs = async (wallet) => {
  const fetchURL = `${baseURL}?owner=${wallet}`;
  const response = await fetch(fetchURL);
  const { ownedNfts } = await response.json();
  return ownedNfts;
};

// Main function
(async () => {
  try {
    await createTables();
    const accountId = await insertAccount(ownerAddr); // Insert account and get its id
    const nfts = await getNFTs(ownerAddr);
    await insertNFTs(nfts, accountId); // Pass accountId as an additional parameter
    console.log("NFT data has been inserted into the database.");
  } catch (err) {
    console.error("An error occurred:", err);
  }
})();
