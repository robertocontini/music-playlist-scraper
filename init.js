import fs from "fs";
import fsPromises from "fs/promises";
import fetch from "node-fetch";
import dotenv from "dotenv";
import * as cheerio from "cheerio";

dotenv.config();

const TRACKS_FILE = "./tracks.json";
const EXPORT_FILE = "./new_tracks_for_tidal.txt"; // ⬅️ Nuovo file di export

// --- File helpers ---
async function loadPreviousTracks() {
  // Logica di caricamento e appiattimento (flat) rimane invariata per il confronto
  try {
    if (!fs.existsSync(TRACKS_FILE)) return [];
    const data = await fsPromises.readFile(TRACKS_FILE, "utf-8");
    const aggregatedData = JSON.parse(data);

    if (Array.isArray(aggregatedData) && aggregatedData.length > 0 && aggregatedData[0].tracks) {
        const flatTracks = [];
        aggregatedData.forEach(episode => {
            episode.tracks.forEach(track => {
                flatTracks.push({
                    title: track.title,
                    artist: track.artist,
                    albumDetails: track.albumDetails || '',
                    episodeTitle: episode.episodeTitle,
                    episodeUrl: episode.episodeUrl, 
                    date: episode.date 
                });
            });
        });
        return flatTracks;
    }
    return aggregatedData; 
    
  } catch (e) {
    console.error("❌ Errore caricando tracks.json:", e);
    return [];
  }
}

async function saveTracks(aggregatedTracks) {
  // Logica di salvataggio nel formato aggregato rimane invariata
  await fsPromises.writeFile(TRACKS_FILE, JSON.stringify(aggregatedTracks, null, 2));
}

async function exportNewTracks(tracks) {
    if (tracks.length === 0) {
        console.log("✅ Nessun nuovo brano da esportare.");
        return;
    }
    
    // 🆕 Logica di Pulizia Aggiunta
    const cleanedContent = tracks.map(t => {
        // Rimuovi eventuali parentesi quadre/tonde e il loro contenuto da Titolo e Artista
        const cleanedTitle = t.title
            .replace(/ \(([^)]+)\)/g, '') // Rimuove (feat. X), (Live), (Remix)
            .replace(/ \[([^\]]+)\]/g, '') // Rimuove [feat. X], [Live], [Remix]
            .trim();
            
        const cleanedArtist = t.artist
            .replace(/ \(([^)]+)\)/g, '')
            .replace(/ \[([^\]]+)\]/g, '')
            .trim();
            
        // Rimuovi i nomi delle etichette (Label) se fossero rimaste, 
        // anche se la logica di parsing dovrebbe averlo già fatto per l'album
        
        return `${cleanedArtist} - ${cleanedTitle}`;
    }).join('\n');
    
    // Scrivi il contenuto pulito
    await fsPromises.writeFile(EXPORT_FILE, cleanedContent);
    // ... (il resto della stampa rimane)
    // console.log(`\n🎉 Esportazione completata! ...`);
}

// --- Funzione di Aggregazione ---
function aggregateTracksByEpisode(tracks) {
    const episodesMap = new Map();
    
    tracks.forEach(track => {
        const key = track.episodeUrl;
        
        if (!episodesMap.has(key)) {
            episodesMap.set(key, {
                episodeTitle: track.episodeTitle,
                episodeUrl: track.episodeUrl,
                date: track.date,
                tracks: []
            });
        }
        
        episodesMap.get(key).tracks.push({
            title: track.title,
            artist: track.artist,
            albumDetails: track.albumDetails || ''
        });
    });

    return Array.from(episodesMap.values());
}

// --- Scraping helpers ---
async function fetchHtml(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`❌ Errore caricando ${url}: ${res.status}`);
  return res.text();
}

async function getEpisodeLinks(mainUrl) {
  const html = await fetchHtml(mainUrl);
  const $ = cheerio.load(html);
  const links = [];
  $("rps-cta-link[weblink]").each((_, el) => {
    const weblink = $(el).attr("weblink");
    if (weblink && weblink.startsWith("/audio/")) {
      links.push(`https://www.raiplaysound.it${weblink}`);
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
      rawTitle = rawTitle.replace(albumRegex, '').trim();
  }

  const title = rawTitle.trim();
  const artist = artistPart.trim();
  const cleanedTitle = title.replace(/^["']|["']$/g, '');

  if (!artist || !cleanedTitle || cleanedTitle.length < 5) {
      return null; 
  }
  
  return { title: cleanedTitle, artist, albumDetails };
}

async function getTracksFromEpisode(episodeUrl) {
  const html = await fetchHtml(episodeUrl);
  const $ = cheerio.load(html);
  const episodeTitle = $(".audio__header__title").first().text().trim();
  const date = $(".audio__header p.text-gray-medium").first().text().trim();
  
  let trackText = "";
  
  $(".audio__header p").each((i, el) => {
      const text = $(el).text().trim();
      if (text.includes("//") && text !== date) {
           trackText = text;
           return false;
      }
  });
  
  const trackStrings = trackText.split("//").map(t => t.trim()).filter(Boolean);

  return trackStrings.map(ts => {
    const parsed = parseTrackString(ts);
    return parsed ? { ...parsed, episodeTitle, episodeUrl, date } : null;
  }).filter(Boolean);
}

// --- Main ---
async function main() {
  console.log("🎧 Inizio scraping di Battiti...");
  
  // Non c'è bisogno di controllare le variabili TIDAL

  const previousTracks = await loadPreviousTracks();
  const episodeLinks = await getEpisodeLinks("https://www.raiplaysound.it/programmi/battiti");
  
  let allTracks = [...previousTracks];
  let newTracks = [];
  let scrapedCount = 0;

  for (const link of episodeLinks) {
    try {
        const episodeTracks = await getTracksFromEpisode(link);
        scrapedCount++;
        for (const track of episodeTracks) {
          const exists = allTracks.some(t => t.title === track.title && t.episodeUrl === track.episodeUrl);
          if (!exists) {
            allTracks.push(track);
            newTracks.push(track);
          }
        }
    } catch (e) {
        console.error(`❌ Errore durante l'elaborazione dell'episodio ${link}:`, e.message);
    }
  }

  console.log(`---`);
  console.log(`✅ Episodi analizzati: ${scrapedCount}/${episodeLinks.length}`);
  console.log(`🎧 Trovati **${newTracks.length}** nuovi brani (totale piatti: ${allTracks.length})`);

  // AGGREGAZIONE E SALVATAGGIO DEI RISULTATI
  const aggregatedResults = aggregateTracksByEpisode(allTracks);
  console.log(`💾 Salvati ${aggregatedResults.length} episodi in ${TRACKS_FILE} (formato aggregato)`);
  await saveTracks(aggregatedResults);
  
  // 🆕 ESPORTAZIONE DEI NUOVI BRANI
  await exportNewTracks(newTracks);
}

main().catch(err => console.error("❌ Errore generale nell'applicazione:", err.message || err));