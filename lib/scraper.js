import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { parseTrackString } from "./parser.js";
import { logError } from "./logger.js";

const EPISODE_SELECTOR = "rps-cta-link[weblink]";
const EPISODE_TITLE_SELECTOR = ".audio__header__title";
const EPISODE_DATE_SELECTOR = ".audio__header p.text-gray-medium";
const EPISODE_DESCRIPTION_SELECTOR = ".audio__header p";

const fetchHtml = async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    return res.text();
};

const getEpisodeLinks = async (mainUrl, BASE_URL) => {
    try {
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
    } catch (e) {
        logError(`loading main page (${mainUrl})`, e.message);
        return [];
    }
};

const getTracksFromEpisode = async (episodeUrl) => {
    try {
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
    } catch (e) {
        logError(`fetching episode data (${episodeUrl})`, e.message);
        return [];
    }
};

export {
    fetchHtml,
    getEpisodeLinks,
    getTracksFromEpisode
};