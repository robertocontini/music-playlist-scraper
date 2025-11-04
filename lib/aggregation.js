import { aggregateTracksByEpisode } from "./parser.js";

const updateAllTracks = (allTracks, episodeTracks, newTracks) => {
  let updatedAllTracks = [...allTracks];

  for (const track of episodeTracks) {
    const exists = updatedAllTracks.some(
      (t) =>
        t.title.trim() === track.title.trim() &&
        t.artist.trim() === track.artist.trim()
    );

    if (!exists) {
      updatedAllTracks.push(track);
      newTracks.push(track);
    }
  }

  return updatedAllTracks;
};

const getKnownEpisodeUrls = (previousTracks) => {
  const aggregatedHistory = aggregateTracksByEpisode(previousTracks);
  return new Set(aggregatedHistory.map((ep) => ep.episodeUrl));
};

export { updateAllTracks, getKnownEpisodeUrls };
