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

// =================== LANDING PAGE ===================
router.get("/", (req, res) => {
    const landingPage = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>🚖 Drakor API - For My Ayang 💖</title>
        <style>
            :root {
                --pink-light: #ffb6c1;
                --pink-medium: #ff69b4;
                --pink-dark: #ff1493;
                --purple-light: #d8bfd8;
                --purple-medium: #9370db;
                --gradient: linear-gradient(135deg, #ffb6c1 0%, #ff69b4 50%, #9370db 100%);
            }
            
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: var(--gradient);
                color: white;
                min-height: 100vh;
                padding: 20px;
            }
            
            .container {
                max-width: 1200px;
                margin: 0 auto;
            }
            
            .header {
                text-align: center;
                padding: 40px 20px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 30px;
                margin-bottom: 40px;
                backdrop-filter: blur(10px);
                border: 3px solid var(--pink-medium);
            }
            
            .header h1 {
                font-size: 3.5rem;
                margin-bottom: 15px;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            }
            
            .header p {
                font-size: 1.2rem;
                opacity: 0.9;
                max-width: 800px;
                margin: 0 auto;
            }
            
            .featured-section {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 25px;
                padding: 30px;
                margin-bottom: 40px;
                border: 3px solid var(--purple-light);
            }
            
            .section-title {
                font-size: 2rem;
                margin-bottom: 25px;
                color: #ffdd59;
                display: flex;
                align-items: center;
                gap: 15px;
            }
            
            .quick-links {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                gap: 20px;
                margin-bottom: 40px;
            }
            
            .quick-card {
                background: rgba(255, 255, 255, 0.15);
                padding: 25px;
                border-radius: 20px;
                text-decoration: none;
                color: white;
                transition: all 0.3s ease;
                border: 2px solid transparent;
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
            }
            
            .quick-card:hover {
                background: rgba(255, 255, 255, 0.25);
                transform: translateY(-5px);
                border-color: var(--pink-medium);
            }
            
            .quick-card i {
                font-size: 2.5rem;
                margin-bottom: 15px;
                color: #ffdd59;
            }
            
            .quick-card h3 {
                font-size: 1.4rem;
                margin-bottom: 10px;
            }
            
            .quick-card p {
                opacity: 0.8;
                font-size: 0.95rem;
            }
            
            .taxi-driver-section {
                background: linear-gradient(135deg, rgba(255, 20, 147, 0.2) 0%, rgba(138, 43, 226, 0.2) 100%);
                border-radius: 25px;
                padding: 30px;
                margin-bottom: 40px;
                border: 3px solid var(--pink-dark);
            }
            
            .taxi-header {
                display: flex;
                align-items: center;
                gap: 20px;
                margin-bottom: 25px;
            }
            
            .taxi-icon {
                font-size: 3rem;
                color: #ffdd59;
            }
            
            .taxi-header h2 {
                font-size: 2.2rem;
                color: white;
            }
            
            .episode-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
                gap: 12px;
                margin: 25px 0;
            }
            
            .episode-btn {
                padding: 15px 5px;
                background: rgba(255, 255, 255, 0.2);
                border: 2px solid var(--pink-light);
                border-radius: 15px;
                color: white;
                font-weight: bold;
                font-size: 1.1rem;
                cursor: pointer;
                transition: all 0.3s ease;
                text-decoration: none;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .episode-btn:hover {
                background: var(--pink-medium);
                transform: translateY(-3px);
            }
            
            .api-endpoints {
                background: rgba(0, 0, 0, 0.2);
                border-radius: 15px;
                padding: 25px;
                margin-top: 40px;
            }
            
            .endpoint {
                background: rgba(255, 255, 255, 0.1);
                padding: 15px;
                border-radius: 10px;
                margin-bottom: 15px;
                font-family: monospace;
                border-left: 4px solid var(--purple-medium);
            }
            
            .method {
                background: var(--purple-medium);
                color: white;
                padding: 4px 8px;
                border-radius: 5px;
                font-size: 0.85rem;
                margin-right: 10px;
            }
            
            .footer {
                text-align: center;
                margin-top: 60px;
                padding-top: 30px;
                border-top: 1px solid rgba(255, 255, 255, 0.2);
                font-size: 0.9rem;
                opacity: 0.8;
            }
            
            @media (max-width: 768px) {
                .header h1 {
                    font-size: 2.5rem;
                }
                
                .quick-links {
                    grid-template-columns: 1fr;
                }
                
                .episode-grid {
                    grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
                }
                
                .taxi-header {
                    flex-direction: column;
                    text-align: center;
                }
            }
        </style>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    </head>
    <body>
        <div class="container">
            <!-- Header -->
            <div class="header">
                <h1>🚖 Drakor API <i class="fas fa-heart" style="color:#ff4757;"></i></h1>
                <p>Korean Drama Streaming API • Built with ❤️ for My Ayang</p>
                <p style="margin-top: 10px; font-size: 1rem; opacity: 0.8;">Powered by Drakorkita • Auto-proxy System • HD Streaming</p>
            </div>
            
            <!-- Featured Taxi Driver 3 -->
            <div class="taxi-driver-section">
                <div class="taxi-header">
                    <div class="taxi-icon">🚖</div>
                    <div>
                        <h2>Taxi Driver 3 (2025)</h2>
                        <p>Latest Season • 14 Episodes Available • Ongoing Series</p>
                    </div>
                </div>
                
                <div class="episode-grid">
                    ${Array.from({length: 14}, (_, i) => `
                        <a href="/api/drakorkita/taxi-driver-3/player?episode=${i + 1}" class="episode-btn">
                            E${i + 1}
                        </a>
                    `).join('')}
                </div>
                
                <div style="text-align: center; margin-top: 25px;">
                    <a href="/api/drakorkita/taxi-driver-3/player" 
                       style="background: linear-gradient(135deg, #ff4757 0%, #ff1493 100%); 
                              color: white; 
                              padding: 15px 40px; 
                              border-radius: 50px; 
                              text-decoration: none; 
                              font-weight: bold;
                              display: inline-flex;
                              align-items: center;
                              gap: 10px;
                              font-size: 1.1rem;">
                        <i class="fas fa-play"></i> Watch Full Player
                    </a>
                    
                    <a href="/api/drakorkita/taxi-driver-3/quick" 
                       style="background: rgba(255, 255, 255, 0.2); 
                              color: white; 
                              padding: 15px 30px; 
                              border-radius: 50px; 
                              text-decoration: none; 
                              font-weight: bold;
                              display: inline-flex;
                              align-items: center;
                              gap: 10px;
                              margin-left: 15px;
                              font-size: 1.1rem;">
                        <i class="fas fa-bolt"></i> Quick Access
                    </a>
                </div>
            </div>
            
            <!-- Quick Links -->
            <div class="featured-section">
                <h2 class="section-title"><i class="fas fa-rocket"></i> Quick Access</h2>
                <div class="quick-links">
                    <a href="/api/drakorkita/series" class="quick-card">
                        <i class="fas fa-tv"></i>
                        <h3>All Series</h3>
                        <p>Browse all Korean drama series</p>
                    </a>
                    
                    <a href="/api/drakorkita/movie" class="quick-card">
                        <i class="fas fa-film"></i>
                        <h3>All Movies</h3>
                        <p>Korean movies collection</p>
                    </a>
                    
                    <a href="/api/drakorkita/series/ongoing" class="quick-card">
                        <i class="fas fa-play-circle"></i>
                        <h3>Ongoing Series</h3>
                        <p>Currently airing dramas</p>
                    </a>
                    
                    <a href="/api/drakorkita/series/completed" class="quick-card">
                        <i class="fas fa-check-circle"></i>
                        <h3>Completed Series</h3>
                        <p>Finished drama series</p>
                    </a>
                    
                    <a href="/api/drakorkita/search?s=taxi+driver" class="quick-card">
                        <i class="fas fa-search"></i>
                        <h3>Search Taxi Driver</h3>
                        <p>Find all Taxi Driver seasons</p>
                    </a>
                    
                    <a href="/api/drakorkita/health" class="quick-card">
                        <i class="fas fa-heartbeat"></i>
                        <h3>API Health</h3>
                        <p>Check API status & uptime</p>
                    </a>
                </div>
            </div>
            
            <!-- API Documentation -->
            <div class="featured-section">
                <h2 class="section-title"><i class="fas fa-code"></i> API Endpoints</h2>
                <div class="api-endpoints">
                    <div class="endpoint">
                        <span class="method">GET</span>
                        <code>/api/drakorkita/series?page=1</code>
                        <span style="float: right; font-size: 0.9rem; opacity: 0.8;">All series</span>
                    </div>
                    
                    <div class="endpoint">
                        <span class="method">GET</span>
                        <code>/api/drakorkita/movie?page=1</code>
                        <span style="float: right; font-size: 0.9rem; opacity: 0.8;">All movies</span>
                    </div>
                    
                    <div class="endpoint">
                        <span class="method">GET</span>
                        <code>/api/drakorkita/search?s=query</code>
                        <span style="float: right; font-size: 0.9rem; opacity: 0.8;">Search content</span>
                    </div>
                    
                    <div class="endpoint">
                        <span class="method">GET</span>
                        <code>/api/drakorkita/detail/{endpoint}</code>
                        <span style="float: right; font-size: 0.9rem; opacity: 0.8;">Series/movie detail</span>
                    </div>
                    
                    <div class="endpoint">
                        <span class="method">GET</span>
                        <code>/api/drakorkita/video/{endpoint}?episode=0&resolution=0</code>
                        <span style="float: right; font-size: 0.9rem; opacity: 0.8;">Get video URL</span>
                    </div>
                    
                    <div class="endpoint">
                        <span class="method">GET</span>
                        <code>/api/drakorkita/taxi-driver-3/player?episode=1</code>
                        <span style="float: right; font-size: 0.9rem; opacity: 0.8;">Taxi Driver 3 Player</span>
                    </div>
                </div>
            </div>
            
            <!-- Footer -->
            <div class="footer">
                <p>Built with ❤️ for My Ayang • Drakor API v1.0</p>
                <p>Auto-proxy system • HLS streaming • Mobile optimized</p>
                <p style="margin-top: 20px;">
                    <a href="/api/drakorkita/health" style="color: #ffdd59; margin: 0 10px;">Status</a> • 
                    <a href="/api/drakorkita/debug" style="color: #ffdd59; margin: 0 10px;">Debug</a> • 
                    <a href="/api/drakorkita/test" style="color: #ffdd59; margin: 0 10px;">Test</a>
                </p>
            </div>
        </div>
        
        <script>
            // Add some interactivity
            document.addEventListener('DOMContentLoaded', function() {
                // Animate episode buttons on hover
                const episodeBtns = document.querySelectorAll('.episode-btn');
                episodeBtns.forEach(btn => {
                    btn.addEventListener('mouseenter', function() {
                        this.style.transform = 'translateY(-5px) scale(1.05)';
                    });
                    
                    btn.addEventListener('mouseleave', function() {
                        this.style.transform = 'translateY(0) scale(1)';
                    });
                });
                
                // Quick navigation for keyboard users
                document.addEventListener('keydown', function(e) {
                    if (e.key === 't' || e.key === 'T') {
                        window.location.href = '/api/drakorkita/taxi-driver-3/player';
                    }
                    if (e.key === 's' || e.key === 'S') {
                        window.location.href = '/api/drakorkita/series';
                    }
                });
                
                // Add floating hearts
                function createFloatingHearts() {
                    const colors = ['#ff4757', '#ff6b81', '#ffa502', '#ff6348'];
                    for (let i = 0; i < 10; i++) {
                        const heart = document.createElement('div');
                        heart.innerHTML = '❤️';
                        heart.style.position = 'fixed';
                        heart.style.left = Math.random() * 100 + 'vw';
                        heart.style.top = '100vh';
                        heart.style.fontSize = (Math.random() * 20 + 10) + 'px';
                        heart.style.color = colors[Math.floor(Math.random() * colors.length)];
                        heart.style.opacity = '0';
                        heart.style.zIndex = '-1';
                        heart.style.pointerEvents = 'none';
                        document.body.appendChild(heart);
                        
                        // Animate
                        setTimeout(() => {
                            heart.style.transition = 'all 3s ease-in-out';
                            heart.style.opacity = '0.3';
                            heart.style.top = '-100px';
                            heart.style.transform = 'rotate(' + (Math.random() * 360) + 'deg)';
                        }, i * 300);
                        
                        // Remove after animation
                        setTimeout(() => {
                            heart.remove();
                        }, 4000);
                    }
                }
                
                // Create hearts every 5 seconds
                setInterval(createFloatingHearts, 5000);
                createFloatingHearts(); // Initial hearts
            });
        </script>
    </body>
    </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.send(landingPage);
});

// =================== 404 HANDLER ===================
router.use((req, res) => {
    res.status(404).json({
        error: "Endpoint not found",
        available_endpoints: [
            "GET /api/drakorkita/",
            "GET /api/drakorkita/series",
            "GET /api/drakorkita/movie", 
            "GET /api/drakorkita/search",
            "GET /api/drakorkita/detail/{endpoint}",
            "GET /api/drakorkita/video/{endpoint}",
            "GET /api/drakorkita/taxi-driver-3/player",
            "GET /api/drakorkita/health",
            "GET /api/drakorkita/debug"
        ]
    });
});

module.exports = router;
