class Browser {
    constructor() {
        this.tabs = [];
        this.currentTabId = null;
        this.tabCounter = 0;
        this.bookmarks = JSON.parse(localStorage.getItem('ar_bookmarks') || '[]');
        this.history = JSON.parse(localStorage.getItem('ar_history') || '[]');
        this.sessionId = localStorage.getItem('ar_session');
        
        if (!this.sessionId) {
            this.createSession();
        }
        
        this.init();
    }
    
    async createSession() {
        const response = await fetch('/api/session/create', { method: 'POST' });
        const data = await response.json();
        this.sessionId = data.sessionId;
        localStorage.setItem('ar_session', this.sessionId);
    }
    
    init() {
        this.newTab();
    }
    
    newTab(url = 'about:blank') {
        this.tabCounter++;
        const tab = {
            id: this.tabCounter,
            url,
            title: 'New Tab',
            history: [],
            historyIndex: -1
        };
        this.tabs.push(tab);
        this.currentTabId = tab.id;
        this.render();
        
        if (url !== 'about:blank') {
            this.navigate(url);
        }
    }
    
    closeTab(id) {
        const index = this.tabs.findIndex(t => t.id === id);
        if (index === -1) return;
        
        this.tabs.splice(index, 1);
        
        if (this.currentTabId === id) {
            this.currentTabId = this.tabs[this.tabs.length - 1]?.id || null;
        }
        
        this.render();
    }
    
    switchTab(id) {
        this.currentTabId = id;
        this.render();
    }
    
    getCurrentTab() {
        return this.tabs.find(t => t.id === this.currentTabId);
    }
    
    navigate(url) {
        const tab = this.getCurrentTab();
        if (!tab) return;
        
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            if (url.includes('.') && !url.includes(' ')) {
                url = 'https://' + url;
            } else {
                url = 'https://www.google.com/search?q=' + encodeURIComponent(url);
            }
        }
        
        const proxiedUrl = `/proxy/${encodeURIComponent(url)}`;
        document.getElementById('browserFrame').src = proxiedUrl;
        document.getElementById('urlInput').value = url;
        
        tab.url = url;
        tab.title = url;
        tab.history.push(url);
        tab.historyIndex = tab.history.length - 1;
        
        this.addHistory(url, tab.title);
        this.render();
        this.updateStatus('Loading ' + url);
    }
    
    goBack() {
        const tab = this.getCurrentTab();
        if (!tab || tab.historyIndex <= 0) return;
        
        tab.historyIndex--;
        const url = tab.history[tab.historyIndex];
        document.getElementById('browserFrame').src = `/proxy/${encodeURIComponent(url)}`;
        document.getElementById('urlInput').value = url;
        this.updateStatus('Back to ' + url);
    }
    
    goForward() {
        const tab = this.getCurrentTab();
        if (!tab || tab.historyIndex >= tab.history.length - 1) return;
        
        tab.historyIndex++;
        const url = tab.history[tab.historyIndex];
        document.getElementById('browserFrame').src = `/proxy/${encodeURIComponent(url)}`;
        document.getElementById('urlInput').value = url;
        this.updateStatus('Forward to ' + url);
    }
    
    reload() {
        const tab = this.getCurrentTab();
        if (!tab || !tab.url || tab.url === 'about:blank') return;
        
        const frame = document.getElementById('browserFrame');
        frame.src = frame.src;
        this.updateStatus('Reloading');
    }
    
    toggleBookmark() {
        const tab = this.getCurrentTab();
        if (!tab || !tab.url || tab.url === 'about:blank') return;
        
        const existing = this.bookmarks.findIndex(b => b.url === tab.url);
        
        if (existing !== -1) {
            this.bookmarks.splice(existing, 1);
            this.updateStatus('Bookmark removed');
        } else {
            this.bookmarks.push({ url: tab.url, title: tab.title, date: Date.now() });
            this.updateStatus('Bookmark added');
        }
        
        localStorage.setItem('ar_bookmarks', JSON.stringify(this.bookmarks));
        this.render();
    }
    
    addHistory(url, title) {
        this.history.unshift({ url, title, date: Date.now() });
        this.history = this.history.slice(0, 100);
        localStorage.setItem('ar_history', JSON.stringify(this.history));
    }
    
    handleUrlInput(event) {
        if (event.key === 'Enter') {
            const url = event.target.value.trim();
            if (url) {
                this.navigate(url);
            }
        }
    }
    
    exportSession() {
        const data = {
            bookmarks: this.bookmarks,
            history: this.history,
            sessionId: this.sessionId,
            exportedAt: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'actual-route-session.json';
        a.click();
        URL.revokeObjectURL(url);
        
        this.updateStatus('Session exported');
    }
    
    importSession() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    this.bookmarks = data.bookmarks || [];
                    this.history = data.history || [];
                    localStorage.setItem('ar_bookmarks', JSON.stringify(this.bookmarks));
                    localStorage.setItem('ar_history', JSON.stringify(this.history));
                    this.updateStatus('Session imported');
                    this.render();
                } catch (err) {
                    this.updateStatus('Import failed');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }
    
    updateStatus(text) {
        document.getElementById('statusText').textContent = text;
    }
    
    render() {
        const tabBar = document.getElementById('tabBar');
        tabBar.innerHTML = '';
        
        this.tabs.forEach(tab => {
            const tabEl = document.createElement('div');
            tabEl.className = 'tab' + (tab.id === this.currentTabId ? ' active' : '');
            tabEl.setAttribute('data-tab-id', tab.id);
            tabEl.onclick = () => this.switchTab(tab.id);
            
            const titleEl = document.createElement('span');
            titleEl.className = 'tab-title';
            titleEl.textContent = tab.title || 'New Tab';
            
            const closeBtn = document.createElement('button');
            closeBtn.className = 'tab-close';
            closeBtn.textContent = '×';
            closeBtn.onclick = (e) => {
                e.stopPropagation();
                this.closeTab(tab.id);
            };
            
            tabEl.appendChild(titleEl);
            tabEl.appendChild(closeBtn);
            tabBar.appendChild(tabEl);
        });
        
        const newTabBtn = document.createElement('button');
        newTabBtn.className = 'new-tab-btn';
        newTabBtn.textContent = '+';
        newTabBtn.onclick = () => this.newTab();
        tabBar.appendChild(newTabBtn);
        
        const currentTab = this.getCurrentTab();
        if (currentTab) {
            document.getElementById('urlInput').value = currentTab.url === 'about:blank' ? '' : currentTab.url;
        }
        
        const bookmarkBtn = document.querySelector('.bookmark-btn');
        if (currentTab && this.bookmarks.find(b => b.url === currentTab.url)) {
            bookmarkBtn.classList.add('bookmarked');
            bookmarkBtn.textContent = '★';
        } else {
            bookmarkBtn.classList.remove('bookmarked');
            bookmarkBtn.textContent = '☆';
        }
        
        const storageUsed = (localStorage.length * 1024) / (1024 * 1024);
        document.getElementById('storageInfo').textContent = `Storage: ${storageUsed.toFixed(2)}MB / 50MB`;
    }
}

const browser = new Browser();

function newTab() { browser.newTab(); }
function closeTab(id) { browser.closeTab(id); }
function goBack() { browser.goBack(); }
function goForward() { browser.goForward(); }
function reload() { browser.reload(); }
function toggleBookmark() { browser.toggleBookmark(); }
function exportSession() { browser.exportSession(); }
function importSession() { browser.importSession(); }
function handleUrlInput(event) { browser.handleUrlInput(event); }