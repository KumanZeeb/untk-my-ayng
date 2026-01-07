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
    const requestId = `${endpointName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    debugLog(`🚀 ${requestId} - Starting request`, { 
        url,
        endpointName,
        config: {
            direct: CONFIG.ENABLE_DIRECT_REQUEST,
            proxies: CONFIG.ENABLE_PROXY_SERVICES,
            timeout: CONFIG.REQUEST_TIMEOUT
        }
    });
    
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
                
                debugLog(`📊 ${requestId} - Direct response`, { 
                    status: response.status,
                    statusText: response.statusText,
                    duration: `${duration}ms`,
                    dataLength: response.data ? response.data.length : 0,
                    contentType: response.headers['content-type'],
                    hasData: !!response.data
                });
                
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
                    duration: `${duration}ms`,
                    errorType: directError.constructor.name,
                    isAxiosError: directError.isAxiosError,
                    code: directError.code
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
                const proxyName = proxyUrl.split('/')[2]; // Extract domain name
                
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
                
                debugLog(`📊 ${requestId} - Proxy response ${i+1}`, { 
                    status: response.status,
                    duration: `${duration}ms`,
                    dataLength: response.data ? response.data.length : 0,
                    proxyName
                });
                
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
                
                // Continue to next proxy
            }
            
            // Small delay between proxy attempts
            if (i < proxyServices.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
    }
    
    // All methods failed
    const totalDuration = Date.now() - startTime;
    const errorMsg = `All request methods failed after ${totalDuration}ms. Tried: ${CONFIG.ENABLE_DIRECT_REQUEST ? 'direct + ' : ''}${proxyServices.length} proxies`;
    
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
            config: CONFIG,
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
            timestamp: new Date().toISOString(),
            config: CONFIG
        });
    }
};

const simpleTest = async (req, res) => {
    try {
        debugLog('🧪 simpleTest - Starting', { query: req.query });
        
        const baseUrl = getCleanBaseUrl();
        const testUrl = `${baseUrl}/all?media_type=tv&page=1`;
        
        const tests = [
            { name: 'Direct request', url: testUrl },
            { name: 'Proxy 1', url: `https://api.allorigins.win/raw?url=${encodeURIComponent(testUrl)}` },
            { name: 'Proxy 2', url: `https://corsproxy.io/?${encodeURIComponent(testUrl)}` }
        ];
        
        const results = [];
        
        for (const test of tests) {
            try {
                const startTime = Date.now();
                const response = await axios.get(test.url, {
                    headers: {
                        'User-Agent': baseHeaders['User-Agent'],
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                    },
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
                    hasData: !!response.data,
                    url: test.url
                });
                
            } catch (testError) {
                results.push({
                    test: test.name,
                    success: false,
                    error: testError.message,
                    isAxiosError: testError.isAxiosError,
                    responseStatus: testError.response ? testError.response.status : null,
                    url: test.url
                });
            }
            
            // Delay between tests
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        const responseData = {
            message: "Simple test results",
            baseUrl: baseUrl,
            tests: results,
            timestamp: new Date().toISOString(),
            config: CONFIG
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

// =================== MAIN API ENDPOINTS ===================
const seriesAll = async (req, res) => {
    const startTime = Date.now();
    const requestId = `seriesAll_${Date.now()}`;
    
    try {
        const { page = 1 } = req.query;
        
        debugLog(`📺 ${requestId} - Starting`, { 
            page, 
            query: req.query
        });
        
        const url = buildUrl(`/all?media_type=tv&page=${page}`);
        
        const axiosResponse = await makeRequest(url, 'seriesAll');
        
        // Additional validation
        if (!axiosResponse.data || axiosResponse.data.length < 100) {
            throw new Error('Invalid response data from server');
        }
        
        const datas = await scrapeSeries(req, axiosResponse);
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        debugLog(`✅ ${requestId} - Success`, { 
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
                url: url,
                requestId: requestId
            }
        });
        
    } catch (error) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        debugLog(`❌ ${requestId} - Error`, {
            error: error.message,
            errorType: error.constructor.name,
            duration: `${duration}ms`,
            page: req.query.page
        });
        
        res.status(500).json({
            message: error.message || "Internal server error",
            error_type: error.constructor.name,
            debug: {
                timestamp: new Date().toISOString(),
                page: req.query.page,
                processingTime: `${duration}ms`,
                requestId: requestId,
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
    const requestId = `getVideoUrl_${Date.now()}`;
    
    try {
        const { endpoint } = req.params;
        const { episode = 0, resolution = 0 } = req.query;
        
        debugLog(`🎥 ${requestId} - Starting`, { 
            endpoint, 
            episode, 
            resolution
        });
        
        if (!endpoint) {
            debugLog(`❌ ${requestId} - Missing endpoint`, {});
            return res.status(400).json({
                success: false,
                error: 'Endpoint is required'
            });
        }
        
        const epNum = parseInt(episode) || 0;
        const resNum = parseInt(resolution) || 0;
        
        const detailUrl = buildUrl(`/detail/${endpoint}`);
        debugLog(`🔍 ${requestId} - Fetching detail`, { detailUrl });
        
        const detailResponse = await makeRequest(detailUrl, 'getVideoUrl-detail');
        const $ = cheerio.load(detailResponse.data);
        
        const onclick = $("div.pagination > a").last().attr("onclick");
        if (!onclick) {
            debugLog(`❌ ${requestId} - No onclick found`, {});
            return res.status(404).json({
                success: false,
                error: 'Video data not found'
            });
        }
        
        const movieIdAndTag = onclick.substring(onclick.indexOf("(") + 1, onclick.indexOf(")"));
        const movieId = movieIdAndTag.split(",")[0].replace(/^'|'$/g, '');
        const tag = movieIdAndTag.split(",")[1].replace(/^'|'$/g, '');
        
        debugLog(`🔑 ${requestId} - Extracted IDs`, { movieId, tag });
        
        const episodeUrl = buildUrl(`/api/episode.php?movie_id=${movieId}&tag=${tag}`);
        debugLog(`🔍 ${requestId} - Fetching episodes`, { episodeUrl });
        
        const { data: { episode_lists } } = await makeRequest(episodeUrl, 'getVideoUrl-episodes');
        const $eps = cheerio.load(episode_lists);
        const episodes = $eps("p > a").get();
        
        debugLog(`📋 ${requestId} - Episodes found`, { count: episodes.length });
        
        if (epNum >= episodes.length || epNum < 0) {
            debugLog(`❌ ${requestId} - Invalid episode`, { 
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
            debugLog(`❌ ${requestId} - No eps onclick`, {});
            return res.status(404).json({
                success: false,
                error: 'Episode data not found'
            });
        }
        
        const epsIdAndTag = epsWrap.substring(epsWrap.indexOf("(") + 1, epsWrap.indexOf(")"));
        const epsId = epsIdAndTag.split(",")[0].replace(/^'|'$/g, '');
        const epsTag = epsIdAndTag.split(",")[1].replace(/^'|'$/g, '');
        
        debugLog(`🔑 ${requestId} - Episode IDs`, { epsId, epsTag });
        
        const serverUrl = buildUrl(`/api/server.php?episode_id=${epsId}&tag=${epsTag}`);
        debugLog(`🔍 ${requestId} - Fetching server`, { serverUrl });
        
        const { data: {data: { qua, server_id }} } = await makeRequest(serverUrl, 'getVideoUrl-server');
        
        debugLog(`⚙️ ${requestId} - Server data`, { qua, server_id });
        
        const videoApiUrl = buildUrl(`/api/video.php?id=${epsId}&qua=${qua}&server_id=${server_id}&tag=${epsTag}`);
        debugLog(`🔍 ${requestId} - Fetching video URL`, { videoApiUrl });
        
        const { data:{ file } } = await makeRequest(videoApiUrl, 'getVideoUrl-video');
        
        debugLog(`📹 ${requestId} - Got file data`, { 
            fileLength: file.length,
            first100: file.substring(0, 100)
        });
        
        const videoUrls = file.split(",");
        
        debugLog(`🎯 ${requestId} - Video URLs parsed`, { count: videoUrls.length });
        
        if (resNum >= videoUrls.length || resNum < 0) {
            debugLog(`❌ ${requestId} - Invalid resolution`, { 
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
        
        debugLog(`✅ ${requestId} - Success`, { 
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
                request_id: requestId,
                headers_required: {
                    referer: getCleanBaseUrl(),
                    origin: getCleanBaseUrl(),
                    'user-agent': baseHeaders['User-Agent']
                }
            }
        });
        
    } catch (error) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        debugLog(`❌ ${requestId} - Error`, {
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
                request_id: requestId,
                errorDetails: {
                    message: error.message,
                    code: error.code
                }
            }
        });
    }
};

// =================== ADDITIONAL DEBUG ENDPOINTS ===================
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

// =================== CONFIGURATION ENDPOINT ===================
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
    rawHtmlTest,
    updateConfig,
    // Export for testing
    makeRequest,
    getCleanBaseUrl
};
