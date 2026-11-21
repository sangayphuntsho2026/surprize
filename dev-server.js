const path = require('path');
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 5173;
const BACKEND = 'http://localhost:3000';

// forward API calls to the backend (keeps cookies/sessions working)
app.use(createProxyMiddleware({
  target: BACKEND,
  changeOrigin: true,
  pathFilter: '/api'
}));

// serve the frontend files
app.use(express.static(__dirname));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, () => console.log(`Frontend running at http://localhost:${PORT}`));