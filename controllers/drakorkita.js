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

// =================== EXTENSIVE DEBUG HELPERS ===================
const debugLog = (prefix, data) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${prefix}:`, JSON.stringify(data, null, 2));
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
    // Priority: env variable → hardcoded fallback
    let baseUrl = process.env.DRAKORKITA_URL || 'https://drakorkita.com';
    
    debugLog('🔍 URL DEBUG - Original DRAKORKITA_URL', {
        value: baseUrl,
        type: typeof baseUrl,
        length: baseUrl.length,
        raw: JSON.stringify(baseUrl)
    });
    
    // Convert to string and trim
    baseUrl = baseUrl.toString().trim();
    
    // Remove any invisible characters
    baseUrl = baseUrl.replace(/[^\x20-\x7E]/g, '');
    
    // Ensure it has protocol
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
        debugLog('⚠️  Adding https:// to URL', { before: baseUrl });
        baseUrl = 'https://' + baseUrl;
    }
    
    // Remove trailing slash
    baseUrl = baseUrl.replace(/\/$/, '');
    
    // Validate final URL
    if (!isValidUrl(baseUrl)) {
        debugLog('❌ ERROR: Invalid URL after cleaning', { baseUrl });
        // Fallback to hardcoded URL
        return 'https://drakorkita.com';
    }
    
    debugLog('✅ Final cleaned baseUrl', { baseUrl });
    return baseUrl;
};

const buildUrl = (path) => {
    const baseUrl = getCleanBaseUrl();
    const fullUrl = `${baseUrl}${path}`;
    
    debugLog('🔗 Building URL', {
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

const makeRequest = async (url, endpointName) => {
    const startTime = Date.now();
    
    debugLog(`🚀 ${endpointName} - Starting request`, {
        url,
        endpointName,
        startTime
    });
    
    try {
        const response = await axios.get(url, { 
            headers,
            timeout: 20000,
            validateStatus: () => true // Accept all status codes
        });
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        debugLog(`✅ ${endpointName} - Request completed`, {
            url,
            status: response.status,
            statusText: response.statusText,
            duration: `${duration}ms`,
            dataLength: response.data ? response.data.length : 0,
            contentType: response.headers['content-type'],
            hasData: !!response.data
        });
        
        return response;
        
    } catch (error) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        debugLog(`❌ ${endpointName} - Request failed`, {
            url,
            duration: `${duration}ms`,
            error: error.message,
            errorType: error.constructor.name,
            isAxiosError: error.isAxiosError,
            code: error.code,
            responseStatus: error.response ? error.response.status : null,
            responseHeaders: error.response ? error.response.headers : null
        });
        
        throw error;
    }
};

// =================== DEBUG ENDPOINTS ===================
const debugEnv = async (req, res) => {
    try {
        debugLog('🔧 debugEnv - Called', {
            query: req.query,
            params: req.params,
            headers: Object.keys(req.headers)
        });
        
        const envVars = {};
        const allKeys = Object.keys(process.env);
        
        allKeys.forEach(key => {
            if (key.includes('DRAKOR') || key.includes('URL') || key.includes('VERCEL') || key.includes('NODE')) {
                envVars[key] = process.env[key];
            }
        });
        
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
                    charCodes: [...url].map(c => c.charCodeAt(0))
                };
            }
        });
        
        const responseData = {
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
        };
        
        debugLog('✅ debugEnv - Response ready', { dataLength: JSON.stringify(responseData).length });
        
        res.status(200).json(responseData);
    } catch (error) {
        debugLog('❌ debugEnv - Error', { error: error.message, stack: error.stack });
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
        
        debugLog('🧪 testConnection - Starting', { testUrl, baseUrl });
        
        const response = await makeRequest(testUrl, 'testConnection');
        
        const responseData = {
            message: "Connection test",
            testUrl,
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            dataLength: response.data ? response.data.length : 0,
            sampleData: response.data ? response.data.substring(0, 500) : 'No data',
            timestamp: new Date().toISOString()
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

const simpleTest = async (req, res) => {
    try {
        debugLog('🧪 simpleTest - Starting', { query: req.query });
        
        const baseUrl = getCleanBaseUrl();
        const testUrl = `${baseUrl}/all?media_type=tv&page=1`;
        
        // Test dengan berbagai headers
        const testHeaders1 = {
            ...headers,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        };
        
        const tests = [
            { name: 'Default headers', headers: headers },
            { name: 'Enhanced headers', headers: testHeaders1 }
        ];
        
        const results = [];
        
        for (const test of tests) {
            try {
                const startTime = Date.now();
                const response = await axios.get(testUrl, {
                    headers: test.headers,
                    timeout: 10000,
                    validateStatus: () => true
                });
                
                const duration = Date.now() - startTime;
                
                results.push({
                    test: test.name,
                    success: true,
                    status: response.status,
                    duration: `${duration}ms`,
                    dataLength: response.data ? response.data.length : 0,
                    contentType: response.headers['content-type'],
                    hasData: !!response.data
                });
                
            } catch (testError) {
                results.push({
                    test: test.name,
                    success: false,
                    error: testError.message,
                    isAxiosError: testError.isAxiosError,
                    responseStatus: testError.response ? testError.response.status : null
                });
            }
        }
        
        const responseData = {
            message: "Simple test results",
            targetUrl: testUrl,
            baseUrl: baseUrl,
            tests: results,
            timestamp: new Date().toISOString()
        };
        
        debugLog('✅ simpleTest - Completed', { 
            totalTests: results.length,
            successful: results.filter(r => r.success).length
        });
        
        res.status(200).json(responseData);
    } catch (error) {
        debugLog('❌ simpleTest - Failed', { error: error.message });
        res.status(500).json({
            message: "Simple test failed",
            error: error.message
        });
    }
};

// =================== MAIN API ENDPOINTS WITH EXTENSIVE DEBUG ===================
const seriesAll = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { page = 1 } = req.query;
        
        debugLog('📺 seriesAll - Starting', { 
            page, 
            query: req.query,
            startTime: new Date(startTime).toISOString()
        });
        
        const url = buildUrl(`/all?media_type=tv&page=${page}`);
        
        debugLog('🔍 seriesAll - Fetching URL', { url });
        
        const axiosResponse = await makeRequest(url, 'seriesAll');
        
        debugLog('🔧 seriesAll - Starting scraper', { 
            dataLength: axiosResponse.data.length,
            status: axiosResponse.status
        });
        
        const datas = await scrapeSeries(req, axiosResponse);
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        debugLog('✅ seriesAll - Success', { 
            page,
            duration: `${duration}ms`,
            itemsFound: datas.datas ? datas.datas.length : 0,
            pagination: datas.pagination
        });
        
        res.status(200).json({
            message: "success",
            page: parseInt(page),
            ...datas,
            debug: {
                processingTime: `${duration}ms`,
                url: url
            }
        });
        
    } catch (error) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        debugLog('❌ seriesAll - Error', {
            error: error.message,
            errorType: error.constructor.name,
            duration: `${duration}ms`,
            page: req.query.page,
            envUrl: process.env.DRAKORKITA_URL,
            stack: error.stack
        });
        
        res.status(500).json({
            message: error.message || "Internal server error",
            error_type: error.constructor.name,
            debug: {
                timestamp: new Date().toISOString(),
                page: req.query.page,
                env_url: process.env.DRAKORKITA_URL,
                processingTime: `${duration}ms`,
                errorDetails: {
                    message: error.message,
                    code: error.code
                }
            }
        });
    }
};

const seriesUpdated = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const url = buildUrl('/');
        
        debugLog('📺 seriesUpdated - Starting', { url });
        
        const axiosResponse = await makeRequest(url, 'seriesUpdated');
        
        const datas = await scrapeSeriesUpdated(req, axiosResponse);
        
        const duration = Date.now() - startTime;
        
        debugLog('✅ seriesUpdated - Success', { 
            duration: `${duration}ms`,
            itemsFound: datas.length
        });
        
        res.status(200).json({
            message: "success",
            datas
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
        
        debugLog('🎬 movieAll - Starting', { url });
        
        const axiosResponse = await makeRequest(url, 'movieAll');
        
        const datas = await scrapeMovie(req, axiosResponse);
        
        const duration = Date.now() - startTime;
        
        debugLog('✅ movieAll - Success', { 
            duration: `${duration}ms`,
            itemsFound: datas.datas ? datas.datas.length : 0
        });
        
        res.status(200).json({
            message: "success",
            page: parseInt(page),
            ...datas
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
        
        debugLog('🎬 newMovie - Starting', { url });
        
        const axiosResponse = await makeRequest(url, 'newMovie');
        
        const datas = await scrapeNewMovie(req, axiosResponse);
        
        debugLog('✅ newMovie - Success', { itemsFound: datas.length });
        
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
        
        debugLog('📺 ongoingSeries - Starting', { url });
        
        const axiosResponse = await makeRequest(url, 'ongoingSeries');
        
        const datas = await scrapeOngoingSeries(req, axiosResponse);
        
        debugLog('✅ ongoingSeries - Success', { 
            itemsFound: datas.datas ? datas.datas.length : 0
        });
        
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
        
        debugLog('📺 completedSeries - Starting', { url });
        
        const axiosResponse = await makeRequest(url, 'completedSeries');
        
        const datas = await scrapeCompletedSeries(req, axiosResponse);
        
        debugLog('✅ completedSeries - Success', { 
            itemsFound: datas.datas ? datas.datas.length : 0
        });
        
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
        
        debugLog('🏷️  genres - Starting', { url });
        
        const axiosResponse = await makeRequest(url, 'genres');
        
        const datas = await scrapeGenres(req, axiosResponse);
        
        debugLog('✅ genres - Success', { itemsFound: datas.length });
        
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
        
        debugLog('🏷️  detailGenres - Starting', { url, endpoint, page });
        
        const axiosResponse = await makeRequest(url, 'detailGenres');
        
        const datas = await scrapeDetailGenres({ page, endpoint }, axiosResponse);
        
        debugLog('✅ detailGenres - Success', { 
            itemsFound: datas.datas ? datas.datas.length : 0
        });
        
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
        
        debugLog('🔍 searchAll - Starting', { url, keyword: s });
        
        const axiosResponse = await makeRequest(url, 'searchAll');
        
        const datas = await scrapeSearch(req, axiosResponse);
        
        debugLog('✅ searchAll - Success', { 
            itemsFound: datas.datas ? datas.datas.length : 0
        });
        
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
        
        debugLog('🔍 detailAllType - Starting', { url, endpoint });
        
        const axiosResponse = await makeRequest(url, 'detailAllType');
        
        const data = await scrapeDetailAllType({ endpoint }, axiosResponse);
        
        debugLog('✅ detailAllType - Success', { 
            hasData: !!data,
            hasEpisodes: data.episodes ? data.episodes.length : 0
        });
        
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
    
    try {
        const { endpoint } = req.params;
        const { episode = 0, resolution = 0 } = req.query;
        
        debugLog('🎥 getVideoUrl - Starting', { 
            endpoint, 
            episode, 
            resolution,
            startTime: new Date(startTime).toISOString()
        });
        
        if (!endpoint) {
            debugLog('❌ getVideoUrl - Missing endpoint', {});
            return res.status(400).json({
                success: false,
                error: 'Endpoint is required'
            });
        }
        
        const epNum = parseInt(episode) || 0;
        const resNum = parseInt(resolution) || 0;
        
        const detailUrl = buildUrl(`/detail/${endpoint}`);
        debugLog('🔍 getVideoUrl - Fetching detail', { detailUrl });
        
        const detailResponse = await makeRequest(detailUrl, 'getVideoUrl-detail');
        const $ = cheerio.load(detailResponse.data);
        
        const onclick = $("div.pagination > a").last().attr("onclick");
        if (!onclick) {
            debugLog('❌ getVideoUrl - No onclick found', {});
            return res.status(404).json({
                success: false,
                error: 'Video data not found'
            });
        }
        
        const movieIdAndTag = onclick.substring(onclick.indexOf("(") + 1, onclick.indexOf(")"));
        const movieId = movieIdAndTag.split(",")[0].replace(/^'|'$/g, '');
        const tag = movieIdAndTag.split(",")[1].replace(/^'|'$/g, '');
        
        debugLog('🔑 getVideoUrl - Extracted IDs', { movieId, tag });
        
        const episodeUrl = buildUrl(`/api/episode.php?movie_id=${movieId}&tag=${tag}`);
        debugLog('🔍 getVideoUrl - Fetching episodes', { episodeUrl });
        
        const { data: { episode_lists } } = await axios.get(episodeUrl, { headers });
        const $eps = cheerio.load(episode_lists);
        const episodes = $eps("p > a").get();
        
        debugLog('📋 getVideoUrl - Episodes found', { count: episodes.length });
        
        if (epNum >= episodes.length || epNum < 0) {
            debugLog('❌ getVideoUrl - Invalid episode', { 
                requested: epNum, 
                available: episodes.length 
            });
            return res.status(400).json({
                success: false,
                error: `Invalid episode. Available: 0-${episodes.length - 1}`
            });
        }
        
        const selectedEpisode = episodes[epNum];
        const epsWrap = $(selectedEpisode).attr('onclick');
        if (!epsWrap) {
            debugLog('❌ getVideoUrl - No eps onclick', {});
            return res.status(404).json({
                success: false,
                error: 'Episode data not found'
            });
        }
        
        const epsIdAndTag = epsWrap.substring(epsWrap.indexOf("(") + 1, epsWrap.indexOf(")"));
        const epsId = epsIdAndTag.split(",")[0].replace(/^'|'$/g, '');
        const epsTag = epsIdAndTag.split(",")[1].replace(/^'|'$/g, '');
        
        debugLog('🔑 getVideoUrl - Episode IDs', { epsId, epsTag });
        
        const serverUrl = buildUrl(`/api/server.php?episode_id=${epsId}&tag=${epsTag}`);
        debugLog('🔍 getVideoUrl - Fetching server', { serverUrl });
        
        const { data: {data: { qua, server_id }} } = await axios.get(serverUrl, { headers });
        
        debugLog('⚙️ getVideoUrl - Server data', { qua, server_id });
        
        const videoApiUrl = buildUrl(`/api/video.php?id=${epsId}&qua=${qua}&server_id=${server_id}&tag=${epsTag}`);
        debugLog('🔍 getVideoUrl - Fetching video URL', { videoApiUrl });
        
        const { data:{ file } } = await axios.get(videoApiUrl, { headers });
        
        debugLog('📹 getVideoUrl - Got file data', { 
            fileLength: file.length,
            first100: file.substring(0, 100)
        });
        
        const videoUrls = file.split(",");
        
        debugLog('🎯 getVideoUrl - Video URLs parsed', { count: videoUrls.length });
        
        if (resNum >= videoUrls.length || resNum < 0) {
            debugLog('❌ getVideoUrl - Invalid resolution', { 
                requested: resNum, 
                available: videoUrls.length 
            });
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
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        debugLog('✅ getVideoUrl - Success', { 
            videoUrl,
            duration: `${duration}ms`,
            episode: epNum + 1,
            totalEpisodes: episodes.length
        });
        
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
                    'user-agent': headers['User-Agent']
                }
            }
        });
        
    } catch (error) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        debugLog('❌ getVideoUrl - Error', {
            error: error.message,
            errorType: error.constructor.name,
            duration: `${duration}ms`,
            endpoint: req.params.endpoint,
            stack: error.stack
        });
        
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get video URL',
            debug: {
                timestamp: new Date().toISOString(),
                endpoint: req.params.endpoint,
                processingTime: `${duration}ms`,
                errorDetails: {
                    message: error.message,
                    code: error.code
                }
            }
        });
    }
};

// =================== NEW DEBUG ENDPOINTS ===================
const healthCheck = async (req, res) => {
    try {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            environment: process.env.NODE_ENV,
            baseUrl: getCleanBaseUrl()
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

const rawHtmlTest = async (req, res) => {
    try {
        const { page = 1 } = req.query;
        const url = buildUrl(`/all?media_type=tv&page=${page}`);
        
        debugLog('📄 rawHtmlTest - Starting', { url });
        
        const response = await makeRequest(url, 'rawHtmlTest');
        
        // Return minimal HTML for inspection
        const html = response.data || '';
        
        res.status(200).json({
            message: "Raw HTML test",
            url,
            status: response.status,
            htmlLength: html.length,
            sample: html.substring(0, 1000),
            containsCard: html.includes('card'),
            containsBungkus: html.includes('bungkus'),
            containsTitit: html.includes('titit'),
            containsDetail: html.includes('/detail/')
        });
        
    } catch (error) {
        debugLog('❌ rawHtmlTest - Error', { error: error.message });
        res.status(500).json({
            message: "Raw HTML test failed",
            error: error.message
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
    testConnection,
    simpleTest,
    healthCheck,
    rawHtmlTest
};
