const parseTrackString = (trackStr) => {
    const [artistPart, ...rest] = trackStr.split(",");

    let rawTitle = rest.join(",");
    let albumDetails = "";

    const albumRegex = /,\s*(da\s+"?.*"?\s*–?.*)$/i;
    const match = rawTitle.match(albumRegex);

    if (match) {
        albumDetails = match[1].trim();
        rawTitle = rawTitle.replace(albumRegex, "").trim();
    }

    const title = rawTitle.trim().replace(/^["']|["']$/g, "");
    const artist = artistPart.trim();

    if (!artist || title.length < 5) {
        return null;
    }

    return { title, artist, albumDetails };
};

const aggregateTracksByEpisode = (tracks) => {
    const episodesMap = new Map();

    tracks.forEach((track) => {
        const key = track.episodeUrl;

        if (!episodesMap.has(key)) {
            episodesMap.set(key, {
                episodeTitle: track.episodeTitle,
                episodeUrl: track.episodeUrl,
                date: track.date || "Unknown",
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
};

export {
    parseTrackString,
    aggregateTracksByEpisode
};