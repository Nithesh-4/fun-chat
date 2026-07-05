@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

:root {
  font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  line-height: 1.5;
  font-weight: 400;

  color-scheme: dark;
  --bg-primary: #000000;
  --bg-secondary: #0a0a0c;
  --bg-tertiary: #16161a;
  --bg-chat-dark: #0b0e14;
  --bg-chat-light: #1e1e24;

  /* Accent Gradients & Colors */
  --gradient-instagram: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%);
  --accent-whatsapp: #25d366;
  --accent-whatsapp-dark: #075e54;
  --accent-whatsapp-teal: #128c7e;
  --accent-primary: #a855f7; /* Instagram Purple */
  --accent-secondary: #ec4899; /* Instagram Pink */
  --accent-success: #10b981; /* WhatsApp Emerald */
  --accent-error: #ef4444; /* Rose */
  --accent-info: #3b82f6; /* Blue */

  --text-primary: #f3f4f6;
  --text-secondary: #a1a1aa;
  --text-muted: #71717a;
  --border-color: rgba(255, 255, 255, 0.08);
  
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  
  --radius-sm: 10px;
  --radius-md: 16px;
  --radius-lg: 24px;
  
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  margin: 0;
  display: flex;
  place-items: center;
  min-width: 320px;
  min-height: 100vh;
  overflow: hidden;
  background: radial-gradient(circle at top left, #120e2e 0%, #030303 100%);
}

#root {
  width: 100%;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* Glassmorphism containers */
.glass-panel {
  background: rgba(10, 10, 12, 0.75);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-lg);
}

/* Scrollbars */
::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* Button & input styles */
button {
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  padding: 0.6em 1.2em;
  font-size: 0.9rem;
  font-weight: 600;
  font-family: inherit;
  background-color: var(--bg-tertiary);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  color: var(--text-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

button:hover {
  border-color: rgba(255, 255, 255, 0.15);
  background-color: rgba(255, 255, 255, 0.05);
  transform: translateY(-1px);
}

button:active {
  transform: translateY(0);
}

button.primary {
  background: var(--gradient-instagram);
  color: white;
  border: none;
}

button.primary:hover {
  box-shadow: 0 0 15px rgba(236, 72, 153, 0.35);
  filter: brightness(1.1);
}

input, select, textarea {
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
  padding: 0.65rem 0.95rem;
  font-size: 0.9rem;
  background-color: rgba(0, 0, 0, 0.3);
  color: var(--text-primary);
  outline: none;
  transition: all 0.25s ease;
  font-family: inherit;
}

input:focus, select:focus, textarea:focus {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 2px rgba(168, 85, 247, 0.2);
  background-color: rgba(0, 0, 0, 0.45);
}

/* Three Column Layout Setup */
.app-container {
  width: 96vw;
  height: 92vh;
  max-width: 1480px;
  max-height: 900px;
  border-radius: var(--radius-lg);
  display: flex;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

/* COLUMN 1: Narrow Left Icon Sidebar (Instagram Web style) */
.nav-sidebar {
  width: 78px;
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.5rem 0;
  justify-content: space-between;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 10;
}

.nav-sidebar-logo {
  font-size: 1.5rem;
  font-weight: 800;
  background: var(--gradient-instagram);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  cursor: pointer;
  margin-bottom: 2rem;
  transition: transform 0.3s ease;
}
.nav-sidebar-logo:hover {
  transform: rotate(5deg) scale(1.1);
}

.nav-items-group {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  width: 100%;
  align-items: center;
}

.nav-item-btn {
  width: 50px;
  height: 50px;
  border-radius: 14px;
  background: transparent;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  padding: 0;
}

.nav-item-btn:hover {
  background-color: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
  transform: scale(1.05);
}

.nav-item-btn.active {
  background-color: rgba(168, 85, 247, 0.12);
  color: var(--accent-secondary);
}

.nav-item-btn.active::after {
  content: '';
  position: absolute;
  left: 0;
  top: 15px;
  bottom: 15px;
  width: 3px;
  border-radius: 0 4px 4px 0;
  background: var(--gradient-instagram);
}

.nav-sidebar-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.user-profile-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--gradient-instagram);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: white;
  cursor: pointer;
  border: 2px solid var(--border-color);
  transition: all 0.3s ease;
  position: relative;
}

.user-profile-avatar:hover {
  transform: scale(1.08);
  border-color: var(--accent-secondary);
}

.user-profile-avatar.online::after {
  content: '';
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 12px;
  height: 12px;
  background-color: var(--accent-whatsapp);
  border-radius: 50%;
  border: 2px solid #000;
}

/* COLUMN 2: Middle Column (WhatsApp list with Instagram stories) */
.sidebar {
  width: 350px;
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  background-color: rgba(10, 10, 14, 0.3);
}

.sidebar-top-section {
  padding: 1.25rem 1rem 0.5rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.sidebar-title-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-heading {
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.search-box-container {
  position: relative;
  width: 100%;
}

.search-box-container input {
  width: 100%;
  padding-left: 2.25rem;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid transparent;
}

.search-box-container input:focus {
  border-color: rgba(255, 255, 255, 0.15);
  background-color: rgba(255, 255, 255, 0.08);
}

.search-icon-svg {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
}

/* Stories / Status Row */
.stories-container {
  padding: 0.5rem 1rem 0.75rem 1rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  gap: 0.85rem;
  overflow-x: auto;
  scrollbar-width: none;
}

.stories-container::-webkit-scrollbar {
  display: none;
}

.story-circle-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  min-width: 65px;
  transition: transform 0.25s ease;
}

.story-circle-item:hover {
  transform: scale(1.04);
}

.story-ring {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--border-color);
}

.story-ring.active-story {
  background: var(--gradient-instagram);
}

.story-ring.my-story {
  background: linear-gradient(135deg, var(--accent-whatsapp-teal) 0%, var(--accent-whatsapp) 100%);
}

.story-avatar-holder {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 2px solid #0a0a0c;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: white;
  position: relative;
  font-size: 1.1rem;
}

.story-avatar-holder img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.story-plus-badge {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: var(--accent-whatsapp);
  border: 2px solid #0a0a0c;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.65rem;
  font-weight: bold;
}

.story-username {
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-align: center;
  margin-top: 0.25rem;
  max-width: 65px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Chat Items */
.chat-list, .friends-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.chat-item, .friend-item {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.75rem 0.85rem;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.25s ease;
  border: 1px solid transparent;
}

.chat-item:hover, .friend-item:hover {
  background-color: rgba(255, 255, 255, 0.03);
}

.chat-item.active {
  background-color: rgba(168, 85, 247, 0.08);
  border-color: rgba(168, 85, 247, 0.15);
}

.chat-item-avatar-wrapper {
  position: relative;
}

.chat-item-avatar {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  border: 1.5px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: white;
  font-size: 1.05rem;
}

.chat-item-avatar.online-dot::after {
  content: '';
  position: absolute;
  bottom: 0;
  right: 0;
  width: 11px;
  height: 11px;
  background-color: var(--accent-whatsapp);
  border-radius: 50%;
  border: 2px solid #0d0f14;
}

.chat-item-details {
  flex: 1;
  min-width: 0;
}

.chat-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.2rem;
}

.chat-item-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-item-time {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.chat-item-preview-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.82rem;
  color: var(--text-secondary);
}

.chat-item-preview-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.chat-item-unread-badge {
  background-color: var(--accent-whatsapp);
  color: black;
  font-weight: 700;
  font-size: 0.7rem;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* COLUMN 3: Right Side Messaging Panel */
.chat-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-chat-dark);
  position: relative;
}

.chat-header {
  padding: 0.85rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: rgba(10, 10, 14, 0.75);
  backdrop-filter: blur(12px);
  z-index: 5;
}

.chat-header-user {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.chat-header-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  border: 1.5px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: white;
  font-size: 1rem;
  position: relative;
}

.chat-header-avatar.online-dot::after {
  content: '';
  position: absolute;
  bottom: 0;
  right: 0;
  width: 11px;
  height: 11px;
  background-color: var(--accent-whatsapp);
  border-radius: 50%;
  border: 2px solid #000;
}

.chat-header-info {
  display: flex;
  flex-direction: column;
}

.chat-header-name {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
}

.chat-header-status-line {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.chat-header-subtitle {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.chat-header-subtitle.online {
  color: var(--accent-whatsapp);
  font-weight: 600;
}

.chat-header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.icon-action-btn {
  background: transparent;
  border: none;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.25s ease;
  padding: 0;
}

.icon-action-btn:hover {
  background-color: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
}

/* Chat Wallpaper Overlays */
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 0.95rem;
  position: relative;
}

/* Wallpaper themes */
.wallpaper-default {
  background-color: #0b0f19;
  background-image: radial-gradient(#1a263b 1px, transparent 1px), radial-gradient(#1a263b 1px, transparent 1px);
  background-size: 20px 20px;
  background-position: 0 0, 10px 10px;
}

.wallpaper-instagram {
  background: linear-gradient(135deg, #0e051a 0%, #030303 60%, #1c0512 100%);
}

.wallpaper-obsidian {
  background-color: #050505;
}

.wallpaper-emerald {
  background: linear-gradient(135deg, #021c10 0%, #030508 70%, #042416 100%);
}

/* Message Rows & Bubbles */
.message-row {
  display: flex;
  width: 100%;
  animation: slideUp 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
  position: relative;
}

.message-row.sent {
  justify-content: flex-end;
}

.message-row.received {
  justify-content: flex-start;
}

.message-bubble {
  max-width: 60%;
  min-width: 120px;
  padding: 0.65rem 0.9rem;
  border-radius: 18px;
  position: relative;
  box-shadow: var(--shadow-md);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  transition: transform 0.2s ease;
  user-select: none;
}

.message-bubble:active {
  transform: scale(0.98);
}

.message-row.sent .message-bubble {
  background: linear-gradient(135deg, #7c3aed 0%, #db2777 100%);
  border-bottom-right-radius: 4px;
  color: white;
}

.message-row.received .message-bubble {
  background-color: var(--bg-tertiary);
  border-bottom-left-radius: 4px;
  color: var(--text-primary);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

/* Hover Quick Reactions Bar */
.message-hover-reactions {
  position: absolute;
  top: -38px;
  background: rgba(22, 22, 26, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 30px;
  padding: 4px 8px;
  display: flex;
  gap: 6px;
  box-shadow: var(--shadow-lg);
  z-index: 10;
  backdrop-filter: blur(10px);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s ease;
  transform: translateY(5px);
}

.message-row.sent .message-hover-reactions {
  right: 10px;
}

.message-row.received .message-hover-reactions {
  left: 10px;
}

.message-row:hover .message-hover-reactions {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}

.reaction-option {
  font-size: 1.15rem;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.reaction-option:hover {
  transform: scale(1.3);
}

/* Reacted Bubble Styles */
.message-reactions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  position: absolute;
  bottom: -12px;
  z-index: 3;
}

.message-row.sent .message-reactions-container {
  right: 12px;
}

.message-row.received .message-reactions-container {
  left: 12px;
}

.message-reaction-badge {
  background: rgba(25, 25, 30, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 1px 5px;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-sm);
  animation: popScale 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.5);
  cursor: pointer;
}

.message-reaction-badge:hover {
  background: rgba(255, 255, 255, 0.08);
}

.message-text {
  font-size: 0.92rem;
  word-break: break-word;
  line-height: 1.45;
}

.message-cipher-preview {
  font-size: 0.65rem;
  opacity: 0.45;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding-top: 0.2rem;
  margin-top: 0.2rem;
  font-family: monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.message-meta-row {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 0.1rem;
}

.message-row.received .message-meta-row {
  color: var(--text-muted);
}

.encryption-icon {
  font-size: 0.68rem;
  opacity: 0.45;
}

/* Double Checkmark delivery icons */
.checkmark-container {
  display: inline-flex;
  align-items: center;
  margin-left: 2px;
}

.checkmark-svg {
  width: 14px;
  height: 14px;
  fill: currentColor;
}

.checkmark-svg.delivered {
  color: rgba(255, 255, 255, 0.4);
}

.checkmark-svg.read {
  color: #34b7f1; /* WhatsApp Read Blue */
}

/* Typing indicator */
.typing-row {
  display: flex;
  margin-bottom: 0.5rem;
}

.typing-bubble {
  background-color: var(--bg-tertiary);
  padding: 0.65rem 1rem;
  border-radius: 18px;
  border-bottom-left-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  gap: 4px;
}

.typing-dot {
  width: 6px;
  height: 6px;
  background-color: var(--text-muted);
  border-radius: 50%;
  animation: typingBounce 1.4s infinite ease-in-out;
}

.typing-dot:nth-child(1) { animation-delay: 0s; }
.typing-dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dot:nth-child(3) { animation-delay: 0.4s; }

/* Voice Notes Bubble */
.voice-note-bubble {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.4rem 0.25rem;
  min-width: 220px;
}

.voice-play-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: white;
  transition: background 0.2s ease;
}

.voice-play-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.voice-waveform-container {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 3px;
  height: 24px;
}

.waveform-bar {
  flex: 1;
  width: 2px;
  background-color: rgba(255, 255, 255, 0.3);
  border-radius: 1px;
  transition: background-color 0.2s ease, height 0.2s ease;
}

.waveform-bar.active-bar {
  background-color: white;
}

.message-row.received .waveform-bar {
  background-color: rgba(255, 255, 255, 0.2);
}

.message-row.received .waveform-bar.active-bar {
  background-color: var(--accent-whatsapp-teal);
}

.voice-note-duration {
  font-size: 0.75rem;
  font-family: monospace;
}

/* Chat Input Area */
.chat-input-bar {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background-color: rgba(10, 10, 14, 0.85);
  backdrop-filter: blur(10px);
}

.chat-input-bar input {
  flex: 1;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid transparent;
  border-radius: 20px;
  padding: 0.65rem 1.25rem;
}

.chat-input-bar input:focus {
  border-color: rgba(255, 255, 255, 0.1);
  background-color: rgba(255, 255, 255, 0.08);
}

/* Wallpaper Popover Settings button */
.wallpaper-selector-container {
  position: relative;
}

.wallpaper-popover {
  position: absolute;
  bottom: 50px;
  right: 0;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 0.85rem;
  width: 200px;
  box-shadow: var(--shadow-lg);
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.wallpaper-popover-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.wallpaper-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}

.wallpaper-option-btn {
  height: 48px;
  border-radius: 8px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
}

.wallpaper-option-btn:hover {
  transform: scale(1.05);
}

.wallpaper-option-btn.selected {
  border-color: var(--accent-primary);
}

/* Voice Recording State Panel */
.recording-state-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 20px;
  padding: 0.55rem 1.25rem;
  animation: pulseBg 2s infinite ease-in-out;
}

.recording-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #ef4444;
}

.recording-dot-blink {
  width: 8px;
  height: 8px;
  background-color: #ef4444;
  border-radius: 50%;
  animation: blinkRed 1s infinite alternate;
}

.recording-wave-visualizer {
  display: flex;
  align-items: center;
  gap: 3px;
  height: 18px;
  margin-left: 1rem;
}

.rec-bar {
  width: 2px;
  background-color: #ef4444;
  border-radius: 1px;
  animation: recWaveBounce 0.8s infinite ease-in-out alternate;
}

.rec-bar:nth-child(1) { height: 6px; animation-delay: 0.1s; }
.rec-bar:nth-child(2) { height: 14px; animation-delay: 0.3s; }
.rec-bar:nth-child(3) { height: 8px; animation-delay: 0.5s; }
.rec-bar:nth-child(4) { height: 16px; animation-delay: 0.2s; }
.rec-bar:nth-child(5) { height: 10px; animation-delay: 0.4s; }

.recording-time {
  font-family: monospace;
  font-size: 0.9rem;
  font-weight: 600;
}

.cancel-rec-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.cancel-rec-btn:hover {
  color: var(--text-primary);
  text-decoration: underline;
}

/* Modals & Overlays */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-content {
  width: 90%;
  max-width: 480px;
  border-radius: var(--radius-lg);
  padding: 2.25rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0.85rem;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.close-btn {
  background: transparent;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-muted);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background-color: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
}

/* Instagram Story Overlay */
.story-viewer-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(15px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1200;
  animation: fadeIn 0.3s ease;
}

.story-viewer-container {
  width: 100%;
  max-width: 420px;
  height: 90vh;
  max-height: 720px;
  border-radius: 18px;
  background-color: #121215;
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  box-shadow: 0 30px 60px rgba(0,0,0,0.8);
}

.story-viewer-progress-bars {
  position: absolute;
  top: 10px;
  left: 10px;
  right: 10px;
  display: flex;
  gap: 4px;
  z-index: 10;
}

.story-progress-track {
  flex: 1;
  height: 3px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 2px;
  overflow: hidden;
}

.story-progress-fill {
  height: 100%;
  width: 0%;
  background-color: white;
  transition: width 0.1s linear;
}

.story-viewer-header {
  padding: 1.5rem 1rem 1rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 100%);
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9;
}

.story-viewer-profile {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.story-viewer-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--gradient-instagram);
  border: 1.5px solid white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: white;
  font-size: 0.95rem;
}

.story-viewer-meta {
  display: flex;
  flex-direction: column;
}

.story-viewer-name {
  font-size: 0.9rem;
  font-weight: 700;
  color: white;
}

.story-viewer-username {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
}

.story-viewer-close {
  background: transparent;
  border: none;
  color: white;
  font-size: 1.75rem;
  cursor: pointer;
  text-shadow: 0 2px 4px rgba(0,0,0,0.5);
  padding: 0 0.5rem;
}

.story-viewer-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  text-align: center;
  position: relative;
  background: linear-gradient(135deg, #1b0e35 0%, #0c0817 100%);
}

.story-viewer-content-quote {
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  line-height: 1.4;
  margin-bottom: 1.5rem;
  max-width: 320px;
  background: var(--gradient-instagram);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.story-viewer-content-details {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 1.25rem;
  width: 100%;
  max-width: 320px;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  backdrop-filter: blur(8px);
}

.story-detail-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.82rem;
  color: rgba(255, 255, 255, 0.6);
}

.story-detail-row strong {
  color: white;
}

/* Call Overlay (Voice/Video) Screen */
.call-overlay-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(20px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1500;
  animation: fadeIn 0.35s ease;
}

.call-overlay-card {
  width: 100%;
  max-width: 440px;
  height: 90vh;
  max-height: 780px;
  border-radius: 24px;
  background-color: #0b0e14;
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 3rem 2rem 2.5rem 2rem;
  position: relative;
  overflow: hidden;
  box-shadow: 0 40px 80px rgba(0, 0, 0, 0.7);
}

/* Ringing visualization */
.call-ringing-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  margin-top: 4rem;
}

.call-ringing-avatar-outer {
  position: relative;
  width: 130px;
  height: 130px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ringing-pulse-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: var(--gradient-instagram);
  opacity: 0.3;
  animation: callPulseRing 2s infinite ease-out;
}
.ringing-pulse-ring:nth-child(2) {
  animation-delay: 0.6s;
}
.ringing-pulse-ring:nth-child(3) {
  animation-delay: 1.2s;
}

.call-ringing-avatar {
  width: 110px;
  height: 110px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  border: 3px solid white;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  font-weight: 700;
  color: white;
  box-shadow: var(--shadow-lg);
}

.call-ringing-name {
  font-size: 1.4rem;
  font-weight: 700;
  color: white;
}

.call-ringing-status {
  font-size: 0.9rem;
  color: var(--accent-whatsapp);
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  animation: pulse 1.5s infinite alternate;
}

/* Connected call state */
.call-connected-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: relative;
  height: 100%;
  justify-content: center;
}

.video-grid-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 80%;
  width: 100%;
}

.video-stream-box {
  flex: 1;
  background-color: #1a1a24;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.08);
  position: relative;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
}

.video-placeholder-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--gradient-instagram);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 700;
  color: white;
}

.video-stream-box video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-stream-box.active-filter::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

/* Filter styles */
.filter-sepia { filter: sepia(0.65) contrast(1.1); }
.filter-vintage { filter: grayscale(0.2) contrast(1.2) sepia(0.2); }
.filter-neon { filter: hue-rotate(90deg) saturate(1.8); }
.filter-blackwhite { filter: grayscale(1) contrast(1.3); }

.video-overlay-tag {
  position: absolute;
  bottom: 12px;
  left: 12px;
  background: rgba(0,0,0,0.6);
  padding: 3px 8px;
  border-radius: 8px;
  font-size: 0.75rem;
  color: white;
  backdrop-filter: blur(4px);
  z-index: 5;
}

.filter-picker-bar {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 0.5rem 0;
  scrollbar-width: none;
}

.filter-picker-bar::-webkit-scrollbar {
  display: none;
}

.filter-chip-btn {
  padding: 0.35rem 0.75rem;
  border-radius: 14px;
  font-size: 0.75rem;
  white-space: nowrap;
  background-color: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.08);
}

.filter-chip-btn.active {
  background: var(--gradient-instagram);
  border: none;
  color: white;
}

.call-timer-tag {
  position: absolute;
  top: -25px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(255, 255, 255, 0.08);
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-family: monospace;
}

/* Call Actions Controls Row */
.call-actions-row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1.25rem;
  margin-top: 1rem;
}

.call-ctrl-btn {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.25s ease;
  color: white;
  padding: 0;
}

.call-ctrl-btn.decline {
  background-color: #ef4444;
}

.call-ctrl-btn.decline:hover {
  background-color: #dc2626;
  box-shadow: 0 0 15px rgba(239, 68, 68, 0.4);
}

.call-ctrl-btn.accept {
  background-color: #25d366;
}

.call-ctrl-btn.accept:hover {
  background-color: #22c55e;
  box-shadow: 0 0 15px rgba(37, 211, 102, 0.4);
}

.call-ctrl-btn.secondary {
  background-color: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.call-ctrl-btn.secondary:hover {
  background-color: rgba(255, 255, 255, 0.18);
}

.call-ctrl-btn.secondary.muted-active {
  background-color: #ef4444;
  color: white;
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(12px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes popScale {
  0% { transform: scale(0.4); opacity: 0; }
  70% { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1); }
}

@keyframes callPulseRing {
  0% { transform: scale(1); opacity: 0.4; }
  100% { transform: scale(1.6); opacity: 0; }
}

@keyframes blinkRed {
  from { opacity: 0.3; }
  to { opacity: 1; }
}

@keyframes recWaveBounce {
  from { transform: scaleY(0.4); }
  to { transform: scaleY(1.3); }
}

@keyframes typingBounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

/* Saved Accounts List */
.saved-accounts-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  width: 100%;
}

.saved-account-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.65rem 0.85rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  transition: all 0.2s ease;
}

.saved-account-item:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(168, 85, 247, 0.3);
}

.saved-account-profile {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.saved-account-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.auth-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.auth-card {
  width: 100%;
  max-width: 440px;
  padding: 2.5rem;
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  border: 1px solid var(--border-color);
}

.auth-header {
  text-align: center;
  margin-bottom: 0.5rem;
}

.auth-logo {
  font-size: 2.6rem;
  font-weight: 800;
  letter-spacing: -1px;
  background: var(--gradient-instagram);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 0.25rem;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-group label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.form-row {
  display: flex;
  gap: 1rem;
}

.form-row > .form-group {
  flex: 1;
}

.auth-toggle {
  text-align: center;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.auth-toggle span {
  color: var(--accent-secondary);
  cursor: pointer;
  font-weight: 600;
}

.auth-toggle span:hover {
  text-decoration: underline;
}
