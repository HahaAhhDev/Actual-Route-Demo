# Actual Route Demo

A school proxy demo built on the Actual Route framework. Features a Chrome-like browser interface with tabs, bookmarks, and a professional black and white theme.

## Features

- Chrome-like UI with tabs and URL bar
- Professional black and white theme
- School proxy mode for speed
- Session management for persistent logins
- Bookmark system
- History tracking
- Session export/import as JSON
- Storage quota display
- Wisp client support

## Installation

```bash
git clone https://github.com/hahaahhdev/actual-route-demo.git
cd actual-route-demo

# Clone Actual Route framework
git clone https://github.com/hahaahhdev/actual-route.git
mv actual-route actualroute

npm install
```

## Quick Start

```bash
node server.js
```

Open `http://localhost:8080`

## Browser Features

- Multiple tabs
- Navigation (back/forward/reload)
- Bookmark toggle
- URL bar with search
- Session export/import
- Storage usage display

## Configuration

Edit `ar.config.js` to change proxy settings, session limits, and feature toggles.

## Project Structure

```
actual-route-demo/
├── server.js
├── ar.config.js
├── package.json
├── public/
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   ├── sw.js
│   └── wisp-client.js
└── actualroute/
```

## License

MIT