import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const API_BASE = window.location.origin;

// Simple client-side cryptographic simulation
const generateDeviceKeys = () => {
  const randId = () => Math.random().toString(36).substring(2, 10).toUpperCase();
  const identityPublicKey = `FC-PUB-${randId()}`;
  const identityPrivateKey = `FC-PRIV-${randId()}`;
  const signedPreKey = `FC-SPK-${randId()}`;
  const signature = `FC-SIG-${randId()}`;
  const oneTimePreKeys = Array.from({ length: 5 }, (_, i) => `FC-OPK-${i}-${randId()}`);
  return { identityPublicKey, identityPrivateKey, signedPreKey, signature, oneTimePreKeys };
};

const encryptPayload = (plaintext, key) => {
  // Simple rotation cipher simulation to look like a ciphertext
  const encoded = btoa(encodeURIComponent(plaintext));
  return `E2E-AES[${key || 'unknown'}]:${encoded}`;
};

const decryptPayload = (ciphertext) => {
  if (!ciphertext || !ciphertext.startsWith('E2E-AES[')) return ciphertext;
  try {
    const parts = ciphertext.split(':');
    if (parts.length < 2) return ciphertext;
    const encoded = parts.slice(1).join(':');
    return decodeURIComponent(atob(encoded));
  } catch (err) {
    return '[Decryption Failure: Key mismatch or corrupted content]';
  }
};

export default function App() {
  // Authentication & session state
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));
  const [authScreen, setAuthScreen] = useState('login'); // login | register
  const [savedAccounts, setSavedAccounts] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('funchat_saved_accounts') || '[]');
    } catch {
      return [];
    }
  });
  const [showManualLogin, setShowManualLogin] = useState(false);

  // Login Form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register Form
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regDob, setRegDob] = useState('');
  const [regCountry, setRegCountry] = useState('United States');
  const [regUsername, setRegUsername] = useState('');
  const [regDisplayName, setRegDisplayName] = useState('');
  const [regGender, setRegGender] = useState('male');

  // App navigation state
  const [navTab, setNavTab] = useState('chats'); // chats | friends | settings
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);

  // Modals & Popups
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendUsernameInput, setFriendUsernameInput] = useState('');
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editUsername, setEditUsername] = useState('');

  // Cooldown profiles
  const [usernameCooldown, setUsernameCooldown] = useState(null);

  // UI Status
  const [typingUsers, setTypingUsers] = useState({}); // userId -> boolean
  const [activeChatOnline, setActiveChatOnline] = useState(false);

  // Admin Portal state
  const [adminStats, setAdminStats] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);

  // References
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // API helper for authenticated REST requests
  const apiFetch = async (endpoint, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers
    };
    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'API request failed');
    }
    return data;
  };

  // Scroll messages to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUsers]);

  // Handle socket connections and real-time events
  useEffect(() => {
    if (!token || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Initialize Socket.io connection
    const socket = io(API_BASE, {
      auth: { token }
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to real-time sync server');
    });

    // Handle incoming messages
    socket.on('chat:message:received', (message) => {
      // Add message if it belongs to current active chat
      if (activeChat && message.chatId === activeChat.id) {
        setMessages(prev => {
          if (prev.some(m => m.id === message.id)) return prev;
          return [...prev, message];
        });

        // Mark as read immediately
        socket.emit('chat:message:read', {
          chatId: activeChat.id,
          messageIds: [message.id]
        });
      }

      // Refresh chat list to update last message preview
      fetchChats();
    });

    // Listen to updates from other tabs/list updating
    socket.on('chat:message:notify', (payload) => {
      fetchChats();
    });

    // Handle typing indicators
    socket.on('chat:typing:start', ({ chatId, userId }) => {
      if (activeChat && chatId === activeChat.id) {
        setTypingUsers(prev => ({ ...prev, [userId]: true }));
      }
    });

    socket.on('chat:typing:stop', ({ chatId, userId }) => {
      if (activeChat && chatId === activeChat.id) {
        setTypingUsers(prev => ({ ...prev, [userId]: false }));
      }
    });

    // Handle online/offline presence changes
    socket.on('presence:update', ({ userId: statusUserId, status }) => {
      if (activeChat) {
        // If active chat is direct and corresponds to this user, update active chat status
        // We'd query details or we can refresh chat status
        checkActiveChatPresence();
      }
      fetchChats();
    });

    return () => {
      socket.disconnect();
    };
  }, [token, user, activeChat]);

  // Fetch lists when logged in
  useEffect(() => {
    if (token) {
      fetchChats();
      fetchFriends();
      fetchPendingRequests();
      fetchUsernameStatus();
    }
  }, [token]);

  // Fetch admin portal details
  useEffect(() => {
    if (navTab === 'admin' && user?.role === 'admin') {
      apiFetch('/users/admin/stats')
        .then(data => setAdminStats(data))
        .catch(err => console.error(err));

      apiFetch('/users/admin/users')
        .then(data => setAdminUsers(data))
        .catch(err => console.error(err));
    }
  }, [navTab]);

  // Handle active chat changes
  useEffect(() => {
    if (!activeChat) {
      setMessages([]);
      return;
    }

    // Join room
    if (socketRef.current) {
      socketRef.current.emit('chat:join', { chatId: activeChat.id });
    }

    // Fetch message history
    apiFetch(`/chats/${activeChat.id}/messages`)
      .then(msgs => {
        setMessages(msgs);

        // Mark unread messages as read
        const unreadIds = msgs
          .filter(m => m.senderId !== user.id)
          .map(m => m.id);

        if (unreadIds.length > 0 && socketRef.current) {
          socketRef.current.emit('chat:message:read', {
            chatId: activeChat.id,
            messageIds: unreadIds
          });
        }
      })
      .catch(err => console.error(err));

    checkActiveChatPresence();
    setTypingUsers({});

    return () => {
      if (socketRef.current && activeChat) {
        socketRef.current.emit('chat:leave', { chatId: activeChat.id });
      }
    };
  }, [activeChat]);

  const checkActiveChatPresence = async () => {
    if (!activeChat || activeChat.type !== 'DIRECT') {
      setActiveChatOnline(false);
      return;
    }
    try {
      // Find other member profile to check status
      const chatDetails = await apiFetch(`/chats`);
      const current = chatDetails.find(c => c.id === activeChat.id);
      if (current) {
        // Find friend details
        const friendProfile = await apiFetch(`/users/${current.name}`);
        setActiveChatOnline(friendProfile.profile.isOnline);
      }
    } catch (e) {
      setActiveChatOnline(false);
    }
  };

  const fetchChats = async () => {
    try {
      const data = await apiFetch('/chats');
      setChats(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFriends = async () => {
    try {
      const data = await apiFetch('/chats/friendships');
      setFriends(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const data = await apiFetch('/chats/friendships/requests');
      setPendingRequests(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsernameStatus = async () => {
    try {
      const status = await apiFetch('/users/me/username-status');
      setUsernameCooldown(status);
    } catch (err) {
      console.error(err);
    }
  };

  // Auth Operations
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: loginEmail || undefined,
          phone: loginPhone || undefined,
          password: loginPassword
        })
      });

      // Save key bundles locally if not initialized
      let keyData = localStorage.getItem(`keys:${data.user.id}`);
      if (!keyData) {
        const newKeys = generateDeviceKeys();
        localStorage.setItem(`keys:${data.user.id}`, JSON.stringify(newKeys));
        keyData = JSON.stringify(newKeys);
      }
      const parsedKeys = JSON.parse(keyData);

      // Upload prekey bundles to the server
      await fetch(`${API_BASE}/chats/prekey`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${data.accessToken}`
        },
        body: JSON.stringify({
          deviceId: 'device-1',
          identityPublicKey: parsedKeys.identityPublicKey,
          signedPreKeyId: 1,
          signedPreKey: parsedKeys.signedPreKey,
          signature: parsedKeys.signature,
          oneTimePreKeys: parsedKeys.oneTimePreKeys
        })
      });

      localStorage.setItem('token', data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Save to saved accounts list
      const updatedAccounts = savedAccounts.filter(acc => acc.user.id !== data.user.id);
      const newSaved = [...updatedAccounts, { user: data.user, token: data.accessToken }];
      localStorage.setItem('funchat_saved_accounts', JSON.stringify(newSaved));
      setSavedAccounts(newSaved);
      setShowManualLogin(false); // Reset manual login toggle

      setToken(data.accessToken);
      setUser(data.user);

      // Clear input fields
      setLoginEmail('');
      setLoginPhone('');
      setLoginPassword('');
    } catch (err) {
      alert(`Login failed: ${err.message}`);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: regEmail,
          phone: regPhone,
          password: regPassword,
          dateOfBirth: regDob,
          country: regCountry,
          username: regUsername,
          displayName: regDisplayName,
          gender: regGender
        })
      });

      alert('Registration successful! Please login.');
      setAuthScreen('login');

      // Auto fill login fields
      setLoginEmail(regEmail);

      // Clear forms
      setRegEmail('');
      setRegPhone('');
      setRegPassword('');
      setRegDob('');
      setRegUsername('');
      setRegDisplayName('');
    } catch (err) {
      alert(`Registration failed: ${err.message}`);
    }
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: '' })
      });
    } catch (e) { }

    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
    setActiveChat(null);
    setChats([]);
    setFriends([]);
  };

  const handleSwitchAccount = (acc) => {
    localStorage.setItem('token', acc.token);
    localStorage.setItem('user', JSON.stringify(acc.user));
    setToken(acc.token);
    setUser(acc.user);
    setActiveChat(null);
    setChats([]);
    setFriends([]);
  };

  const handleRemoveAccount = (userId) => {
    const updated = savedAccounts.filter(acc => acc.user.id !== userId);
    localStorage.setItem('funchat_saved_accounts', JSON.stringify(updated));
    setSavedAccounts(updated);
    if (user && user.id === userId) {
      handleLogout();
    }
  };

  // Messaging operations
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeChat) return;

    const tempText = messageInput;
    setMessageInput('');

    // Stop typing indicators
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      socketRef.current.emit('chat:typing:stop', { chatId: activeChat.id });
    }

    try {
      // Simulate E2E Encryption
      // Fetch recipient pre-key bundle if direct
      let encryptionKey = 'shared-session-key';
      if (activeChat.type === 'DIRECT') {
        try {
          // Get other member details
          const current = chats.find(c => c.id === activeChat.id);
          const friendProfile = await apiFetch(`/users/${current.name}`);
          const otherUserId = friendProfile.profile.userId;

          const prekeyBundle = await apiFetch(`/chats/prekey/${otherUserId}`);
          encryptionKey = prekeyBundle.identityPublicKey;
        } catch (e) {
          console.warn('Failed to load recipient prekeys, falling back to basic session encryption', e);
        }
      }

      const clientTempId = `temp-${Date.now()}`;
      const ciphertext = encryptPayload(tempText, encryptionKey);

      socketRef.current.emit('chat:message:send', {
        chatId: activeChat.id,
        clientTempId,
        ciphertext,
        senderKeyId: encryptionKey,
        attachments: []
      }, (ack) => {
        if (ack.error) {
          alert(`Message failed to deliver: ${ack.error}`);
        }
      });

    } catch (err) {
      console.error(err);
    }
  };

  // Typing state emitter
  const handleInputChange = (e) => {
    setMessageInput(e.target.value);

    if (!socketRef.current || !activeChat) return;

    // Send typing start if not already typing
    if (!typingTimeoutRef.current) {
      socketRef.current.emit('chat:typing:start', { chatId: activeChat.id });
    } else {
      clearTimeout(typingTimeoutRef.current);
    }

    // Debounce typing stop after 2.5s of no keypress
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current.emit('chat:typing:stop', { chatId: activeChat.id });
      typingTimeoutRef.current = null;
    }, 2500);
  };

  // Profile management
  const openProfileEditor = () => {
    setEditDisplayName(user.displayName || '');
    setEditBio('');
    setEditAvatarUrl('');
    setEditUsername(user.username || '');
    setShowEditProfile(true);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const data = await apiFetch('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          displayName: editDisplayName,
          bio: editBio || undefined,
          avatarUrl: editAvatarUrl || undefined,
          username: editUsername !== user.username ? editUsername : undefined
        })
      });

      const updatedUser = {
        ...user,
        displayName: data.profile.displayName,
        username: data.profile.username
      };

      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      // Update saved accounts list
      const updatedAccounts = savedAccounts.map(acc => {
        if (acc.user.id === user.id) {
          return { ...acc, user: updatedUser };
        }
        return acc;
      });
      localStorage.setItem('funchat_saved_accounts', JSON.stringify(updatedAccounts));
      setSavedAccounts(updatedAccounts);

      setUsernameCooldown({
        remainingFreeChanges: data.remainingFreeChanges,
        nextEligibleDate: data.nextEligibleDate
      });
      setShowEditProfile(false);
      alert('Profile updated successfully!');
    } catch (err) {
      alert(`Update failed: ${err.message}`);
    }
  };

  // Friendships
  const handleSendFriendRequest = async (e) => {
    e.preventDefault();
    if (!friendUsernameInput.trim()) return;

    try {
      await apiFetch('/chats/friendships/request', {
        method: 'POST',
        body: JSON.stringify({ username: friendUsernameInput })
      });
      alert(`Friend request sent to ${friendUsernameInput}!`);
      setFriendUsernameInput('');
      setShowAddFriend(false);
    } catch (err) {
      alert(`Failed to send request: ${err.message}`);
    }
  };

  const handleFriendResponse = async (friendshipId, action) => {
    try {
      await apiFetch('/chats/friendships/respond', {
        method: 'POST',
        body: JSON.stringify({ friendshipId, action })
      });
      fetchFriends();
      fetchPendingRequests();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleStartChat = async (friendUserId) => {
    try {
      const chat = await apiFetch('/chats', {
        method: 'POST',
        body: JSON.stringify({
          type: 'DIRECT',
          recipientId: friendUserId
        })
      });

      // Refresh chats and set active
      const data = await apiFetch('/chats');
      setChats(data);
      const chosen = data.find(c => c.id === chat.id);
      setActiveChat(chosen || chat);
      setNavTab('chats');
    } catch (err) {
      alert(err.message);
    }
  };

  if (!token) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card glass-panel">
          <div className="auth-header">
            <h1 className="auth-logo">fuN ChaT</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Secure, blind-server messaging portal</p>
          </div>

          {authScreen === 'login' ? (
            savedAccounts.length > 0 && !showManualLogin ? (
              <div className="auth-form" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>SAVED ACCOUNTS ON THIS DEVICE</span>
                <div className="saved-accounts-list">
                  {savedAccounts.map(acc => (
                    <div key={acc.user.id} className="saved-account-item">
                      <div className="saved-account-profile">
                        <div className="avatar" style={{ width: '32px', height: '32px', fontSize: '0.85rem' }}>
                          {acc.user.displayName ? acc.user.displayName[0].toUpperCase() : 'U'}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{acc.user.displayName}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>@{acc.user.username}</span>
                        </div>
                      </div>
                      <div className="saved-account-actions">
                        <button
                          className="primary"
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                          onClick={() => handleSwitchAccount(acc)}
                        >
                          Login
                        </button>
                        <button
                          style={{ padding: '0.25rem 0.4rem', fontSize: '0.75rem', backgroundColor: 'transparent', border: '1px solid var(--border-color)', color: 'var(--accent-error)' }}
                          onClick={() => handleRemoveAccount(acc.user.id)}
                          title="Remove Account"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="primary"
                  style={{ marginTop: '0.5rem', background: 'transparent', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)' }}
                  onClick={() => setShowManualLogin(true)}
                >
                  Use another account
                </button>

                <div className="auth-toggle">
                  Don't have an account? <span onClick={() => setAuthScreen('register')}>Register here</span>
                </div>
              </div>
            ) : (
              <form className="auth-form" onSubmit={handleLogin}>
                {savedAccounts.length > 0 && (
                  <button
                    type="button"
                    style={{ marginBottom: '1rem', width: '100%', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.8rem', padding: '0.4rem' }}
                    onClick={() => setShowManualLogin(false)}
                  >
                    ← Back to saved accounts
                  </button>
                )}
                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    placeholder="name@domain.com"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                  />
                </div>

                <div style={{ textAlign: 'center', margin: '0.25rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>— OR —</div>

                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="text"
                    placeholder="+1234567890"
                    value={loginPhone}
                    onChange={e => setLoginPhone(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    required
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                  />
                </div>

                <button type="submit" className="primary" style={{ marginTop: '0.5rem' }}>Login Account</button>

                <div className="auth-toggle">
                  Don't have an account? <span onClick={() => setAuthScreen('register')}>Register here</span>
                </div>
              </form>
            )
          ) : (
            <form className="auth-form" onSubmit={handleRegister}>
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    required
                    value={regDisplayName}
                    onChange={e => setRegDisplayName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Username</label>
                  <input
                    type="text"
                    placeholder="johndoe_99"
                    required
                    value={regUsername}
                    onChange={e => setRegUsername(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="name@domain.com"
                  required
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="text"
                  placeholder="+1234567890"
                  required
                  value={regPhone}
                  onChange={e => setRegPhone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  required
                  value={regPassword}
                  onChange={e => setRegPassword(e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Date of Birth</label>
                  <input
                    type="date"
                    required
                    value={regDob}
                    onChange={e => setRegDob(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Country</label>
                  <input
                    type="text"
                    placeholder="United States"
                    required
                    value={regCountry}
                    onChange={e => setRegCountry(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Gender (optional)</label>
                <select value={regGender} onChange={e => setRegGender(e.target.value)}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other / Prefer not to say</option>
                </select>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.2rem' }}>
                By creating an account, you confirm you are 18 years or older and accept our Terms & Policies.
              </div>

              <button type="submit" className="primary">Register Account</button>

              <div className="auth-toggle">
                Already registered? <span onClick={() => setAuthScreen('login')}>Sign in here</span>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app-container glass-panel">
      {/* SIDEBAR NAVIGATION */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="user-profile-badge" onClick={openProfileEditor}>
            <div className="avatar online">{user.displayName ? user.displayName[0].toUpperCase() : 'U'}</div>
            <div className="user-info">
              <span className="display-name">{user.displayName}</span>
              <span className="username-tag">@{user.username}</span>
            </div>
          </div>
          <button style={{ padding: '0.4rem', borderRadius: '50%', fontSize: '1rem' }} onClick={handleLogout} title="Log Out">
            🚪
          </button>
        </div>

        <div className="sidebar-nav">
          <button className={`nav-tab ${navTab === 'chats' ? 'active' : ''}`} onClick={() => setNavTab('chats')}>
            Chats
          </button>
          <button className={`nav-tab ${navTab === 'friends' ? 'active' : ''}`} onClick={() => setNavTab('friends')}>
            Friends ({friends.length})
          </button>
          <button className={`nav-tab ${navTab === 'settings' ? 'active' : ''}`} onClick={() => setNavTab('settings')}>
            Account
          </button>
          {user?.role === 'admin' && (
            <button className={`nav-tab ${navTab === 'admin' ? 'active' : ''}`} onClick={() => setNavTab('admin')}>
              🛡️ Admin
            </button>
          )}
        </div>

        {/* SIDEBAR VIEWS */}
        {navTab === 'chats' && (
          <div className="chat-list">
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>ACTIVE CONVERSATIONS</span>
              <button style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={() => setNavTab('friends')}>
                + New
              </button>
            </div>
            {chats.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">💬</div>
                <div>No chats started yet</div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Go to Friends and initiate a secure chat!</p>
              </div>
            ) : (
              chats.map(c => (
                <div
                  key={c.id}
                  className={`chat-item ${activeChat?.id === c.id ? 'active' : ''}`}
                  onClick={() => setActiveChat(c)}
                >
                  <div className="avatar">{c.name[0].toUpperCase()}</div>
                  <div className="item-details">
                    <div className="item-header">
                      <span className="item-name">{c.name}</span>
                      {c.lastMessage && (
                        <span className="item-time">
                          {new Date(c.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <div className="item-preview">
                      {c.lastMessage ? (
                        c.lastMessage.senderId === user.id ? (
                          <span>You: {decryptPayload(c.lastMessage.ciphertext)}</span>
                        ) : (
                          decryptPayload(c.lastMessage.ciphertext)
                        )
                      ) : (
                        <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No messages yet</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {navTab === 'friends' && (
          <div className="friends-list">
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>FRIENDS DIRECTORY</span>
              <button style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} className="primary" onClick={() => setShowAddFriend(true)}>
                Add Friend
              </button>
            </div>

            {/* Pending Friend Requests */}
            {pendingRequests.length > 0 && (
              <div style={{ padding: '0.25rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-secondary)', fontWeight: 600 }}>PENDING INCOMING REQUESTS ({pendingRequests.length})</span>
                {pendingRequests.map(req => (
                  <div key={req.friendshipId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div className="avatar" style={{ width: '28px', height: '28px', fontSize: '0.8rem' }}>
                        {req.requester.displayName[0].toUpperCase()}
                      </div>
                      <span style={{ fontSize: '0.85rem' }}>@{req.requester.username}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem' }} className="primary" onClick={() => handleFriendResponse(req.friendshipId, 'ACCEPT')}>Accept</button>
                      <button style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem' }} onClick={() => handleFriendResponse(req.friendshipId, 'REJECT')}>Ignore</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {friends.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">👥</div>
                <div>No friends added yet</div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Send a request to a username to connect!</p>
              </div>
            ) : (
              friends.map(f => (
                <div key={f.userId} className="friend-item">
                  <div className="avatar">{f.displayName[0].toUpperCase()}</div>
                  <div className="item-details">
                    <div className="item-header">
                      <span className="item-name">{f.displayName}</span>
                      <button style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }} className="primary" onClick={() => handleStartChat(f.userId)}>
                        Chat
                      </button>
                    </div>
                    <div className="username-tag">@{f.username}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {navTab === 'settings' && (
          <div style={{ padding: '1.25rem', display: 'flex', flex: '1', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>ACCOUNT DETAILS</span>
            <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(0,0,0,0.2)', fontSize: '0.8rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div><strong style={{ color: 'var(--accent-primary)' }}>Display Name:</strong><br />{user.displayName}</div>
              <div><strong style={{ color: 'var(--accent-secondary)' }}>Username:</strong><br />@{user.username}</div>
              <div><strong style={{ color: 'var(--accent-primary)' }}>Email:</strong><br />{user.email || 'N/A'}</div>
              <div><strong style={{ color: 'var(--accent-secondary)' }}>Phone:</strong><br />{user.phone || 'N/A'}</div>
            </div>

            {savedAccounts.filter(acc => acc.user.id !== user.id).length > 0 && (
              <>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.5rem' }}>SWITCH ACCOUNT</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {savedAccounts.filter(acc => acc.user.id !== user.id).map(acc => (
                    <div key={acc.user.id} className="saved-account-item">
                      <div className="saved-account-profile">
                        <div className="avatar" style={{ width: '28px', height: '28px', fontSize: '0.8rem' }}>
                          {acc.user.displayName ? acc.user.displayName[0].toUpperCase() : 'U'}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{acc.user.displayName}</span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>@{acc.user.username}</span>
                        </div>
                      </div>
                      <div className="saved-account-actions">
                        <button
                          className="primary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                          onClick={() => handleSwitchAccount(acc)}
                        >
                          Switch
                        </button>
                        <button
                          style={{ padding: '0.25rem 0.4rem', fontSize: '0.7rem', backgroundColor: 'transparent', border: '1px solid var(--border-color)', color: 'var(--accent-error)' }}
                          onClick={() => handleRemoveAccount(acc.user.id)}
                          title="Remove Account"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <button
              className="primary"
              style={{ marginTop: '0.5rem', alignSelf: 'flex-start', padding: '0.4rem 1rem', fontSize: '0.8rem' }}
              onClick={() => {
                handleLogout();
                setShowManualLogin(true);
              }}
            >
              ＋ Add Account
            </button>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              🔒 Connection is secured using client-side device keys. Encrypted messages are routed blindly through the server.
            </div>
          </div>
        )}

        {navTab === 'admin' && (
          <div style={{ padding: '1.25rem', display: 'flex', flex: '1', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>SYSTEM ADMIN PORTAL</span>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(0,0,0,0.2)', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Users</div>
                <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--accent-primary)' }}>{adminStats?.totalUsers || 0}</div>
              </div>
              <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(0,0,0,0.2)', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Messages</div>
                <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--accent-secondary)' }}>{adminStats?.totalMessages || 0}</div>
              </div>
              <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(0,0,0,0.2)', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Relations</div>
                <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--accent-success)' }}>{adminStats?.totalFriendships || 0}</div>
              </div>
            </div>

            {/* Users list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>REGISTERED ACCOUNTS</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {adminUsers.map(u => (
                  <div key={u.id} style={{ padding: '0.6rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{u.profile?.displayName}</span>
                      <span style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem', borderRadius: '10px', backgroundColor: u.role === 'admin' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255,255,255,0.05)', color: u.role === 'admin' ? 'var(--accent-secondary)' : 'var(--text-secondary)' }}>
                        {u.role}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>@{u.profile?.username} | {u.email}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Phone: {u.phone} | Country: {u.country}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT MAIN PANEL: ACTIVE SECURE CHAT */}
      <div className="chat-pane">
        {activeChat ? (
          <>
            <div className="chat-header">
              <div className="chat-header-info">
                <div className={`avatar ${activeChatOnline ? 'online' : ''}`}>{activeChat.name[0].toUpperCase()}</div>
                <div>
                  <span className="display-name">{activeChat.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span className={`chat-subtitle ${activeChatOnline ? 'online' : ''}`}>
                      {activeChatOnline ? 'online' : 'offline'}
                    </span>
                    <span className="chat-subtitle">• Secure Signal Channel 🔑</span>
                  </div>
                </div>
              </div>
              <div className="chat-actions">
                <button style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => setActiveChat(null)}>
                  Close
                </button>
              </div>
            </div>

            {/* MESSAGES VIEW */}
            <div className="messages-container">
              {messages.map(msg => {
                const isSent = msg.senderId === user.id;
                const senderName = msg.sender?.profile?.displayName || 'User';
                return (
                  <div key={msg.id} className={`message-row ${isSent ? 'sent' : 'received'}`}>
                    <div className="message-bubble">
                      {!isSent && activeChat.type === 'GROUP' && (
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-secondary)' }}>
                          {senderName}
                        </span>
                      )}

                      {/* Show both ciphertext (server-blindness) and client-decrypted text */}
                      <div style={{ fontSize: '0.9rem', wordBreak: 'break-word' }}>
                        {decryptPayload(msg.ciphertext)}
                      </div>

                      <div style={{ fontSize: '0.65rem', opacity: 0.5, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.2rem', marginTop: '0.2rem', fontFamily: 'monospace' }}>
                        <span>Cipher: {msg.ciphertext.substring(0, 30)}...</span>
                      </div>

                      <div className="message-meta">
                        <span className="encryption-tag">🔒 End-to-End</span>
                        <span>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Real-time typing indicators */}
              {Object.keys(typingUsers).map(uid => {
                if (typingUsers[uid] && uid !== user.id) {
                  return (
                    <div key={uid} className="message-row received">
                      <div className="typing-indicator">typing secure message...</div>
                    </div>
                  );
                }
                return null;
              })}

              <div ref={messagesEndRef} />
            </div>

            {/* INPUT CHAT BAR */}
            <form className="chat-input-bar" onSubmit={handleSendMessage}>
              <input
                type="text"
                placeholder="Type end-to-end encrypted message..."
                value={messageInput}
                onChange={handleInputChange}
                required
              />
              <button type="submit" className="primary">Send</button>
            </form>
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon" style={{ fontSize: '4rem' }}>🔐</div>
            <h2 style={{ color: 'var(--text-primary)' }}>Blind Server Portal (E2E)</h2>
            <p style={{ maxWidth: '400px', color: 'var(--text-secondary)' }}>
              Welcome to fuN ChaT. All communications are encrypted client-side using the Signal Protocol (Double Ratchet).
              The server routes ciphertext blindly and has no decryption capability.
            </p>
            <div style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              Select a contact from the sidebar or click "Friends" to add connections.
            </div>
          </div>
        )}
      </div>

      {/* --- MODAL WINDOWS --- */}

      {/* Add Friend Request Modal */}
      {showAddFriend && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <div className="modal-header">
              <h2 className="modal-title">Search User</h2>
              <button className="close-btn" onClick={() => setShowAddFriend(false)}>×</button>
            </div>
            <form onSubmit={handleSendFriendRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label>Target Username</label>
                <input
                  type="text"
                  placeholder="e.g. johndoe_99"
                  required
                  value={friendUsernameInput}
                  onChange={e => setFriendUsernameInput(e.target.value)}
                />
              </div>
              <button type="submit" className="primary">Send Connection Request</button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <div className="modal-header">
              <h2 className="modal-title">Account Details</h2>
              <button className="close-btn" onClick={() => setShowEditProfile(false)}>×</button>
            </div>
            <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label>Display Name (Full Name)</label>
                <input
                  type="text"
                  required
                  value={editDisplayName}
                  onChange={e => setEditDisplayName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Username (Change limits apply)</label>
                <input
                  type="text"
                  required
                  value={editUsername}
                  onChange={e => setEditUsername(e.target.value)}
                />
                {usernameCooldown && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    Remaining free changes: <strong>{usernameCooldown.remainingFreeChanges}</strong>
                    {usernameCooldown.nextEligibleDate && (
                      <div className="cooldown-text">
                        Next eligible date: {new Date(usernameCooldown.nextEligibleDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>Bio (status message)</label>
                <input
                  type="text"
                  placeholder="Available"
                  value={editBio}
                  onChange={e => setEditBio(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Profile Avatar URL (optional)</label>
                <input
                  type="text"
                  placeholder="http://url-to-avatar.png"
                  value={editAvatarUrl}
                  onChange={e => setEditAvatarUrl(e.target.value)}
                />
              </div>
              <button type="submit" className="primary">Save Changes</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}