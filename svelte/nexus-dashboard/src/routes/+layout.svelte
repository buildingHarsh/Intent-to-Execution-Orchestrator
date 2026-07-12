<script lang="ts">
    import { page } from '$app/stores';
</script>

<div class="app-container">
    <aside class="sidebar">
        <div class="logo">
            <h2>NexusFabric</h2>
            <span class="badge">Enterprise</span>
        </div>
        <nav>
            <a href="/" class:active={$page.url.pathname === '/'}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                Active Workflows
            </a>
            <a href="/audit" class:active={$page.url.pathname === '/audit'}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
                Audit History
            </a>
        </nav>
    </aside>

    <div class="main-wrapper">
        <header class="top-header">
            <div class="header-title">
                <h1>{ $page.url.pathname === '/audit' ? 'Audit History' : 'Dashboard' }</h1>
            </div>
            <div class="server-status">
                <span class="status-dot"></span>
                <span>Backend Connected: Port 3002</span>
            </div>
        </header>

        <main class="content-area">
            <slot />
        </main>
    </div>
</div>

<style>
    :global(:root) {
        --bg-sidebar: #1e1e24;
        --bg-main: #f4f5f7;
        --bg-header: #ffffff;
        --text-sidebar: #a0a0b0;
        --text-sidebar-active: #ffffff;
        --text-main: #333333;
        --primary: #4a90e2;
        --border-color: #e1e4e8;
        
        /* Status Colors */
        --c-pending-bg: #f9f9fa;
        --c-pending-border: #d1d5da;
        --c-pending-text: #6a737d;
        
        --c-running-bg: #fffbdd;
        --c-running-border: #f6c343;
        --c-running-text: #9a6700;
        
        --c-completed-bg: #e6ffed;
        --c-completed-border: #34d058;
        --c-completed-text: #22863a;
        
        --c-failed-bg: #ffeef0;
        --c-failed-border: #d73a49;
        --c-failed-text: #cb2431;
        
        --c-awaiting-bg: #ffffff;
        --c-awaiting-border: #0366d6;
    }

    :global(body) {
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        background-color: var(--bg-main);
        color: var(--text-main);
    }

    .app-container {
        display: grid;
        grid-template-columns: 260px 1fr;
        height: 100vh;
        overflow: hidden;
    }

    .sidebar {
        background-color: var(--bg-sidebar);
        color: var(--text-sidebar);
        display: flex;
        flex-direction: column;
    }

    .logo {
        padding: 24px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .logo h2 {
        margin: 0;
        color: white;
        font-size: 1.2rem;
        letter-spacing: 0.5px;
    }

    .badge {
        background: var(--primary);
        color: white;
        font-size: 0.6rem;
        padding: 3px 6px;
        border-radius: 4px;
        text-transform: uppercase;
        font-weight: bold;
    }

    nav {
        display: flex;
        flex-direction: column;
        padding: 16px 0;
    }

    nav a {
        padding: 14px 24px;
        color: var(--text-sidebar);
        text-decoration: none;
        display: flex;
        align-items: center;
        gap: 12px;
        transition: all 0.2s;
        font-weight: 500;
    }

    nav a:hover, nav a.active {
        background-color: rgba(255,255,255,0.05);
        color: var(--text-sidebar-active);
        border-left: 4px solid var(--primary);
    }

    .main-wrapper {
        display: flex;
        flex-direction: column;
        height: 100vh;
        overflow: hidden;
    }

    .top-header {
        height: 64px;
        background-color: var(--bg-header);
        border-bottom: 1px solid var(--border-color);
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 32px;
    }

    .header-title h1 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
    }

    .server-status {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.85rem;
        color: var(--c-completed-text);
        background: var(--c-completed-bg);
        padding: 6px 12px;
        border-radius: 20px;
        border: 1px solid var(--c-completed-border);
    }

    .status-dot {
        width: 8px;
        height: 8px;
        background-color: var(--c-completed-border);
        border-radius: 50%;
        box-shadow: 0 0 8px var(--c-completed-border);
    }

    .content-area {
        flex: 1;
        overflow-y: auto;
        padding: 32px;
    }
</style>