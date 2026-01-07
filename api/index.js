// api/index.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Import routes
const drakorkitaRoutes = require('../routes/drakorkita');

// Routes
app.use('/api/drakorkita', drakorkitaRoutes);

// Home/API docs
app.get('/api', (req, res) => {
    res.json({
        message: '🎬 Drakorkita Scraper API',
        version: '1.0.0',
        endpoints: {
            series: '/api/drakorkita/series?page=1',
            movies: '/api/drakorkita/movie?page=1',
            search: '/api/drakorkita/search?s=keyword',
            detail: '/api/drakorkita/detail/:endpoint',
            genres: '/api/drakorkita/genres',
            video: '/api/drakorkita/video/:endpoint',
            debug: '/api/drakorkita/debug',
            test: '/api/drakorkita/test'
        },
        player: '/player?endpoint=series-endpoint'
    });
});

// Root redirect to player
app.get('/', (req, res) => {
    res.redirect('/player');
});

// Player route
app.get('/player', (req, res) => {
    const { endpoint } = req.query;
    if (endpoint) {
        res.redirect(`/player.html?endpoint=${endpoint}`);
    } else {
        res.sendFile(path.join(__dirname, '../public', 'player.html'));
    }
});

// Test route langsung
app.get('/test-player', (req, res) => {
    res.redirect('/player?endpoint=taxi-driver-2025-v1cy');
});

// Error handling
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err.message);
    console.error('Stack:', err.stack);
    
    res.status(500).json({
        success: false,
        error: err.message || 'Internal Server Error',
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use('*', (req, res) => {
    if (req.path.startsWith('/api')) {
        res.status(404).json({
            success: false,
            error: 'API endpoint not found: ' + req.path
        });
    } else {
        res.status(404).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>404 - Not Found</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                    h1 { color: #ff4757; }
                    a { color: #3742fa; text-decoration: none; }
                    a:hover { text-decoration: underline; }
                </style>
            </head>
            <body>
                <h1>404 - Page Not Found</h1>
                <p>The page you're looking for doesn't exist.</p>
                <p>
                    <a href="/">Go to Player</a> | 
                    <a href="/api">API Documentation</a>
                </p>
            </body>
            </html>
        `);
    }
});

// Export untuk Vercel
module.exports = app;
