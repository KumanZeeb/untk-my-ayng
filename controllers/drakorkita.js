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

const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36"
};

// =================== URL HELPER FUNCTIONS ===================
const isValidUrl = (string) => {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
};

const getCleanBaseUrl = () => {
    // Priority: env variable → hardcoded fallback
    let baseUrl = process.env.DRAKORKITA_URL || 'https://drakorkita.com';
    
    // Debug logging
    console.log('🔍 URL DEBUG - Original DRAKORKITA_URL:', baseUrl);
    console.log('🔍 URL DEBUG - Type:', typeof baseUrl);
    console.log('🔍 URL DEBUG - Raw value:', JSON.stringify(baseUrl));
    
    // Convert to string and trim
    baseUrl = baseUrl.toString().trim();
    
    // Remove any invisible characters
    baseUrl = baseUrl.replace(/[^\x20-\x7E]/g, '');
    
    // Ensure it has protocol
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
        console.log('⚠️  Adding https:// to URL');
        baseUrl = 'https://' + baseUrl;
    }
    
    // Remove trailing slash
    baseUrl = baseUrl.replace(/\/$/, '');
    
    // Validate final URL
    if (!isValidUrl(baseUrl)) {
        console.error('❌ ERROR: Invalid URL after cleaning:', baseUrl);
        // Fallback to hardcoded URL
        return 'https://drakorkita.com';
    }
    
    console.log('✅ Final cleaned baseUrl:', baseUrl);
    return baseUrl;
};

const buildUrl = (path) => {
    const baseUrl = getCleanBaseUrl();
    const fullUrl = `${baseUrl}${path}`;
    
    console.log('🔗 Building URL:', {
        baseUrl,
        path,
        fullUrl,
        isValid: isValidUrl(fullUrl)
    });
    
    if (!isValidUrl(fullUrl)) {
        throw new Error(`Invalid URL constructed: ${fullUrl}`);
    }
    
    return fullUrl;
};

// =================== DEBUG ENDPOINTS ===================
const debugEnv = async (req, res) => {
    try {
        const envVars = {};
        const allKeys = Object.keys(process.env);
        
        // Get all environment variables (filtered for security)
        allKeys.forEach(key => {
            if (key.includes('DRAKOR') || key.includes('URL') || key.includes('VERCEL') || key.includes('NODE')) {
                envVars[key] = process.env[key];
            }
        });
        
        // Test URL construction
        const testUrls = [
            'https://drakorkita.com',
            'http://drakorkita.com',
            'drakorkita.com',
            process.env.DRAKORKITA_URL || 'NOT_SET'
        ];
        
        const urlTests = testUrls.map(url => {
            try {
                new URL(url);
                return {
                    url,
                    valid: true,
                    length: url.length,
                    protocol: new URL(url).protocol,
                    hostname: new URL(url).hostname
                };
            } catch (error) {
                return {
                    url,
                    valid: false,
                    error: error.message,
                    charCodes: [...url].map(c => c.charCodeAt(0)),
                    visibleChars: url.replace(/[^\x20-\x7E]/g, '')
                };
            }
        });
        
        res.status(200).json({
            message: "Debug Information",
            timestamp: new Date().toISOString(),
            environment: {
                DRAKORKITA_URL: process.env.DRAKORKITA_URL,
                DRAKORKITA_URL_TYPE: typeof process.env.DRAKORKITA_URL,
                DRAKORKITA_URL_LENGTH: process.env.DRAKORKITA_URL ? process.env.DRAKORKITA_URL.length : 0,
                NODE_ENV: process.env.NODE_ENV,
                all_env_keys: Object.keys(process.env).filter(k => 
                    k.includes('URL') || k.includes('DRAKOR') || k.includes('VERCEL')
                )
            },
            urlTests,
            cleanBaseUrl: getCleanBaseUrl(),
            request: {
                headers: Object.keys(req.headers),
                query: req.query,
                params: req.params,
                originalUrl: req.originalUrl
            }
        });
    } catch (error) {
        console.error('Debug endpoint error:', error);
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
        
        console.log('🔍 Testing connection to:', testUrl);
        
        const response = await axios.get(testUrl, {
            headers,
            timeout: 10000,
            validateStatus: () => true // Accept all status codes
        });
        
        res.status(200).json({
            message: "Connection test",
            testUrl,
            status: response.status,
            statusText: response.statusText,
            headers: Object.keys(response.headers),
            dataLength: response.data ? response.data.length : 0,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Connection test failed:', error.message);
        res.status(500).json({
            message: "Connection test failed",
            error: error.message,
            stack: error.stack
        });
    }
};

// =================== MAIN API ENDPOINTS ===================
const seriesAll = async (req, res) => {
    try {
        const { page = 1 } = req.query;
        
        console.log('📺 seriesAll called with page:', page);
        
        const url = buildUrl(`/all?media_type=tv&page=${page}`);
        
        console.log('🔍 Fetching from URL:', url);
        
        const axiosResponse = await axios.get(url, { 
            headers,
            timeout: 15000
        });

        const datas = await scrapeSeries(req, axiosResponse);

        res.status(200).json({
            message: "success",
            page: parseInt(page),
            ...datas
        });
    } catch (error) {
        console.error('❌ ERROR in seriesAll:', error.message);
        console.error('Stack:', error.stack);
        console.error('Request query:', req.query);
        console.error('Environment check:', {
            DRAKORKITA_URL: process.env.DRAKORKITA_URL,
            NODE_ENV: process.env.NODE_ENV
        });
        
        res.status(500).json({
            message: error.message || "Internal server error",
            error_type: error.constructor.name,
            debug: {
                timestamp: new Date().toISOString(),
                page: req.query.page,
                env_url: process.env.DRAKORKITA_URL
            }
        });
    }
};

const seriesUpdated = async (req, res) => {
    try {
        const url = buildUrl('/');
        
        console.log('🔍 seriesUpdated fetching:', url);
        
        const axiosResponse = await axios.get(url, { 
            headers,
            timeout: 15000
        });

        const datas = await scrapeSeriesUpdated(req, axiosResponse);

        res.status(200).json({
            message: "success",
            datas
        });
    } catch (error) {
        console.error('❌ ERROR in seriesUpdated:', error.message);
        res.status(500).json({
            message: error.message || "Error fetching updated series"
        });
    }
};

const movieAll = async (req, res) => {
    try {
        const { page = 1 } = req.query;
        const url = buildUrl(`/all?media_type=movie&page=${page}`);
        
        console.log('🎬 movieAll fetching:', url);
        
        const axiosResponse = await axios.get(url, { 
            headers,
            timeout: 15000
        });

        const datas = await scrapeMovie(req, axiosResponse);

        res.status(200).json({
            message: "success",
            page: parseInt(page),
            ...datas
        });
    } catch (error) {
        console.error('❌ ERROR in movieAll:', error.message);
        res.status(500).json({
            message: error.message || "Error fetching movies"
        });
    }
};

const newMovie = async (req, res) => {
    try {
        const url = buildUrl('/');
        
        console.log('🎬 newMovie fetching:', url);
        
        const axiosResponse = await axios.get(url, { 
            headers,
            timeout: 15000
        });

        const datas = await scrapeNewMovie(req, axiosResponse);

        res.status(200).json({
            message: "success",
            datas
        });
    } catch (error) {
        console.error('❌ ERROR in newMovie:', error.message);
        res.status(500).json({
            message: error.message || "Error fetching new movies"
        });
    }
};

const ongoingSeries = async (req, res) => {
    try {
        const { page = 1 } = req.query;
        const url = buildUrl(`/all?status=returning&page=${page}`);
        
        console.log('📺 ongoingSeries fetching:', url);
        
        const axiosResponse = await axios.get(url, { 
            headers,
            timeout: 15000
        });

        const datas = await scrapeOngoingSeries(req, axiosResponse);

        res.status(200).json({
            message: "success",
            page: parseInt(page),
            ...datas
        });
    } catch (error) {
        console.error('❌ ERROR in ongoingSeries:', error.message);
        res.status(500).json({
            message: error.message || "Error fetching ongoing series"
        });
    }
};

const completedSeries = async (req, res) => {
    try {
        const { page = 1 } = req.query;
        const url = buildUrl(`/all?status=ended&page=${page}`);
        
        console.log('📺 completedSeries fetching:', url);
        
        const axiosResponse = await axios.get(url, { 
            headers,
            timeout: 15000
        });

        const datas = await scrapeCompletedSeries(req, axiosResponse);

        res.status(200).json({
            message: "success",
            page: parseInt(page),
            ...datas
        });
    } catch (error) {
        console.error('❌ ERROR in completedSeries:', error.message);
        res.status(500).json({
            message: error.message || "Error fetching completed series"
        });
    }
};

const genres = async (req, res) => {
    try {
        const url = buildUrl('/');
        
        console.log('🏷️  genres fetching:', url);
        
        const axiosResponse = await axios.get(url, { 
            headers,
            timeout: 15000
        });

        const datas = await scrapeGenres(req, axiosResponse);

        res.status(200).json({
            message: "success",
            datas
        });
    } catch (error) {
        console.error('❌ ERROR in genres:', error.message);
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
        
        console.log('🏷️  detailGenres fetching:', url);
        
        const axiosResponse = await axios.get(url, { 
            headers,
            timeout: 15000
        });

        const datas = await scrapeDetailGenres({ page, endpoint }, axiosResponse);

        res.status(200).json({
            message: "success",
            page: parseInt(page),
            ...datas
        });
    } catch (error) {
        console.error('❌ ERROR in detailGenres:', error.message);
        res.status(500).json({
            message: error.message || "Error fetching genre details"
        });
    }
};

const searchAll = async (req, res) => {
    try {
        const { s, page = 1 } = req.query;
        const url = buildUrl(`/all?q=${encodeURIComponent(s)}&page=${page}`);
        
        console.log('🔍 searchAll fetching:', url);
        
        const axiosResponse = await axios.get(url, { 
            headers,
            timeout: 15000
        });

        const datas = await scrapeSearch(req, axiosResponse);

        res.status(200).json({
            message: "success",
            page: parseInt(page),
            keyword: s,
            ...datas
        });
    } catch (error) {
        console.error('❌ ERROR in searchAll:', error.message);
        res.status(500).json({
            message: error.message || "Error searching"
        });
    }
};

const detailAllType = async (req, res) => {
    try {
        const { endpoint } = req.params;
        const url = buildUrl(`/detail/${endpoint}`);
        
        console.log('🔍 detailAllType fetching:', url);
        
        const axiosResponse = await axios.get(url, { 
            headers,
            timeout: 15000
        });

        const data = await scrapeDetailAllType({ endpoint }, axiosResponse);

        res.status(200).json({
            message: "success",
            data
        });
    } catch (error) {
        console.error('❌ ERROR in detailAllType:', error.message);
        res.status(500).json({
            message: error.message || "Error fetching details"
        });
    }
};

const getVideoUrl = async (req, res) => {
    try {
        const { endpoint } = req.params;
        const { episode = 0, resolution = 0 } = req.query;
        
        console.log('🎥 getVideoUrl called:', { endpoint, episode, resolution });
        
        if (!endpoint) {
            return res.status(400).json({
                success: false,
                error: 'Endpoint is required'
            });
        }
        
        const epNum = parseInt(episode) || 0;
        const resNum = parseInt(resolution) || 0;
        
        const detailUrl = buildUrl(`/detail/${endpoint}`);
        console.log('🔍 Fetching detail:', detailUrl);
        
        const axiosResponse = await axios.get(detailUrl, { headers });
        const $ = cheerio.load(axiosResponse.data);
        
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
        console.log('🔍 Fetching episodes:', episodeUrl);
        
        const { data: { episode_lists } } = await axios.get(episodeUrl, { headers });
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
        console.log('🔍 Fetching server:', serverUrl);
        
        const { data: {data: { qua, server_id }} } = await axios.get(serverUrl, { headers });
        
        const videoApiUrl = buildUrl(`/api/video.php?id=${epsId}&qua=${qua}&server_id=${server_id}&tag=${epsTag}`);
        console.log('🔍 Fetching video URL:', videoApiUrl);
        
        const { data:{ file } } = await axios.get(videoApiUrl, { headers });
        
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
        
        console.log('✅ Video URL obtained:', videoUrl);
        
        res.status(200).json({
            success: true,
            data: {
                episode: epNum + 1,
                total_episodes: episodes.length,
                resolution: resNum,
                total_resolutions: videoUrls.length,
                video_url: videoUrl,
                headers_required: {
                    referer: getCleanBaseUrl(),
                    origin: getCleanBaseUrl(),
                    'user-agent': headers['User-Agent']
                }
            }
        });
        
    } catch (error) {
        console.error('❌ ERROR in getVideoUrl:', error.message);
        console.error('Stack:', error.stack);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get video URL',
            debug: {
                timestamp: new Date().toISOString(),
                endpoint: req.params.endpoint
            }
        });
    }
};

module.exports = {
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
    debugEnv,
    testConnection
};
