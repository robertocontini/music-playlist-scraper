# 🎧 Battiti-TIDAL Scraper and Aggregator

This project is an automatic scraper bot developed in Node.js to monitor and download the tracklist (scaletta) from the radio show **"Battiti"** on RaiPlay Sound. The main goal is to maintain a complete historical archive of the tracks and generate a file ready for incremental import into a TIDAL playlist.

## ✨ Key Features

* **Robust Scraping:** Analyzes "Battiti" episodes on RaiPlay Sound to extract Artist, Title, and Album/Label details.
* **Historical Archive:** Saves all found tracks in the **`tracks.json`** file, aggregated and structured by episode.
* **Incremental Update:** The system tracks previously saved tracks to identify and process **only new tracks** with each execution.
* **TIDAL Export:** Generates a clean text file (`new_tracks_for_tidal.txt`) containing only the new songs, formatted for easy import into a TIDAL playlist using third-party services (Soundiiz, TuneMyMusic).
* **Clean Data Format:** Tracks in `tracks.json` are grouped by episode, maintaining all essential information without duplication.

---

## 📁 Repository Structure

| File/Folder | Description |
| :--- | :--- |
| `init.js` | The main source code containing the logic for scraping, cleaning, aggregation, and file management. |
| `tracks.json` | **Historical Archive.** Contains all tracks found to date, aggregated by episode (used to track already added songs). |
| `new_tracks_for_tidal.txt` | **Export File.** Contains only the tracks found since the last execution, ready for import. |
| `.env` | Configuration file for environment variables. |
| `package.json` | Defines the project's dependencies. |

---

## 🚀 Usage Instructions

### 1. Prerequisites

* [Node.js](https://nodejs.org/) (Version 20+)
* An active TIDAL account.

### 2. Install Dependencies

After cloning the repository, install the necessary libraries:

```bash
npm install
```

### 3. Configuration

This project no longer requires direct TIDAL credentials in the `.env` file (due to the instability of unofficial APIs). You only need to ensure the `.env` file exists in the root directory.

### 4. Execution and Update

Run the script:

```bash
npm start
```

**What happens on execution:**

* The script scrapes all episodes on RaiPlay Sound.
* It updates the `tracks.json` archive with all aggregated data.
* It saves new tracks (i.e., those not present in `tracks.json`) into the `new_tracks_for_tidal.txt` file.

---

## 🔄 Updating the TIDAL Playlist

Since the TIDAL API is unstable and prone to blocks, direct upload has been replaced by a much more reliable manual import process:

1.  **Run the script** (`npm start`) to generate the latest `new_tracks_for_tidal.txt` file.
2.  Go to a playlist transfer service like **Soundiiz** or **TuneMyMusic**.
3.  Use the **"Import from Text File / CSV"** option and upload the `new_tracks_for_tidal.txt` file.
4.  Choose your **existing** TIDAL playlist as the destination.
5.  The service will only add the new tracks, **automatically avoiding duplicates**.

**For daily updates, simply repeat steps 1–5.**
