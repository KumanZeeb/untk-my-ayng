const { Router } = require("express");
const router = Router();

const {
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
    taxiDriver3HTMLPlayer,
    taxiDriver3SimpleInfo
} = require("../controllers/drakorkita");

// =================== MAIN API ROUTES ===================
router.get("/series", seriesAll);
router.get("/movie", movieAll);
router.get("/series/updated", seriesUpdated);
router.get("/series/ongoing", ongoingSeries);
router.get("/series/completed", completedSeries);
router.get("/movie/newest", newMovie);
router.get("/genres", genres);
router.get("/genres/:endpoint", detailGenres);
router.get("/search", searchAll);
router.get("/detail/:endpoint", detailAllType);
router.get("/video/:endpoint", getVideoUrl);

// =================== TAXI DRIVER 3 SPECIAL ROUTES ===================
router.get("/taxi-driver-3/player", taxiDriver3HTMLPlayer);
router.get("/taxi-driver-3/quick", taxiDriver3SimpleInfo);

// =================== DEBUG & TEST ROUTES ===================
router.get("/debug", debugEnv);
router.get("/test", testConnection);
router.get("/simple-test", simpleTest);
router.get("/health", healthCheck);
router.get("/raw-html", rawHtmlTest);

// =================== CONFIGURATION ROUTES ===================
router.post("/config/update", updateConfig);

module.exports = router;
