import fs from "fs";
import fsPromises from "fs/promises";
import fetch from "node-fetch";
import dotenv from "dotenv";
import * as cheerio from "cheerio";

dotenv.config();

const TRACKS_FILE = "./tracks.json";
const EXPORT_FILE = "./new_tracks_for_tidal.txt";
const BASE_URL = "https://www.raiplaysound.it";
const BATTITI_URL = `${BASE_URL}/programmi/battiti`;
const EPISODE_SELECTOR = "rps-cta-link[weblink]";
const EPISODE_TITLE_SELECTOR = ".audio__header__title";
const EPISODE_DESCRIPTION_SELECTOR = ".audio__header p";
const EPISODE_DATE_SELECTOR = ".audio__header p.text-gray-medium";

async function loadPreviousTracks() {
  try {
    if (!fs.existsSync(TRACKS_FILE)) return [];
    const data = await fsPromises.readFile(TRACKS_FILE, "utf-8");
    const aggregatedData = JSON.parse(data);

    if (
      Array.isArray(aggregatedData) &&
      aggregatedData.length > 0 &&
      aggregatedData[0].tracks
    ) {
      const flatTracks = [];
      aggregatedData.forEach((episode) => {
        episode.tracks.forEach((track) => {
          flatTracks.push({
            title: track.title,
            artist: track.artist,
            albumDetails: track.albumDetails || "",
            episodeTitle: episode.episodeTitle,
            episodeUrl: episode.episodeUrl,
            date: episode.date,
          });
        });
      });
      return flatTracks;
    }

    return aggregatedData;
  } catch (e) {
    console.error("❌ Error on loading tracks.json:", e);
    return [];
  }
}

async function saveTracks(aggregatedTracks) {
  await fsPromises.writeFile(
    TRACKS_FILE,
    JSON.stringify(aggregatedTracks, null, 2)
  );
}

async function exportNewTracks(tracks) {
  if (tracks.length === 0) {
    console.log("✅ No new tracks to export.");
    return;
  }

  const cleanedContent = tracks
    .map((t) => {
      const cleanedTitle = t.title
        .replace(/ \(([^)]+)\)/g, "") // Remove (feat. X), (Live), (Remix)
        .replace(/ \[([^\]]+)\]/g, "") // Remove [feat. X], [Live], [Remix]
        .trim();

      const cleanedArtist = t.artist
        .replace(/ \(([^)]+)\)/g, "")
        .replace(/ \[([^\]]+)\]/g, "")
        .trim();

      return `${cleanedArtist} - ${cleanedTitle}`;
    })
    .join("\n");

  await fsPromises.writeFile(EXPORT_FILE, cleanedContent);
  console.log(`✅ ${tracks.lenght} tracks exported.`);
}

function aggregateTracksByEpisode(tracks) {
  const episodesMap = new Map();

  tracks.forEach((track) => {
    const key = track.episodeUrl;

    if (!episodesMap.has(key)) {
      episodesMap.set(key, {
        episodeTitle: track.episodeTitle,
        episodeUrl: track.episodeUrl,
        date: track.date,
        tracks: [],
      });
    }

    episodesMap.get(key).tracks.push({
      title: track.title,
      artist: track.artist,
      albumDetails: track.albumDetails || "",
    });
  });

  return Array.from(episodesMap.values());
}

async function fetchHtml(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`❌ Error on loading ${url}: ${res.status}`);
  return res.text();
}

async function getEpisodeLinks(mainUrl) {
  const html = await fetchHtml(mainUrl);
  const $ = cheerio.load(html);

  const links = [];
  $(EPISODE_SELECTOR).each((_, el) => {
    const weblink = $(el).attr("weblink");
    if (weblink && weblink.startsWith("/audio/")) {
      links.push(BASE_URL + weblink);
    }
  });
  return links;
}

function parseTrackString(trackStr) {
  const [artistPart, ...rest] = trackStr.split(",");

  let rawTitle = rest.join(",");
  let albumDetails = "";

  const albumRegex = /,\s*(da\s+"?.*"?\s*–?.*)$/i;
  const match = rawTitle.match(albumRegex);

  if (match) {
    albumDetails = match[1].trim();
    rawTitle = rawTitle.replace(albumRegex, "").trim();
  }

  const title = rawTitle.trim();
  const artist = artistPart.trim();
  const cleanedTitle = title.replace(/^["']|["']$/g, "");

  if (!artist || !cleanedTitle || cleanedTitle.length < 5) {
    return null;
  }

  return { title: cleanedTitle, artist, albumDetails };
}

async function getTracksFromEpisode(episodeUrl) {
  const html = await fetchHtml(episodeUrl);
  const $ = cheerio.load(html);
  const episodeTitle = $(EPISODE_TITLE_SELECTOR).first().text().trim();
  const date = $(EPISODE_DATE_SELECTOR).first().text().trim();

  let trackText = "";

  $(EPISODE_DESCRIPTION_SELECTOR).each((i, el) => {
    const text = $(el).text().trim();
    if (text.includes("//") && text !== date) {
      trackText = text;
      return false;
    }
  });

  const trackStrings = trackText
    .split("//")
    .map((t) => t.trim())
    .filter(Boolean);

  return trackStrings
    .map((ts) => {
      const parsed = parseTrackString(ts);
      return parsed ? { ...parsed, episodeTitle, episodeUrl, date } : null;
    })
    .filter(Boolean);
}

// --- Main ---
async function main() {
  console.log(`🎧 Start scraping ${BATTITI_URL}`);

  const previousTracks = await loadPreviousTracks();
  const episodeLinks = await getEpisodeLinks(BATTITI_URL);

  let allTracks = [...previousTracks];
  let newTracks = [];
  let scrapedCount = 0;

  for (const link of episodeLinks) {
    try {
      const episodeTracks = await getTracksFromEpisode(link);
      scrapedCount++;
      for (const track of episodeTracks) {
        // const exists = allTracks.some(
        //   (t) => t.title === track.title && t.episodeUrl === track.episodeUrl
        // );

        const exists = allTracks.some(
          (t) =>
            t.title.trim() === track.title.trim() &&
            t.artist.trim() === track.artist.trim()
        );

        if (!exists) {
          allTracks.push(track);
          newTracks.push(track);
        }
      }
    } catch (e) {
      console.error(`❌ Error on getting the episode ${link}:`, e.message);
    }
  }

  console.log(`---`);
  console.log(`✅ Episodes analyzed: ${scrapedCount}/${episodeLinks.length}`);
  console.log(
    `🎧 Found **${newTracks.length}** new tracks (total: ${allTracks.length})`
  );

  const aggregatedResults = await aggregateTracksByEpisode(allTracks);
  await saveTracks(aggregatedResults);
  
  console.log(
    `💾 Saved ${aggregatedResults.length} episodes on ${TRACKS_FILE} (aggregated format)`
  );

  await exportNewTracks(newTracks);
}

main().catch((err) => console.error("❌ General error:", err.message || err));
