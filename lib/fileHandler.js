import fs from "fs";
import fsPromises from "fs/promises";
import { logError, logCompletion } from "./logger.js";
import { TRACKS_FILE } from "./config.js";
import path from "path";

const ensureDataDirectory = async () => {
    const dirPath = path.dirname(TRACKS_FILE); 
    
    if (!fs.existsSync(dirPath)) {
        try {
            await fsPromises.mkdir(dirPath, { recursive: true });
            console.log(`Created directory: ${dirPath}`); // Optional log
        } catch (e) {
            logError("creating data directory", e.message);
            throw e;
        }
    }
};

const loadPreviousTracks = async (TRACKS_FILE) => {
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
            episodeTitle: episode.episodeTitle,
            episodeUrl: episode.episodeUrl,
            date: episode.date,
            albumDetails: track.albumDetails || "",
          });
        });
      });
      return flatTracks;
    }

    return aggregatedData;
  } catch (e) {
    logError("loading tracks.json", e.message);
    return [];
  }
};

const saveTracks = async (aggregatedTracks, TRACKS_FILE) => {
  try {
    await fsPromises.writeFile(
      TRACKS_FILE,
      JSON.stringify(aggregatedTracks, null, 2)
    );

    console.log(
      `💾 Saved ${aggregatedTracks.length} episodes to ${TRACKS_FILE} (aggregated format)`
    );
  } catch (e) {
    logError("saving tracks.json", e.message);
  }
};

const exportNewTracks = async (tracks, EXPORT_FILE) => {
  if (tracks.length === 0) {
    logCompletion("No new tracks to export.");
    return;
  }

  const cleanedContent = tracks
    .map((t) => {
      const clean = (str) =>
        str
          .replace(/ \(([^)]+)\)/g, "")
          .replace(/ \[([^\]]+)\]/g, "")
          .trim();

      const cleanedTitle = clean(t.title);
      const cleanedArtist = clean(t.artist);

      return `${cleanedArtist} - ${cleanedTitle}`;
    })
    .join("\n");

  try {
    await fsPromises.writeFile(EXPORT_FILE, cleanedContent);
    logCompletion(`${tracks.length} tracks exported to ${EXPORT_FILE}.`);
  } catch (e) {
    logError("exporting new tracks", e.message);
  }
};

export { ensureDataDirectory, loadPreviousTracks, saveTracks, exportNewTracks };
