const logNewTracks = (count, totalHistorical) => {
    console.log(`🎧 Found **${count}** new tracks (total historical: ${totalHistorical})`);
};

const logEpisodesAggregated = (count) => {
    console.log(`💾 Found **${count}** episodes aggregated (tracks.json)`);
};

const logCompletion = (message) => {
    console.log(`✅ ${message}`);
};

const logAnalysisSummary = (scraped, total, skipped) => {
    console.log(`---`);
    const processed = total - skipped; 
    console.log(`✅ Episodes analyzed: ${processed}/${total} (Skipped: ${skipped})`);
};

const logStart = (url) => {
    console.log(`🎧 Start scraping ${url}`);
};

const logInterruption = (link) => {
    console.log(`⏭️ Found known episode (${link}). Stopping incremental analysis.`);
};

const logError = (context, message) => {
    console.error(`❌ Error during ${context}: ${message}`);
};

export {
    logNewTracks,
    logEpisodesAggregated,
    logCompletion,
    logAnalysisSummary,
    logStart,
    logInterruption,
    logError
};