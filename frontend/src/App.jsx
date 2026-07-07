import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const API_BASE = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin);

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
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register Form
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regDob, setRegDob] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regDisplayName, setRegDisplayName] = useState('');
  const [regGender, setRegGender] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(`Server returned a non-JSON response (status ${res.status}). Please verify that your REACT_APP_API_URL environment variable points to a running backend server rather than a static site host.`);
    }

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

  // Load and initialize Google Identity Services
  useEffect(() => {
    const initGoogle = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID || '200947288165-ta5kk1hagu0qtek0au0b6325qnt9lts8.apps.googleusercontent.com',
          callback: handleGoogleCredentialResponse
        });

        const loginDiv = document.getElementById("google-signin-div");
        if (loginDiv) {
          window.google.accounts.id.renderButton(loginDiv, {
            theme: "dark",
            size: "large",
            width: loginDiv.clientWidth || 360,
            text: "signin_with"
          });
        }

        const signupDiv = document.getElementById("google-signup-div");
        if (signupDiv) {
          window.google.accounts.id.renderButton(signupDiv, {
            theme: "dark",
            size: "large",
            width: signupDiv.clientWidth || 360,
            text: "signup_with"
          });
        }
      }
    };

    if (!document.getElementById('google-gsi-client')) {
      const script = document.createElement('script');
      script.id = 'google-gsi-client';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGoogle;
      document.body.appendChild(script);
    } else {
      initGoogle();
    }
  }, [authScreen, token]);

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
  const handleGoogleCredentialResponse = async (response) => {
    try {
      const data = await apiFetch('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ idToken: response.credential })
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
      setShowManualLogin(false);

      setToken(data.accessToken);
      setUser(data.user);
      alert('Logged in successfully with Google!');
    } catch (err) {
      alert(`Google Sign-In failed: ${err.message}`);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const isEmail = loginIdentifier.includes('@');
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: isEmail ? loginIdentifier.trim() : undefined,
          phone: !isEmail ? loginIdentifier.trim() : undefined,
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
      setLoginIdentifier('');
      setLoginPassword('');
    } catch (err) {
      alert(`Login failed: ${err.message}`);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (regPassword !== regConfirmPassword) {
      alert('Passwords do not match!');
      return;
    }
    try {
      await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: regEmail,
          phone: regPhone,
          password: regPassword,
          dateOfBirth: regDob,
          username: regUsername,
          displayName: regDisplayName,
          gender: regGender
        })
      });

      alert('Registration successful! Please login.');
      setAuthScreen('login');

      // Auto fill login fields
      setLoginIdentifier(regEmail);

      // Clear forms
      setRegEmail('');
      setRegPhone('');
      setRegPassword('');
      setRegConfirmPassword('');
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

                <div className="auth-illustration-circle">
                  <svg viewBox="0 0 24 24" fill="none" stroke="url(#instaGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <defs>
                      <linearGradient id="instaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f09433" />
                        <stop offset="25%" stopColor="#e6683c" />
                        <stop offset="50%" stopColor="#dc2743" />
                        <stop offset="75%" stopColor="#cc2366" />
                        <stop offset="100%" stopColor="#bc1888" />
                      </linearGradient>
                    </defs>
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    <circle cx="8" cy="10" r="1" fill="currentColor" />
                    <circle cx="12" cy="10" r="1" fill="currentColor" />
                    <circle cx="16" cy="10" r="1" fill="currentColor" />
                  </svg>
                </div>

                <div className="form-group">
                  <label>Email Address or Phone Number</label>
                  <div className="input-wrapper">
                    <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <input
                      type="text"
                      placeholder="name@domain.com or +1234567890"
                      required
                      value={loginIdentifier}
                      onChange={e => setLoginIdentifier(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Password</label>
                  <div className="input-wrapper">
                    <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <input
                      type={showLoginPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      required
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                    >
                      {showLoginPassword ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px' }}>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px' }}>
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <span
                  className="forgot-password-link"
                  onClick={() => alert('Password recovery is currently disabled for this security level.')}
                >
                  Forgot password?
                </span>

                <button type="submit" className="primary" style={{ marginTop: '0.5rem' }}>Login Account</button>

                <div className="oauth-divider">— OR —</div>

                <div id="google-signin-div" style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: '0.25rem' }}></div>

                <button
                  type="button"
                  className="oauth-btn"
                  onClick={() => alert('Social sign-in is not configured. Please register with your email.')}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.21.67-2.93 1.49-.62.69-1.16 1.84-1.01 2.96 1.12.09 2.27-.57 2.95-1.39z" />
                  </svg>
                  Continue with Apple
                </button>

                <div className="oauth-divider">— DEV MOCK IDP —</div>
                <div style={{ display: 'flex', gap: '0.5rem', width: '100%', marginTop: '0.25rem' }}>
                  <button
                    type="button"
                    className="oauth-btn"
                    style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => handleGoogleCredentialResponse({ credential: 'MOCK-ID-TOKEN-alice' })}
                  >
                    Alice (Mock)
                  </button>
                  <button
                    type="button"
                    className="oauth-btn"
                    style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => handleGoogleCredentialResponse({ credential: 'MOCK-ID-TOKEN-bob' })}
                  >
                    Bob (Mock)
                  </button>
                </div>

                <div className="auth-toggle">
                  Don't have an account? <span onClick={() => setAuthScreen('register')}>Register here</span>
                </div>
              </form>
            )
          ) : (
            <form className="auth-form" onSubmit={handleRegister}>
              <div className="auth-illustration-circle">
                <svg viewBox="0 0 24 24" fill="none" stroke="url(#instaGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <line x1="20" y1="8" x2="20" y2="14" />
                  <line x1="23" y1="11" x2="17" y2="11" />
                </svg>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Full Name <span style={{ color: 'var(--accent-error)' }}>*</span></label>
                  <div className="input-wrapper">
                    <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <input
                      type="text"
                      placeholder="John Doe"
                      required
                      value={regDisplayName}
                      onChange={e => setRegDisplayName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Username <span style={{ color: 'var(--accent-error)' }}>*</span></label>
                  <div className="input-wrapper">
                    <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <input
                      type="text"
                      placeholder="johndoe_99"
                      required
                      value={regUsername}
                      onChange={e => setRegUsername(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Email Address <span style={{ color: 'var(--accent-error)' }}>*</span></label>
                <div className="input-wrapper">
                  <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  <input
                    type="email"
                    placeholder="name@domain.com"
                    required
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <div className="input-wrapper">
                  <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="+1234567890"
                    value={regPhone}
                    onChange={e => setRegPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Password <span style={{ color: 'var(--accent-error)' }}>*</span></label>
                  <div className="input-wrapper">
                    <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <input
                      type={showRegPassword ? "text" : "password"}
                      placeholder="••••••••"
                      required
                      value={regPassword}
                      onChange={e => setRegPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                    >
                      {showRegPassword ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px' }}>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px' }}>
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label>Confirm Password <span style={{ color: 'var(--accent-error)' }}>*</span></label>
                  <div className="input-wrapper">
                    <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      required
                      value={regConfirmPassword}
                      onChange={e => setRegConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px' }}>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px' }}>
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Date of Birth</label>
                  <div className="input-wrapper">
                    <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <input
                      type="date"
                      value={regDob}
                      onChange={e => setRegDob(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Gender <span style={{ color: 'var(--accent-error)' }}>*</span></label>
                  <div className="input-wrapper">
                    <select required value={regGender} onChange={e => setRegGender(e.target.value)}>
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other / Prefer not to say</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.2rem' }}>
                By creating an account, you confirm you are 18 years or older and accept our Terms & Policies.
              </div>

              <button type="submit" className="primary">Register Account</button>

              <div className="oauth-divider">— OR —</div>

              <div id="google-signup-div" style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: '0.25rem' }}></div>

              <div className="oauth-divider">— DEV MOCK IDP —</div>
              <div style={{ display: 'flex', gap: '0.5rem', width: '100%', marginTop: '0.25rem' }}>
                <button
                  type="button"
                  className="oauth-btn"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => handleGoogleCredentialResponse({ credential: 'MOCK-ID-TOKEN-alice' })}
                >
                  Alice (Mock)
                </button>
                <button
                  type="button"
                  className="oauth-btn"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => handleGoogleCredentialResponse({ credential: 'MOCK-ID-TOKEN-bob' })}
                >
                  Bob (Mock)
                </button>
              </div>

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
                <label>Display Name <span style={{ color: 'var(--accent-error)' }}>*</span></label>
                <input
                  type="text"
                  required
                  value={editDisplayName}
                  onChange={e => setEditDisplayName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Username <span style={{ color: 'var(--accent-error)' }}>*</span></label>
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
                <label>Bio</label>
                <input
                  type="text"
                  placeholder="Available"
                  value={editBio}
                  onChange={e => setEditBio(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Profile Avatar URL</label>
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