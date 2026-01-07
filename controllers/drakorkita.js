const axios = require("axios")
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
} = require('../scrapers/drakorkita')

const headers = {
    "User-Agent" : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36"
}

const seriesAll = async (req, res) => {
    try {
        const { page = 1 } = req.query
        const axiosRequest = await axios.get(`${process.env.DRAKORKITA_URL}/all?media_type=tv&page=${page}`, { headers })

        const datas = await scrapeSeries(req, axiosRequest)

        res.status(200).json({
            message:"success",
            page: parseInt(page),
            ...datas
        })
    } catch (e) {
        console.log(e)

        res.json({
            message:`${e}`
        })
    }
}

const seriesUpdated = async (req, res) => {
    try {
        const axiosRequest = await axios.get(`${process.env.DRAKORKITA_URL}`, { headers })

        const datas = await scrapeSeriesUpdated(req, axiosRequest)

        res.status(200).json({
            message:"success",
            datas
        })
    } catch (e) {
        console.log(e)

        res.json({
            message:`${e}`
        })
    }
}

const movieAll = async (req, res) => {
    try {
        const { page = 1 } = req.query
        const axiosRequest = await axios.get(`${process.env.DRAKORKITA_URL}/all?media_type=movie&page=${page}`, { headers })

        const datas = await scrapeMovie(req, axiosRequest)

        res.status(200).json({
            message:"success",
            page: parseInt(page),
            ...datas
        })
    } catch (e) {
        console.log(e)

        res.json({
            message:`${e}`
        })
    }
}

const newMovie = async (req, res) => {
    try {
        const axiosRequest = await axios.get(`${process.env.DRAKORKITA_URL}`, { headers })

        const datas = await scrapeNewMovie(req, axiosRequest)

        res.status(200).json({
            message:"success",
            datas
        })
    } catch (e) {
        console.log(e)

        res.json({
            message:`${e}`
        })
    }
}

const ongoingSeries = async (req, res) => {
    try {
        const { page = 1 } = req.query
        const axiosRequest = await axios.get(`${process.env.DRAKORKITA_URL}/all?status=returning&page=${page}`, { headers })

        const datas = await scrapeOngoingSeries(req, axiosRequest)

        res.status(200).json({
            message:"success",
            page: parseInt(page),
            ...datas
        })
    } catch (e) {
        console.log(e)

        res.json({
            message:`${e}`
        })
    }
}

const completedSeries = async (req, res) => {
    try {
        const { page = 1 } = req.query
        const axiosRequest = await axios.get(`${process.env.DRAKORKITA_URL}/all?status=ended&page=${page}`, { headers })

        const datas = await scrapeCompletedSeries(req, axiosRequest)

        res.status(200).json({
            message:"success",
            page: parseInt(page),
            ...datas
        })
    } catch (e) {
        console.log(e)

        res.json({
            message:`${e}`
        })
    }
}

const genres = async (req, res) => {
    try {
        const axiosRequest = await axios.get(`${process.env.DRAKORKITA_URL}`, { headers })

        const datas = await scrapeGenres(req, axiosRequest)

        res.status(200).json({
            message:"success",
            datas
        })
    } catch (e) {
        console.log(e)

        res.json({
            message:`${e}`
        })
    }
}

const detailGenres = async (req, res) => {
    try {
        const { page = 1 } = req.query
        const { endpoint } = req.params
        const axiosRequest = await axios.get(`${process.env.DRAKORKITA_URL}/all?genre=${endpoint}&page=${page}`, { headers })

        const datas = await scrapeDetailGenres({ page, endpoint }, axiosRequest)

        res.status(200).json({
            message:"success",
            page: parseInt(page),
            ...datas
        })
    } catch (e) {
        console.log(e)

        res.json({
            message:`${e}`
        })
    }
}

const searchAll = async (req, res) => {
    try {
        const { s ,page = 1 } = req.query
        const axiosRequest = await axios.get(`${process.env.DRAKORKITA_URL}/all?q=${s}&page=${page}`, { headers })

        const datas = await scrapeSearch(req, axiosRequest)

        res.status(200).json({
            message:"success",
            page: parseInt(page),
            keyword: s,
            ...datas
        })
    } catch (e) {
        console.log(e)

        res.json({
            message:`${e}`
        })
    }
}

const detailAllType = async (req, res) => {
    try {
        const { endpoint } = req.params

        const axiosRequest = await axios.get(`${process.env.DRAKORKITA_URL}/detail/${endpoint}`, { headers })

        const data = await scrapeDetailAllType({ endpoint }, axiosRequest)

        res.status(200).json({
            message: "success",
            data
        })

    } catch (e) {
        console.log(e)

        res.json({
            message:`${e}`
        })
    }
}

const getVideoUrl = async (req, res) => {
    try {
        const { endpoint } = req.params;
        const { episode = 0, resolution = 0 } = req.query;
        
        // Validasi parameter
        if (!endpoint) {
            return res.status(400).json({
                success: false,
                error: 'Endpoint is required'
            });
        }
        
        // Konversi ke number
        const epNum = parseInt(episode) || 0;
        const resNum = parseInt(resolution) || 0;
        
        // Get detail data
        const url = `${process.env.DRAKORKITA_URL}/detail/${endpoint}`;
        const axiosResponse = await axios.get(url, { headers });
        const $ = cheerio.load(axiosResponse.data);
        
        // Extract video URL logic
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
        
        // Get episode list
        const { data: { episode_lists } } = await axios.get(
            `${process.env.DRAKORKITA_URL}/api/episode.php?movie_id=${movieId}&tag=${tag}`, 
            { headers }
        );
        
        const $eps = cheerio.load(episode_lists);
        const episodes = $eps("p > a").get();
        
        // Validasi episode
        if (epNum >= episodes.length || epNum < 0) {
            return res.status(400).json({
                success: false,
                error: `Episode tidak valid. Tersedia ${episodes.length} episode`
            });
        }
        
        // Get selected episode
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
        
        // Get video URL
        const { data: {data: { qua, server_id }} } = await axios.get(
            `${process.env.DRAKORKITA_URL}/api/server.php?episode_id=${epsId}&tag=${epsTag}`, 
            { headers }
        );
        
        const { data:{ file } } = await axios.get(
            `${process.env.DRAKORKITA_URL}/api/video.php?id=${epsId}&qua=${qua}&server_id=${server_id}&tag=${epsTag}`,
            { headers }
        );
        
        // Parse video URL
        const videoUrls = file.split(",");
        
        // Validasi resolution
        if (resNum >= videoUrls.length || resNum < 0) {
            return res.status(400).json({
                success: false,
                error: `Resolution tidak valid. Tersedia ${videoUrls.length} resolusi`
            });
        }
        
        const selectedUrl = videoUrls[resNum] || videoUrls[0];
        const videoUrl = selectedUrl.substring(
            selectedUrl.indexOf("https"), 
            selectedUrl.length
        ).replace(/['"]/g, '').trim();
        
        res.status(200).json({
            success: true,
            data: {
                episode: epNum + 1,
                total_episodes: episodes.length,
                resolution: resNum,
                total_resolutions: videoUrls.length,
                video_url: videoUrl,
                headers_required: {
                    referer: process.env.DRAKORKITA_URL,
                    origin: process.env.DRAKORKITA_URL,
                    'user-agent': headers['User-Agent']
                }
            }
        });
        
    } catch (error) {
        console.error('Error in getVideoUrl:', error.message);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get video URL'
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
    getVideoUrl
}