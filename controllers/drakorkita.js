const axios = require("axios");
const cheerio = require('cheerio');
const {
    scrapeSeries,
    scrapeSeriesUpdated,
    scrapeMovie,
    scrapeNewMovie,
    scrapeOngoingSeries,
    scrapeCompletedSeries,
    scrapeGenres,
    scrapeDetailGenres,
    scrapeSearch,
    scrapeDetailAllType,
} = require('../scrapers/drakorkita');

// =================== CONFIGURATION ===================
const CONFIG = {
    REQUEST_TIMEOUT: 30000,
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    PROXY_SERVICES: [
        `https://api.allorigins.win/raw?url=`,
        `https://corsproxy.io/?`,
        `https://api.codetabs.com/v1/proxy?quest=`,
        `https://thingproxy.freeboard.io/fetch/`,
        `https://cors-anywhere.herokuapp.com/`
    ],
    ENABLE_DIRECT_REQUEST: true,
    ENABLE_PROXY_SERVICES: true
};

// =================== GLOBAL HEADERS ===================
const baseHeaders = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Cache-Control": "max-age=0",
    "DNT": "1"
};

// =================== ENHANCED REQUEST SYSTEM ===================
const debugLog = (prefix, data) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${prefix}:`, typeof data === 'string' ? data : JSON.stringify(data, null, 2));
};

const isValidUrl = (string) => {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
};

const getCleanBaseUrl = () => {
    let baseUrl = process.env.DRAKORKITA_URL || 'https://drakorkita.com';
    
    baseUrl = baseUrl.toString().trim();
    baseUrl = baseUrl.replace(/[^\x20-\x7E]/g, '');
    
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
        baseUrl = 'https://' + baseUrl;
    }
    
    baseUrl = baseUrl.replace(/\/$/, '');
    
    if (!isValidUrl(baseUrl)) {
        return 'https://drakorkita.com';
    }
    
    return baseUrl;
};

const buildUrl = (path) => {
    const baseUrl = getCleanBaseUrl();
    const fullUrl = `${baseUrl}${path}`;
    
    if (!isValidUrl(fullUrl)) {
        throw new Error(`Invalid URL constructed: ${fullUrl}`);
    }
    
    return fullUrl;
};

const makeRequest = async (url, endpointName) => {
    const startTime = Date.now();
    const requestId = `${endpointName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Enhanced headers for direct request
    const enhancedHeaders = {
        ...baseHeaders,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0'
    };
    
    // List of proxy services
    const proxyServices = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        `https://corsproxy.io/?${encodeURIComponent(url)}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
        `https://thingproxy.freeboard.io/fetch/${encodeURIComponent(url)}`,
        `https://cors-anywhere.herokuapp.com/${url}`
    ];
    
    // Try direct first if enabled
    if (CONFIG.ENABLE_DIRECT_REQUEST) {
        for (let attempt = 1; attempt <= CONFIG.MAX_RETRIES; attempt++) {
            try {
                debugLog(`🔗 ${requestId} - Direct attempt ${attempt}/${CONFIG.MAX_RETRIES}`, { url });
                
                const response = await axios.get(url, { 
                    headers: enhancedHeaders,
                    timeout: CONFIG.REQUEST_TIMEOUT,
                    validateStatus: () => true,
                    maxRedirects: 5
                });
                
                const duration = Date.now() - startTime;
                
                // Check if response is valid
                if (response.status === 200 && response.data && response.data.length > 100) {
                    debugLog(`✅ ${requestId} - Direct success (attempt ${attempt})`, { 
                        status: response.status,
                        duration: `${duration}ms`
                    });
                    return response;
                } else if (response.status === 403 || response.status === 429) {
                    debugLog(`⛔ ${requestId} - Direct blocked`, { 
                        status: response.status,
                        reason: 'Access forbidden or rate limited'
                    });
                    break; // Skip to proxies
                }
                
            } catch (directError) {
                const duration = Date.now() - startTime;
                debugLog(`⚠️ ${requestId} - Direct attempt ${attempt} failed`, { 
                    error: directError.message,
                    duration: `${duration}ms`
                });
                
                if (attempt === CONFIG.MAX_RETRIES) {
                    debugLog(`❌ ${requestId} - All direct attempts failed`);
                } else {
                    // Wait before next retry
                    await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY * attempt));
                }
            }
        }
    }
    
    // Try proxy services if enabled
    if (CONFIG.ENABLE_PROXY_SERVICES) {
        debugLog(`🔄 ${requestId} - Starting proxy attempts`, { 
            totalProxies: proxyServices.length 
        });
        
        for (let i = 0; i < proxyServices.length; i++) {
            try {
                const proxyUrl = proxyServices[i];
                const proxyName = proxyUrl.split('/')[2];
                
                debugLog(`🌐 ${requestId} - Trying proxy ${i+1}/${proxyServices.length}`, { 
                    proxyName,
                    proxyUrl
                });
                
                const response = await axios.get(proxyUrl, {
                    headers: {
                        'User-Agent': baseHeaders['User-Agent'],
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'Accept-Encoding': 'gzip, deflate, br'
                    },
                    timeout: CONFIG.REQUEST_TIMEOUT,
                    validateStatus: () => true
                });
                
                const duration = Date.now() - startTime;
                
                if (response.status === 200 && response.data && response.data.length > 100) {
                    debugLog(`✅ ${requestId} - Proxy ${i+1} success`, { 
                        proxyName,
                        duration: `${duration}ms`
                    });
                    return response;
                }
                
            } catch (proxyError) {
                const duration = Date.now() - startTime;
                debugLog(`⚠️ ${requestId} - Proxy ${i+1} failed`, { 
                    error: proxyError.message,
                    duration: `${duration}ms`
                });
            }
            
            // Small delay between proxy attempts
            if (i < proxyServices.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
    }
    
    // All methods failed
    const totalDuration = Date.now() - startTime;
    const errorMsg = `All request methods failed after ${totalDuration}ms`;
    
    debugLog(`❌ ${requestId} - Complete failure`, { 
        totalDuration: `${totalDuration}ms`,
        error: errorMsg
    });
    
    throw new Error(errorMsg);
};

// =================== DEBUG ENDPOINTS ===================
const debugEnv = async (req, res) => {
    try {
        debugLog('🔧 debugEnv - Called', {
            query: req.query,
            params: req.params
        });
        
        const envVars = {};
        Object.keys(process.env).forEach(key => {
            if (key.includes('DRAKOR') || key.includes('URL') || key.includes('VERCEL')) {
                envVars[key] = process.env[key];
            }
        });
        
        const responseData = {
            message: "Debug Information",
            timestamp: new Date().toISOString(),
            environment: envVars,
            cleanBaseUrl: getCleanBaseUrl(),
            config: CONFIG
        };
        
        debugLog('✅ debugEnv - Response ready', { dataLength: JSON.stringify(responseData).length });
        
        res.status(200).json(responseData);
    } catch (error) {
        debugLog('❌ debugEnv - Error', { error: error.message });
        res.status(500).json({
            message: "Debug failed",
            error: error.message
        });
    }
};

const testConnection = async (req, res) => {
    try {
        const baseUrl = getCleanBaseUrl();
        const testUrl = `${baseUrl}/all?media_type=tv&page=1`;
        
        debugLog('🧪 testConnection - Starting', { testUrl });
        
        const response = await makeRequest(testUrl, 'testConnection');
        
        const responseData = {
            message: "Connection test",
            testUrl,
            status: response.status,
            statusText: response.statusText,
            dataLength: response.data ? response.data.length : 0,
            sampleData: response.data ? response.data.substring(0, 500) : 'No data',
            timestamp: new Date().toISOString(),
            config: CONFIG
        };
        
        debugLog('✅ testConnection - Success', { 
            status: response.status,
            dataLength: responseData.dataLength
        });
        
        res.status(200).json(responseData);
    } catch (error) {
        debugLog('❌ testConnection - Failed', { error: error.message });
        res.status(500).json({
            message: "Connection test failed",
            error: error.message,
            baseUrl: getCleanBaseUrl(),
            timestamp: new Date().toISOString()
        });
    }
};

// =================== MAIN API ENDPOINTS ===================
const seriesAll = async (req, res) => {
    const startTime = Date.now();
    const requestId = `seriesAll_${Date.now()}`;
    
    try {
        const { page = 1 } = req.query;
        
        debugLog(`📺 ${requestId} - Starting`, { page });
        
        const url = buildUrl(`/all?media_type=tv&page=${page}`);
        
        const axiosResponse = await makeRequest(url, 'seriesAll');
        
        // Check for blocking or errors
        if (axiosResponse.status === 403 || axiosResponse.status === 429) {
            throw new Error(`Access blocked by server: ${axiosResponse.status}`);
        }
        
        if (axiosResponse.status === 500) {
            throw new Error(`Server error: ${axiosResponse.status}`);
        }
        
        const datas = await scrapeSeries(req, axiosResponse);
        
        const duration = Date.now() - startTime;
        
        debugLog(`✅ ${requestId} - Success`, { 
            page,
            duration: `${duration}ms`,
            itemsFound: datas.datas ? datas.datas.length : 0
        });
        
        res.status(200).json({
            message: "success",
            page: parseInt(page),
            ...datas,
            debug: {
                processingTime: `${duration}ms`,
                url: url,
                requestId: requestId
            }
        });
        
    } catch (error) {
        const duration = Date.now() - startTime;
        
        debugLog(`❌ ${requestId} - Error`, {
            error: error.message,
            duration: `${duration}ms`,
            page: req.query.page
        });
        
        res.status(500).json({
            message: error.message || "Internal server error",
            debug: {
                timestamp: new Date().toISOString(),
                page: req.query.page,
                processingTime: `${duration}ms`,
                requestId: requestId
            }
        });
    }
};

const seriesUpdated = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const url = buildUrl('/');
        const axiosResponse = await makeRequest(url, 'seriesUpdated');
        
        const datas = await scrapeSeriesUpdated(req, axiosResponse);
        const duration = Date.now() - startTime;
        
        res.status(200).json({
            message: "success",
            datas,
            debug: {
                processingTime: `${duration}ms`
            }
        });
    } catch (error) {
        debugLog('❌ seriesUpdated - Error', { error: error.message });
        res.status(500).json({
            message: error.message || "Error fetching updated series"
        });
    }
};

const movieAll = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { page = 1 } = req.query;
        const url = buildUrl(`/all?media_type=movie&page=${page}`);
        
        const axiosResponse = await makeRequest(url, 'movieAll');
        const datas = await scrapeMovie(req, axiosResponse);
        const duration = Date.now() - startTime;
        
        res.status(200).json({
            message: "success",
            page: parseInt(page),
            ...datas,
            debug: {
                processingTime: `${duration}ms`
            }
        });
    } catch (error) {
        debugLog('❌ movieAll - Error', { error: error.message });
        res.status(500).json({
            message: error.message || "Error fetching movies"
        });
    }
};

const newMovie = async (req, res) => {
    try {
        const url = buildUrl('/');
        const axiosResponse = await makeRequest(url, 'newMovie');
        const datas = await scrapeNewMovie(req, axiosResponse);
        
        res.status(200).json({
            message: "success",
            datas
        });
    } catch (error) {
        debugLog('❌ newMovie - Error', { error: error.message });
        res.status(500).json({
            message: error.message || "Error fetching new movies"
        });
    }
};

const ongoingSeries = async (req, res) => {
    try {
        const { page = 1 } = req.query;
        const url = buildUrl(`/all?status=returning&page=${page}`);
        
        const axiosResponse = await makeRequest(url, 'ongoingSeries');
        const datas = await scrapeOngoingSeries(req, axiosResponse);
        
        res.status(200).json({
            message: "success",
            page: parseInt(page),
            ...datas
        });
    } catch (error) {
        debugLog('❌ ongoingSeries - Error', { error: error.message });
        res.status(500).json({
            message: error.message || "Error fetching ongoing series"
        });
    }
};

const completedSeries = async (req, res) => {
    try {
        const { page = 1 } = req.query;
        const url = buildUrl(`/all?status=ended&page=${page}`);
        
        const axiosResponse = await makeRequest(url, 'completedSeries');
        const datas = await scrapeCompletedSeries(req, axiosResponse);
        
        res.status(200).json({
            message: "success",
            page: parseInt(page),
            ...datas
        });
    } catch (error) {
        debugLog('❌ completedSeries - Error', { error: error.message });
        res.status(500).json({
            message: error.message || "Error fetching completed series"
        });
    }
};

const genres = async (req, res) => {
    try {
        const url = buildUrl('/');
        const axiosResponse = await makeRequest(url, 'genres');
        const datas = await scrapeGenres(req, axiosResponse);
        
        res.status(200).json({
            message: "success",
            datas
        });
    } catch (error) {
        debugLog('❌ genres - Error', { error: error.message });
        res.status(500).json({
            message: error.message || "Error fetching genres"
        });
    }
};

const detailGenres = async (req, res) => {
    try {
        const { page = 1 } = req.query;
        const { endpoint } = req.params;
        const url = buildUrl(`/all?genre=${endpoint}&page=${page}`);
        
        const axiosResponse = await makeRequest(url, 'detailGenres');
        const datas = await scrapeDetailGenres({ page, endpoint }, axiosResponse);
        
        res.status(200).json({
            message: "success",
            page: parseInt(page),
            ...datas
        });
    } catch (error) {
        debugLog('❌ detailGenres - Error', { error: error.message });
        res.status(500).json({
            message: error.message || "Error fetching genre details"
        });
    }
};

const searchAll = async (req, res) => {
    try {
        const { s, page = 1 } = req.query;
        const url = buildUrl(`/all?q=${encodeURIComponent(s)}&page=${page}`);
        
        const axiosResponse = await makeRequest(url, 'searchAll');
        const datas = await scrapeSearch(req, axiosResponse);
        
        res.status(200).json({
            message: "success",
            page: parseInt(page),
            keyword: s,
            ...datas
        });
    } catch (error) {
        debugLog('❌ searchAll - Error', { error: error.message });
        res.status(500).json({
            message: error.message || "Error searching"
        });
    }
};

const detailAllType = async (req, res) => {
    try {
        const { endpoint } = req.params;
        const url = buildUrl(`/detail/${endpoint}`);
        
        const axiosResponse = await makeRequest(url, 'detailAllType');
        const data = await scrapeDetailAllType({ endpoint }, axiosResponse);
        
        res.status(200).json({
            message: "success",
            data
        });
    } catch (error) {
        debugLog('❌ detailAllType - Error', { error: error.message });
        res.status(500).json({
            message: error.message || "Error fetching details"
        });
    }
};

const getVideoUrl = async (req, res) => {
    const startTime = Date.now();
    const requestId = `getVideoUrl_${Date.now()}`;
    
    try {
        const { endpoint } = req.params;
        const { episode = 0, resolution = 0 } = req.query;
        
        debugLog(`🎥 ${requestId} - Starting`, { endpoint, episode, resolution });
        
        if (!endpoint) {
            return res.status(400).json({
                success: false,
                error: 'Endpoint is required'
            });
        }
        
        const epNum = parseInt(episode) || 0;
        const resNum = parseInt(resolution) || 0;
        
        const detailUrl = buildUrl(`/detail/${endpoint}`);
        const detailResponse = await makeRequest(detailUrl, 'getVideoUrl-detail');
        const $ = cheerio.load(detailResponse.data);
        
        const onclick = $("div.pagination > a").last().attr("onclick");
        if (!onclick) {
            return res.status(404).json({
                success: false,
                error: 'Video data not found'
            });
        }
        
        const movieIdAndTag = onclick.substring(onclick.indexOf("(") + 1, onclick.indexOf(")"));
        const movieId = movieIdAndTag.split(",")[0].replace(/^'|'$/g, '');
        const tag = movieIdAndTag.split(",")[1].replace(/^'|'$/g, '');
        
        const episodeUrl = buildUrl(`/api/episode.php?movie_id=${movieId}&tag=${tag}`);
        const { data: { episode_lists } } = await makeRequest(episodeUrl, 'getVideoUrl-episodes');
        const $eps = cheerio.load(episode_lists);
        const episodes = $eps("p > a").get();
        
        if (epNum >= episodes.length || epNum < 0) {
            return res.status(400).json({
                success: false,
                error: `Invalid episode. Available: 0-${episodes.length - 1}`
            });
        }
        
        const selectedEpisode = episodes[epNum];
        const epsWrap = $(selectedEpisode).attr('onclick');
        if (!epsWrap) {
            return res.status(404).json({
                success: false,
                error: 'Episode data not found'
            });
        }
        
        const epsIdAndTag = epsWrap.substring(epsWrap.indexOf("(") + 1, epsWrap.indexOf(")"));
        const epsId = epsIdAndTag.split(",")[0].replace(/^'|'$/g, '');
        const epsTag = epsIdAndTag.split(",")[1].replace(/^'|'$/g, '');
        
        const serverUrl = buildUrl(`/api/server.php?episode_id=${epsId}&tag=${epsTag}`);
        const { data: {data: { qua, server_id }} } = await makeRequest(serverUrl, 'getVideoUrl-server');
        
        const videoApiUrl = buildUrl(`/api/video.php?id=${epsId}&qua=${qua}&server_id=${server_id}&tag=${epsTag}`);
        const { data:{ file } } = await makeRequest(videoApiUrl, 'getVideoUrl-video');
        
        const videoUrls = file.split(",");
        
        if (resNum >= videoUrls.length || resNum < 0) {
            return res.status(400).json({
                success: false,
                error: `Invalid resolution. Available: 0-${videoUrls.length - 1}`
            });
        }
        
        const selectedUrl = videoUrls[resNum] || videoUrls[0];
        const videoUrl = selectedUrl.substring(
            selectedUrl.indexOf("https"), 
            selectedUrl.length
        ).replace(/['"]/g, '').trim();
        
        const duration = Date.now() - startTime;
        
        res.status(200).json({
            success: true,
            data: {
                episode: epNum + 1,
                total_episodes: episodes.length,
                resolution: resNum,
                total_resolutions: videoUrls.length,
                video_url: videoUrl,
                processing_time: `${duration}ms`,
                headers_required: {
                    referer: getCleanBaseUrl(),
                    origin: getCleanBaseUrl(),
                    'user-agent': baseHeaders['User-Agent']
                }
            }
        });
        
    } catch (error) {
        const duration = Date.now() - startTime;
        
        debugLog(`❌ ${requestId} - Error`, {
            error: error.message,
            duration: `${duration}ms`,
            endpoint: req.params.endpoint
        });
        
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get video URL',
            debug: {
                timestamp: new Date().toISOString(),
                endpoint: req.params.endpoint,
                processingTime: `${duration}ms`
            }
        });
    }
};

// =================== TAXI DRIVER 3 HTML PLAYER ===================
const taxiDriver3HTMLPlayer = async (req, res) => {
    const startTime = Date.now();
    const requestId = `taxiHTMLPlayer_${Date.now()}`;
    
    try {
        debugLog(`🚖 ${requestId} - Generating HTML player for Taxi Driver 3`);
        
        const endpoint = "taxi-driver-2025-v1cy/";
        const { episode = 1, resolution = 0 } = req.query;
        const epNum = parseInt(episode) || 1;
        const resNum = parseInt(resolution) || 0;
        
        // Get series detail
        const detailUrl = buildUrl(`/detail/${endpoint}`);
        const detailResponse = await makeRequest(detailUrl, 'taxiHTMLPlayer-detail');
        const $ = cheerio.load(detailResponse.data);
        
        // Extract series info
        const title = $('h1').first().text().trim() || "Taxi Driver 3 (2025)";
        const thumbnail = $('img[itemprop="image"]').attr('src') || 
                          "https://image.tmdb.org/t/p/w300/4zOMSvp4xLPEimMLWDuHMDO5N06.jpg";
        
        // Get episode data
        const onclick = $("div.pagination > a").last().attr("onclick");
        if (!onclick) {
            throw new Error('Episode data not found');
        }
        
        const movieIdAndTag = onclick.substring(onclick.indexOf("(") + 1, onclick.indexOf(")"));
        const movieId = movieIdAndTag.split(",")[0].replace(/^'|'$/g, '');
        const tag = movieIdAndTag.split(",")[1].replace(/^'|'$/g, '');
        
        // Get all episodes
        const episodeUrl = buildUrl(`/api/episode.php?movie_id=${movieId}&tag=${tag}`);
        const { data: { episode_lists } } = await makeRequest(episodeUrl, 'taxiHTMLPlayer-episodes');
        const $eps = cheerio.load(episode_lists);
        const episodeElements = $eps("p > a").get();
        
        // Generate episodes array with video URLs
        const episodes = [];
        const totalEpisodes = Math.min(episodeElements.length, 14); // Limit to released episodes
        
        // Get video URLs for all episodes
        for (let i = 0; i < totalEpisodes; i++) {
            try {
                const episodeElement = episodeElements[i];
                const epsWrap = $(episodeElement).attr('onclick');
                
                if (!epsWrap) continue;
                
                const epsIdAndTag = epsWrap.substring(epsWrap.indexOf("(") + 1, epsWrap.indexOf(")"));
                const epsId = epsIdAndTag.split(",")[0].replace(/^'|'$/g, '');
                const epsTag = epsIdAndTag.split(",")[1].replace(/^'|'$/g, '');
                
                // Get server info
                const serverUrl = buildUrl(`/api/server.php?episode_id=${epsId}&tag=${epsTag}`);
                const { data: {data: { qua, server_id }} } = await makeRequest(serverUrl, 'taxiHTMLPlayer-server');
                
                // Get video URLs
                const videoApiUrl = buildUrl(`/api/video.php?id=${epsId}&qua=${qua}&server_id=${server_id}&tag=${epsTag}`);
                const { data:{ file } } = await makeRequest(videoApiUrl, 'taxiHTMLPlayer-video');
                
                const videoUrls = file.split(",").map(url => {
                    const cleanUrl = url.substring(
                        url.indexOf("https"), 
                        url.length
                    ).replace(/['"]/g, '').trim();
                    return cleanUrl;
                }).filter(url => url.startsWith('https'));
                
                episodes.push({
                    episode: i + 1,
                    video_urls: videoUrls,
                    qualities: videoUrls.map((url, idx) => ({
                        index: idx,
                        quality: url.includes('1080') ? '1080p' : 
                                url.includes('720') ? '720p' : 
                                url.includes('480') ? '480p' : 'SD'
                    }))
                });
                
                // Add small delay
                await new Promise(resolve => setTimeout(resolve, 200));
                
            } catch (epError) {
                debugLog(`⚠️ ${requestId} - Error episode ${i + 1}`, { error: epError.message });
                // Add placeholder
                episodes.push({
                    episode: i + 1,
                    video_urls: [],
                    qualities: []
                });
            }
        }
        
        const duration = Date.now() - startTime;
        
        // Generate complete HTML with injected data
        const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <title>🚖 ${title} - For My Ayang 💖</title>
            
            <!-- SweetAlert2 CSS -->
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">
            
            <!-- Font Awesome -->
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
            
            <!-- Google Fonts -->
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Dancing+Script:wght@700&family=Quicksand:wght@400;500;600&display=swap" rel="stylesheet">
            
            <style>
                :root {
                    --pink-light: #ffb6c1;
                    --pink-medium: #ff69b4;
                    --pink-dark: #ff1493;
                    --purple-light: #d8bfd8;
                    --purple-medium: #9370db;
                    --white: #ffffff;
                    --black: #1a1a2e;
                    --gradient: linear-gradient(135deg, #ffb6c1 0%, #ff69b4 50%, #9370db 100%);
                    --gradient-dark: linear-gradient(135deg, #ff1493 0%, #8a2be2 100%);
                }
                
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                    -webkit-tap-highlight-color: transparent;
                }
                
                body {
                    font-family: 'Quicksand', sans-serif;
                    background: var(--gradient);
                    min-height: 100vh;
                    color: var(--black);
                    overflow-x: hidden;
                    padding: 15px;
                    padding-bottom: 80px;
                }
                
                .container {
                    max-width: 800px;
                    margin: 0 auto;
                }
                
                .header {
                    text-align: center;
                    padding: 20px 15px;
                    margin-bottom: 20px;
                    background: rgba(255, 255, 255, 0.9);
                    border-radius: 25px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
                    backdrop-filter: blur(10px);
                    border: 3px solid var(--pink-medium);
                    position: relative;
                    overflow: hidden;
                }
                
                .header h1 {
                    font-family: 'Dancing Script', cursive;
                    font-size: 2.8rem;
                    color: var(--pink-dark);
                    margin-bottom: 10px;
                }
                
                .header p {
                    font-size: 1.1rem;
                    color: #666;
                }
                
                .love-icon {
                    color: var(--pink-dark);
                    margin: 0 5px;
                    animation: heartbeat 1.5s infinite;
                }
                
                @keyframes heartbeat {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                }
                
                .video-wrapper {
                    background: rgba(255, 255, 255, 0.95);
                    border-radius: 20px;
                    padding: 15px;
                    margin-bottom: 20px;
                    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
                    border: 3px solid var(--purple-light);
                    position: relative;
                }
                
                .video-container {
                    position: relative;
                    padding-top: 56.25%;
                    background: #000;
                    border-radius: 15px;
                    overflow: hidden;
                    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
                }
                
                video {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    border-radius: 15px;
                }
                
                .controls {
                    background: rgba(255, 255, 255, 0.95);
                    border-radius: 20px;
                    padding: 20px;
                    margin-bottom: 20px;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
                    border: 3px solid var(--pink-light);
                }
                
                .control-group {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px;
                    justify-content: center;
                    margin-bottom: 15px;
                }
                
                .btn {
                    padding: 12px 20px;
                    border: none;
                    border-radius: 50px;
                    font-family: 'Quicksand', sans-serif;
                    font-weight: 600;
                    font-size: 1rem;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
                }
                
                .btn-primary {
                    background: var(--gradient-dark);
                    color: white;
                    flex: 1;
                    min-width: 120px;
                }
                
                .btn-primary:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 7px 15px rgba(0, 0, 0, 0.15);
                }
                
                .btn-secondary {
                    background: white;
                    color: var(--pink-dark);
                    border: 2px solid var(--pink-light);
                }
                
                .btn-secondary:hover {
                    background: var(--pink-light);
                    color: white;
                }
                
                .select-wrapper {
                    display: flex;
                    gap: 10px;
                    margin-top: 15px;
                }
                
                select {
                    flex: 1;
                    padding: 12px 15px;
                    border-radius: 50px;
                    border: 2px solid var(--purple-light);
                    background: white;
                    font-family: 'Quicksand', sans-serif;
                    font-weight: 500;
                    color: var(--black);
                    font-size: 1rem;
                    outline: none;
                    cursor: pointer;
                    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
                }
                
                .episode-section {
                    background: rgba(255, 255, 255, 0.95);
                    border-radius: 20px;
                    padding: 20px;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
                    border: 3px solid var(--purple-light);
                }
                
                .episode-section h3 {
                    font-family: 'Poppins', sans-serif;
                    color: var(--pink-dark);
                    margin-bottom: 15px;
                    text-align: center;
                    font-size: 1.5rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                }
                
                .episode-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
                    gap: 10px;
                    max-height: 200px;
                    overflow-y: auto;
                    padding: 10px;
                    border-radius: 15px;
                    background: rgba(255, 255, 255, 0.7);
                }
                
                .episode-btn {
                    padding: 12px 5px;
                    background: white;
                    border: 2px solid var(--pink-light);
                    border-radius: 15px;
                    color: var(--pink-dark);
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 50px;
                }
                
                .episode-btn:hover {
                    background: var(--pink-light);
                    color: white;
                    transform: translateY(-3px);
                }
                
                .episode-btn.active {
                    background: var(--gradient-dark);
                    color: white;
                    border-color: var(--pink-dark);
                    box-shadow: 0 5px 15px rgba(255, 20, 147, 0.3);
                }
                
                .loading {
                    text-align: center;
                    padding: 30px;
                    color: var(--pink-dark);
                    font-size: 1.2rem;
                }
                
                .loading i {
                    font-size: 2rem;
                    margin-bottom: 10px;
                    display: block;
                    animation: spin 1.5s linear infinite;
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                .floating-hearts {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                    z-index: -1;
                }
                
                .heart {
                    position: absolute;
                    color: rgba(255, 105, 180, 0.3);
                    font-size: 20px;
                    animation: float 15s infinite linear;
                }
                
                @keyframes float {
                    0% { transform: translateY(100vh) rotate(0deg); opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { transform: translateY(-100px) rotate(360deg); opacity: 0; }
                }
                
                @media (max-width: 600px) {
                    .header h1 {
                        font-size: 2.2rem;
                    }
                    
                    .control-group {
                        flex-direction: column;
                    }
                    
                    .btn {
                        width: 100%;
                    }
                    
                    .select-wrapper {
                        flex-direction: column;
                    }
                    
                    .episode-grid {
                        grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
                    }
                    
                    body {
                        padding: 10px;
                        padding-bottom: 100px;
                    }
                }
                
                ::-webkit-scrollbar {
                    width: 8px;
                }
                
                ::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.3);
                    border-radius: 10px;
                }
                
                ::-webkit-scrollbar-thumb {
                    background: var(--pink-medium);
                    border-radius: 10px;
                }
                
                @media (hover: none) {
                    video::-webkit-media-controls {
                        display: none;
                    }
                }
            </style>
        </head>
        <body>
            <div class="floating-hearts" id="heartsContainer"></div>
            
            <div class="container">
                <div class="header">
                    <h1>🚖 ${title} <i class="fas fa-heart love-icon"></i></h1>
                    <p>For My Ayang 💖 • Episode ${epNum} of ${totalEpisodes}</p>
                </div>
                
                <div class="video-wrapper">
                    <div class="video-container">
                        <div class="loading" id="loading">
                            <i class="fas fa-heartbeat"></i>
                            Loading your special video...
                        </div>
                        <video id="videoPlayer" controls crossorigin="anonymous" style="display: none;">
                            Your browser does not support the video tag.
                        </video>
                    </div>
                </div>
                
                <div class="controls">
                    <div class="control-group">
                        <button class="btn btn-primary" onclick="prevEpisode()">
                            <i class="fas fa-chevron-left"></i> Prev
                        </button>
                        <button class="btn btn-primary" onclick="nextEpisode()">
                            Next <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                    
                    <div class="select-wrapper">
                        <select id="episodeSelect" onchange="changeEpisode(this.value)">
                            <option value="">Select Episode</option>
                            ${episodes.map((ep, idx) => `
                                <option value="${idx}" ${idx === (epNum - 1) ? 'selected' : ''}>
                                    Episode ${ep.episode}
                                </option>
                            `).join('')}
                        </select>
                        
                        <select id="qualitySelect" onchange="changeQuality()">
                            <option value="">Select Quality</option>
                            ${epNum <= episodes.length && episodes[epNum - 1]?.qualities?.map((q, idx) => `
                                <option value="${idx}" ${idx === resNum ? 'selected' : ''}>
                                    ${q.quality}
                                </option>
                            `).join('') || `
                                <option value="0">1080p</option>
                                <option value="1">720p</option>
                                <option value="2">480p</option>
                            `}
                        </select>
                    </div>
                    
                    <div style="text-align: center; margin-top: 15px;">
                        <button class="btn btn-secondary" onclick="loadCurrentVideo()">
                            <i class="fas fa-redo"></i> Reload Video
                        </button>
                    </div>
                </div>
                
                <div class="episode-section">
                    <h3><i class="fas fa-list"></i> Episodes (${totalEpisodes} Released)</h3>
                    <div class="episode-grid" id="episodeList">
                        ${episodes.map((ep, idx) => `
                            <button class="episode-btn ${idx === (epNum - 1) ? 'active' : ''}" 
                                    onclick="loadEpisode(${idx}, 0)">
                                ${ep.episode}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
            
            <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
            <script src="https://cdn.jsdelivr.net/npm/hls.js@1.4.0/dist/hls.min.js"></script>
            
            <script>
                // =================== INJECTED DATA FROM SERVER ===================
                const episodesData = ${JSON.stringify(episodes)};
                let currentEpisode = ${epNum - 1};
                let currentQuality = ${resNum};
                let hlsPlayer = null;
                
                console.log('Taxi Driver 3 Data Loaded:', episodesData);
                
                function createFloatingHearts() {
                    const container = document.getElementById('heartsContainer');
                    for (let i = 0; i < 15; i++) {
                        const heart = document.createElement('div');
                        heart.className = 'heart';
                        heart.innerHTML = '❤️';
                        heart.style.left = \`\${Math.random() * 100}%\`;
                        heart.style.animationDuration = \`\${15 + Math.random() * 10}s\`;
                        heart.style.animationDelay = \`\${Math.random() * 5}s\`;
                        heart.style.fontSize = \`\${15 + Math.random() * 15}px\`;
                        container.appendChild(heart);
                    }
                }
                
                function showRomanticPopups() {
                    Swal.fire({
                        title: 'Halooo ayang acuwww 💖',
                        html: 'Nih Taxi Driver 3 buat kamu! Moga bisa maapin aku yaa 😘<br><br>Episode ${epNum} dari ${totalEpisodes} yang udah rilis',
                        icon: 'info',
                        background: 'linear-gradient(135deg, #ffb6c1 0%, #ff69b4 100%)',
                        color: '#fff',
                        confirmButtonText: 'Maksiih sayang ❤️',
                        confirmButtonColor: '#ff1493',
                        showClass: {
                            popup: 'animate__animated animate__heartBeat'
                        }
                    }).then((result) => {
                        if (result.isConfirmed) {
                            setTimeout(() => {
                                Swal.fire({
                                    title: 'Selamatt nontonn cintahhh 🎬💕',
                                    html: 'Love youuuuuu~ 😍✨<br><br>Tekan tombol next buat lanjut episode berikutnya!',
                                    icon: 'success',
                                    background: 'linear-gradient(135deg, #9370db 0%, #ff69b4 100%)',
                                    color: '#fff',
                                    confirmButtonText: 'Aku jugaa sayang! 💖',
                                    confirmButtonColor: '#9370db',
                                    showClass: {
                                        popup: 'animate__animated animate__tada'
                                    }
                                });
                            }, 800);
                        }
                    });
                }
                
                function loadEpisode(episodeIndex, qualityIndex) {
                    currentEpisode = episodeIndex;
                    currentQuality = qualityIndex;
                    updateEpisodeUI();
                    loadVideo();
                }
                
                function updateEpisodeUI() {
                    document.querySelectorAll('.episode-btn').forEach((btn, idx) => {
                        btn.classList.toggle('active', idx === currentEpisode);
                    });
                    document.getElementById('episodeSelect').value = currentEpisode;
                    
                    const episode = episodesData[currentEpisode];
                    const qualitySelect = document.getElementById('qualitySelect');
                    qualitySelect.innerHTML = '<option value="">Select Quality</option>';
                    
                    if (episode && episode.qualities && episode.qualities.length > 0) {
                        episode.qualities.forEach((q, idx) => {
                            const option = document.createElement('option');
                            option.value = idx;
                            option.textContent = q.quality;
                            if (idx === currentQuality) option.selected = true;
                            qualitySelect.appendChild(option);
                        });
                    } else {
                        ['1080p', '720p', '480p'].forEach((q, idx) => {
                            const option = document.createElement('option');
                            option.value = idx;
                            option.textContent = q;
                            if (idx === currentQuality) option.selected = true;
                            qualitySelect.appendChild(option);
                        });
                    }
                }
                
                function loadVideo() {
                    const episode = episodesData[currentEpisode];
                    if (!episode || !episode.video_urls || episode.video_urls.length === 0) {
                        showError('No video URL available for this episode');
                        return;
                    }
                    
                    const videoUrl = episode.video_urls[currentQuality] || episode.video_urls[0];
                    
                    if (!videoUrl) {
                        showError('Video URL not found');
                        return;
                    }
                    
                    console.log('Loading video:', videoUrl);
                    
                    document.getElementById('loading').style.display = 'block';
                    document.getElementById('videoPlayer').style.display = 'none';
                    
                    const video = document.getElementById('videoPlayer');
                    
                    if (hlsPlayer) {
                        hlsPlayer.destroy();
                        hlsPlayer = null;
                    }
                    
                    if (videoUrl.includes('.m3u8')) {
                        if (Hls.isSupported()) {
                            hlsPlayer = new Hls();
                            hlsPlayer.loadSource(videoUrl);
                            hlsPlayer.attachMedia(video);
                            hlsPlayer.on(Hls.Events.MANIFEST_PARSED, () => {
                                hideLoadingAndPlay(video);
                            });
                            
                            hlsPlayer.on(Hls.Events.ERROR, (event, data) => {
                                console.error('HLS error:', data);
                                if (data.fatal) {
                                    showError('Playback error. Try another quality.');
                                }
                            });
                        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                            video.src = videoUrl;
                            hideLoadingAndPlay(video);
                        } else {
                            showError('HLS not supported in this browser');
                        }
                    } else {
                        video.src = videoUrl;
                        hideLoadingAndPlay(video);
                    }
                }
                
                function hideLoadingAndPlay(video) {
                    document.getElementById('loading').style.display = 'none';
                    video.style.display = 'block';
                    video.play().catch(e => {
                        console.log('Autoplay prevented:', e);
                        Swal.fire({
                            title: 'Click to Play 💖',
                            text: 'Tap the play button to start watching',
                            icon: 'info',
                            confirmButtonText: 'OK'
                        });
                    });
                }
                
                function showError(message) {
                    Swal.fire({
                        title: 'Error',
                        text: message,
                        icon: 'error',
                        confirmButtonText: 'OK'
                    });
                    document.getElementById('loading').style.display = 'none';
                }
                
                function prevEpisode() {
                    if (currentEpisode > 0) {
                        loadEpisode(currentEpisode - 1, currentQuality);
                    } else {
                        Swal.fire({
                            title: 'First Episode',
                            text: 'This is already the first episode',
                            icon: 'info',
                            timer: 1500,
                            showConfirmButton: false
                        });
                    }
                }
                
                function nextEpisode() {
                    if (currentEpisode < episodesData.length - 1) {
                        loadEpisode(currentEpisode + 1, currentQuality);
                    } else {
                        Swal.fire({
                            title: 'Last Episode',
                            text: 'This is the latest released episode',
                            icon: 'info',
                            timer: 1500,
                            showConfirmButton: false
                        });
                    }
                }
                
                function changeEpisode(episodeIndex) {
                    if (episodeIndex !== '') {
                        loadEpisode(parseInt(episodeIndex), currentQuality);
                    }
                }
                
                function changeQuality() {
                    const qualitySelect = document.getElementById('qualitySelect');
                    if (qualitySelect.value !== '') {
                        currentQuality = parseInt(qualitySelect.value);
                        loadVideo();
                    }
                }
                
                function loadCurrentVideo() {
                    loadVideo();
                }
                
                document.addEventListener('keydown', (e) => {
                    switch(e.key) {
                        case 'ArrowLeft':
                            prevEpisode();
                            break;
                        case 'ArrowRight':
                            nextEpisode();
                            break;
                        case ' ':
                            const video = document.getElementById('videoPlayer');
                            if (video.paused) video.play();
                            else video.pause();
                            e.preventDefault();
                            break;
                        case 'f':
                        case 'F':
                            if (document.fullscreenElement) {
                                document.exitFullscreen();
                            } else {
                                document.getElementById('videoPlayer').requestFullscreen();
                            }
                            break;
                    }
                });
                
                let touchStartX = 0;
                let touchEndX = 0;
                
                document.addEventListener('touchstart', e => {
                    touchStartX = e.changedTouches[0].screenX;
                });
                
                document.addEventListener('touchend', e => {
                    touchEndX = e.changedTouches[0].screenX;
                    handleSwipe();
                });
                
                function handleSwipe() {
                    const swipeThreshold = 50;
                    const diff = touchStartX - touchEndX;
                    
                    if (Math.abs(diff) > swipeThreshold) {
                        if (diff > 0) {
                            nextEpisode();
                            Swal.fire({
                                title: 'Next Episode ➡️',
                                text: 'Loading next episode...',
                                icon: 'info',
                                timer: 1000,
                                showConfirmButton: false
                            });
                        } else {
                            prevEpisode();
                            Swal.fire({
                                title: 'Previous Episode ⬅️',
                                text: 'Loading previous episode...',
                                icon: 'info',
                                timer: 1000,
                                showConfirmButton: false
                            });
                        }
                    }
                }
                
                document.addEventListener('DOMContentLoaded', function() {
                    console.log('Taxi Driver 3 Player Initialized');
                    
                    createFloatingHearts();
                    
                    setTimeout(() => {
                        showRomanticPopups();
                    }, 1000);
                    
                    loadVideo();
                    
                    const style = document.createElement('style');
                    style.textContent = \`
                        .swal2-popup {
                            border-radius: 25px !important;
                            border: 3px solid #ff69b4 !important;
                        }
                    \`;
                    document.head.appendChild(style);
                });
                
                window.addEventListener('online', () => {
                    console.log('Connection restored');
                    Swal.fire({
                        title: 'Connection Restored ✅',
                        text: 'You are back online!',
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false
                    });
                });
                
                window.addEventListener('offline', () => {
                    console.log('Connection lost');
                    Swal.fire({
                        title: 'Connection Lost 📶',
                        text: 'Please check your internet connection',
                        icon: 'warning',
                        timer: 3000,
                        showConfirmButton: false
                    });
                });
            </script>
        </body>
        </html>
        `;
        
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
        
    } catch (error) {
        const duration = Date.now() - startTime;
        
        debugLog(`❌ ${requestId} - Error generating HTML player`, {
            error: error.message,
            duration: `${duration}ms`
        });
        
        // Error page
        const errorHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Error - Taxi Driver 3 Player</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    text-align: center; 
                    padding: 50px; 
                    background: linear-gradient(135deg, #ff6b6b 0%, #ff4757 100%);
                    color: white;
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                }
                .error-container {
                    background: rgba(255, 255, 255, 0.1);
                    padding: 40px;
                    border-radius: 20px;
                    backdrop-filter: blur(10px);
                    max-width: 600px;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                }
                h1 { 
                    color: #ffdd59; 
                    font-size: 3rem;
                    margin-bottom: 20px;
                }
                .error-details {
                    text-align: left;
                    background: rgba(0, 0, 0, 0.2);
                    padding: 20px;
                    border-radius: 10px;
                    margin: 20px 0;
                    font-family: monospace;
                }
                .action-buttons {
                    display: flex;
                    gap: 15px;
                    justify-content: center;
                    margin-top: 30px;
                    flex-wrap: wrap;
                }
                a { 
                    color: white; 
                    text-decoration: none;
                    padding: 12px 30px;
                    border-radius: 50px;
                    font-weight: bold;
                    transition: all 0.3s ease;
                }
                .btn-primary {
                    background: #3742fa;
                }
                .btn-secondary {
                    background: rgba(255, 255, 255, 0.2);
                }
                a:hover { 
                    text-decoration: none; 
                    transform: translateY(-2px);
                    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
                }
            </style>
        </head>
        <body>
            <div class="error-container">
                <h1>🚖 Error Loading Taxi Driver 3</h1>
                <h2>Failed to generate player page</h2>
                
                <div class="error-details">
                    <p><strong>Error:</strong> ${error.message}</p>
                    <p><strong>Request ID:</strong> ${requestId}</p>
                    <p><strong>Processing Time:</strong> ${duration}ms</p>
                    <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
                </div>
                
                <div class="action-buttons">
                    <a href="/api/drakorkita/taxi-driver-3/player" class="btn-primary">
                        Try Again
                    </a>
                    <a href="/api/drakorkita/search?s=taxi+driver" class="btn-secondary">
                        Search Taxi Driver
                    </a>
                    <a href="/" class="btn-secondary">
                        Go Home
                    </a>
                </div>
            </div>
        </body>
        </html>
        `;
        
        res.setHeader('Content-Type', 'text/html');
        res.status(500).send(errorHtml);
    }
};

// =================== SIMPLE TAXI DRIVER 3 INFO ===================
const taxiDriver3SimpleInfo = async (req, res) => {
    try {
        const endpoint = "taxi-driver-2025-v1cy/";
        const detailUrl = buildUrl(`/detail/${endpoint}`);
        
        const detailResponse = await makeRequest(detailUrl, 'taxiSimpleInfo');
        const $ = cheerio.load(detailResponse.data);
        
        const title = $('h1').first().text().trim() || "Taxi Driver 3 (2025)";
        const thumbnail = $('img[itemprop="image"]').attr('src') || 
                          "https://image.tmdb.org/t/p/w300/4zOMSvp4xLPEimMLWDuHMDO5N06.jpg";
        
        // Generate simple HTML page with links
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title} - Quick Links</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    text-align: center; 
                    padding: 50px; 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                }
                .container {
                    max-width: 800px;
                    margin: 0 auto;
                    background: rgba(255, 255, 255, 0.1);
                    padding: 40px;
                    border-radius: 20px;
                    backdrop-filter: blur(10px);
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                }
                h1 { 
                    color: #ffdd59; 
                    margin-bottom: 30px;
                }
                .poster {
                    max-width: 300px;
                    border-radius: 15px;
                    margin: 20px 0;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                }
                .episode-links {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
                    gap: 10px;
                    margin: 30px 0;
                }
                .ep-link {
                    background: rgba(255, 255, 255, 0.2);
                    color: white;
                    padding: 15px 5px;
                    border-radius: 10px;
                    text-decoration: none;
                    font-weight: bold;
                    transition: all 0.3s ease;
                }
                .ep-link:hover {
                    background: rgba(255, 255, 255, 0.3);
                    transform: translateY(-3px);
                }
                .quick-info {
                    background: rgba(255, 255, 255, 0.1);
                    padding: 20px;
                    border-radius: 15px;
                    margin: 20px 0;
                    text-align: left;
                }
                .api-link {
                    display: inline-block;
                    margin: 10px;
                    padding: 12px 25px;
                    background: #ff4757;
                    color: white;
                    text-decoration: none;
                    border-radius: 50px;
                    font-weight: bold;
                    transition: all 0.3s ease;
                }
                .api-link:hover {
                    background: #ff6b81;
                    transform: translateY(-2px);
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🚖 ${title}</h1>
                <img src="${thumbnail}" alt="${title}" class="poster">
                
                <div class="quick-info">
                    <h3>📋 Quick Access</h3>
                    <p>Choose an episode to watch:</p>
                </div>
                
                <div class="episode-links">
                    ${Array.from({length: 14}, (_, i) => `
                        <a href="/api/drakorkita/taxi-driver-3/player?episode=${i + 1}" class="ep-link">
                            E${i + 1}
                        </a>
                    `).join('')}
                </div>
                
                <div style="margin-top: 30px;">
                    <a href="/api/drakorkita/taxi-driver-3/player" class="api-link">
                        🎬 Full Player (Episode 1)
                    </a>
                    <a href="/api/drakorkita/search?s=taxi+driver" class="api-link">
                        🔍 Search Taxi Driver
                    </a>
                    <a href="/" class="api-link">
                        🏠 Go Home
                    </a>
                </div>
                
                <div style="margin-top: 40px; font-size: 0.9rem; opacity: 0.8;">
                    <p>Auto-generated from Drakorkita • Updated: ${new Date().toLocaleDateString()}</p>
                </div>
            </div>
        </body>
        </html>
        `;
        
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
        
    } catch (error) {
        const errorHtml = `
        <html>
        <body style="text-align: center; padding: 50px;">
            <h1 style="color: #ff4757;">Error Loading Taxi Driver 3 Info</h1>
            <p>${error.message}</p>
            <a href="/">Go Back</a>
        </body>
        </html>
        `;
        
        res.setHeader('Content-Type', 'text/html');
        res.status(500).send(errorHtml);
    }
};

// =================== HEALTH CHECK ===================
const healthCheck = async (req, res) => {
    try {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            environment: process.env.NODE_ENV,
            baseUrl: getCleanBaseUrl(),
            config: CONFIG,
            vercel: {
                region: process.env.VERCEL_REGION,
                url: process.env.VERCEL_URL
            }
        };
        
        debugLog('🏥 healthCheck - OK', health);
        
        res.status(200).json(health);
    } catch (error) {
        debugLog('❌ healthCheck - Error', { error: error.message });
        res.status(500).json({
            status: 'unhealthy',
            error: error.message
        });
    }
};

// =================== UPDATE CONFIG ===================
const updateConfig = async (req, res) => {
    try {
        const { enableDirect, enableProxies, timeout } = req.body;
        
        if (enableDirect !== undefined) CONFIG.ENABLE_DIRECT_REQUEST = enableDirect;
        if (enableProxies !== undefined) CONFIG.ENABLE_PROXY_SERVICES = enableProxies;
        if (timeout !== undefined) CONFIG.REQUEST_TIMEOUT = timeout;
        
        debugLog('⚙️  updateConfig - Updated', { newConfig: CONFIG });
        
        res.status(200).json({
            message: "Configuration updated",
            config: CONFIG,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        debugLog('❌ updateConfig - Error', { error: error.message });
        res.status(500).json({
            message: "Failed to update config",
            error: error.message
        });
    }
};

module.exports = {
    // Main API endpoints
    seriesAll,
    seriesUpdated,
    movieAll,
    newMovie,
    ongoingSeries,
    completedSeries,
    genres,
    detailGenres,
    searchAll,
    detailAllType,
    getVideoUrl,
    
    // Debug endpoints
    debugEnv,
    testConnection,
    healthCheck,
    updateConfig,
    
    // Taxi Driver 3 endpoints
    taxiDriver3HTMLPlayer,
    taxiDriver3SimpleInfo,
    
    // Utility functions for testing
    makeRequest,
    getCleanBaseUrl
};
