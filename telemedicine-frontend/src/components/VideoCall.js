import React, { useRef, useState, useEffect } from 'react';
import Peer from 'simple-peer';
import io from 'socket.io-client';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';

// Create the socket connection outside the component to prevent recreating it on renders
const socket = io.connect(process.env.REACT_APP_SOCKET_URL);

// Track active peers globally to handle cleanup more effectively
const activePeers = new Map();

const VideoCall = ({ appointmentId }) => {
  const [stream, setStream] = useState(null);
  const [callActive, setCallActive] = useState(false);
  const [peers, setPeers] = useState([]);
  const [appointment, setAppointment] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('Not connected');
  const [roomJoined, setRoomJoined] = useState(false);
  
  const userVideo = useRef();
  const peersRef = useRef([]);
  const remoteVideoRef = useRef();
  const navigate = useNavigate();

  // Enable detailed logging for debugging
  const enableDetailedLogging = true;

  // Debug logging function
  const logEvent = (event, data) => {
    if (!enableDetailedLogging) return;
    console.log(`[${new Date().toISOString()}] ${event}`, data);
  };

  // Safe signal function that checks if peer is still valid before signaling
  const safeSignal = (peer, signal) => {
    try {
      if (peer && !peer._destroyed) {
        peer.signal(signal);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error in safeSignal:', err);
      return false;
    }
  };

  // Safe cleanup function for a peer
  const safeDestroyPeer = (peerId) => {
    try {
      // Find the peer in our refs
      const peerObj = peersRef.current.find(p => p.peerID === peerId);
      if (peerObj && peerObj.peer) {
        // Mark as destroyed before actually destroying
        peerObj.peer._destroyed = true;
        
        // Remove from global tracking
        activePeers.delete(peerId);
        
        // Remove tracks and destroy
        if (peerObj.peer.destroy) {
          peerObj.peer.destroy();
        }
      }
      
      // Update refs
      peersRef.current = peersRef.current.filter(p => p.peerID !== peerId);
      
      // Update state
      setPeers(prevPeers => prevPeers.filter(p => p.id !== peerId));
      
      logEvent('Peer safely destroyed', peerId);
      return true;
    } catch (err) {
      console.error('Error destroying peer:', err);
      return false;
    }
  };

  // Get appointment details and set up user information
  useEffect(() => {
    const setupCall = async () => {
      try {
        if (!appointmentId) {
          setError('No appointment ID provided');
          setLoading(false);
          return;
        }

        // Get current user ID
        const userId = localStorage.getItem('userId');
        if (!userId) {
          navigate('/');
          return;
        }

        // Get appointment details
        const response = await api.get(`/api/appointments/detail/${appointmentId}`);
        setAppointment(response.data);

        // Determine if user is doctor or patient and set other user
        const isDoctor = response.data.doctor._id === userId;
        setOtherUser(isDoctor ? response.data.patient : response.data.doctor);

        // Initialize media stream with specific constraints for better compatibility
        try {
          logEvent("Requesting media access", null);
          const mediaStream = await navigator.mediaDevices.getUserMedia({ 
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: "user"
            }, 
            audio: true 
          });
          
          logEvent("Media access granted", mediaStream.getTracks().map(t => t.kind));
          setStream(mediaStream);
          
          // Ensure the video element is properly set up
          if (userVideo.current) {
            userVideo.current.srcObject = mediaStream;
            userVideo.current.onloadedmetadata = () => {
              logEvent("Video metadata loaded, playing...");
              userVideo.current.play().catch(e => console.error("Error playing video:", e));
            };
          } else {
            console.warn("Video ref not available");
          }
        } catch (mediaError) {
          console.error("Media access error:", mediaError);
          // Try again with more basic constraints
          try {
            const basicStream = await navigator.mediaDevices.getUserMedia({ 
              video: true, 
              audio: true 
            });
            
            logEvent("Basic media access granted", null);
            setStream(basicStream);
            
            if (userVideo.current) {
              userVideo.current.srcObject = basicStream;
              userVideo.current.onloadedmetadata = () => userVideo.current.play()
                .catch(e => console.error("Error playing video:", e));
            }
          } catch (basicError) {
            throw new Error(`Cannot access camera/microphone: ${basicError.message}`);
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error setting up call:', err);
        setError(`Failed to set up call: ${err.message}`);
        setLoading(false);
      }
    };

    setupCall();

    // Clean up on component unmount
    return () => {
      // Clean up all peers first
      peersRef.current.forEach(({ peerID }) => {
        safeDestroyPeer(peerID);
      });
      
      // Then stop all tracks
      if (stream) {
        stream.getTracks().forEach(track => {
          track.stop();
          logEvent(`Stopped ${track.kind} track`, null);
        });
      }
      
      // Leave room if we've joined one
      if (roomJoined && appointmentId) {
        socket.emit('leave-room', appointmentId);
        setRoomJoined(false);
      }
    };
  }, [appointmentId, navigate]);

  // Force video element redraw when stream changes
  useEffect(() => {
    if (stream && userVideo.current) {
      logEvent("Setting video source with stream", null);
      userVideo.current.srcObject = stream;
      
      // Force video to play
      const playPromise = userVideo.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error("Error playing local video:", error);
          // Add auto-play fallback - try again with user interaction
          setTimeout(() => {
            if (userVideo.current) {
              userVideo.current.play().catch(e => console.error("Retry play failed:", e));
            }
          }, 1000);
        });
      }
    }
  }, [stream]);

  // Handle socket connection for video call
  useEffect(() => {
    let mounted = true;
    if (!stream || !appointmentId) return;
    
    try {
      // Socket event handlers
      const handleExistingUsers = (userIds) => {
        if (!mounted) return;
        
        logEvent('Existing users in room', userIds);
        setConnectionStatus('Other users present in room, creating connections...');
        
        // Remove any existing peers before creating new ones
        peersRef.current.forEach(({ peerID }) => {
          safeDestroyPeer(peerID);
        });
        
        peersRef.current = [];
        setPeers([]);
        
        // Create new peers for each existing user
        const newPeers = [];
        userIds.forEach(userId => {
          try {
            // Create a peer connection for each existing user
            const peer = createPeer(userId, socket.id, stream);
            
            if (peer) {
              peersRef.current.push({
                peerID: userId,
                peer,
              });
              
              newPeers.push({ id: userId, peer });
            }
          } catch (err) {
            console.error(`Error creating peer for user ${userId}:`, err);
          }
        });
        
        if (newPeers.length > 0) {
          setPeers(prev => [...prev, ...newPeers]);
        }
        
        // Signal that we're ready to connect
        if (mounted) {
          socket.emit('ready-to-connect', appointmentId);
        }
      };

      const handleUserConnected = (userId) => {
        if (!mounted) return;
        
        logEvent('User connected to room', userId);
        setConnectionStatus('User connected, waiting for peer ready signal...');
        // We don't immediately create a connection - wait for ready-to-connect signal
      };
      
      const handlePeerReady = (userId) => {
        if (!mounted) return;
        
        logEvent('Peer is ready to connect', userId);
        
        // Check if we already have a peer for this user
        const existingPeer = peersRef.current.find(p => p.peerID === userId);
        if (existingPeer) {
          logEvent('Already have a peer for this user, skipping', userId);
          return;
        }
        
        try {
          // Now create a peer connection as the initiator
          const peer = createPeer(userId, socket.id, stream);
          
          if (peer) {
            peersRef.current.push({
              peerID: userId,
              peer,
            });

            setPeers(prevPeers => [...prevPeers, { id: userId, peer }]);
          }
        } catch (err) {
          console.error(`Error creating peer for ready user ${userId}:`, err);
        }
      };

      const handleUserDisconnected = (userId) => {
        if (!mounted) return;
        
        logEvent('User disconnected', userId);
        setConnectionStatus('Other user disconnected');
        
        safeDestroyPeer(userId);
        
        if (callActive && peersRef.current.length === 0) {
          setCallActive(false);
        }
      };

      const handleReceiveSignal = (payload) => {
        if (!mounted) return;
        
        try {
          logEvent('Received signal', { from: payload.id, type: payload.signal?.type });
          
          // Check if we already have a peer connection with this user
          const item = peersRef.current.find(p => p.peerID === payload.id);
          
          if (item && item.peer) {
            // If we have a connection, pass the signal to the peer if it's not destroyed
            if (!item.peer._destroyed) {
              logEvent('Passing signal to existing peer', payload.id);
              safeSignal(item.peer, payload.signal);
            } else {
              logEvent('Existing peer was already destroyed, recreating', payload.id);
              // Remove the destroyed peer first
              safeDestroyPeer(payload.id);
              
              // Create a new peer
              try {
                const newPeer = addPeer(payload.signal, payload.id, stream);
                if (newPeer) {
                  peersRef.current.push({
                    peerID: payload.id,
                    peer: newPeer,
                  });
                  
                  setPeers(prevPeers => [...prevPeers.filter(p => p.id !== payload.id), 
                    { id: payload.id, peer: newPeer }]);
                }
              } catch (err) {
                console.error(`Error recreating peer for ${payload.id}:`, err);
              }
            }
          } else {
            // If we don't have a connection yet, create one as the receiver
            logEvent('Creating new peer as receiver', payload.id);
            setConnectionStatus('Receiving call connection...');
            
            try {
              const peer = addPeer(payload.signal, payload.id, stream);
              
              if (peer) {
                peersRef.current.push({
                  peerID: payload.id,
                  peer,
                });

                setPeers(prevPeers => [...prevPeers, { id: payload.id, peer }]);
              }
            } catch (err) {
              console.error(`Error creating receiver peer for ${payload.id}:`, err);
            }
          }
        } catch (err) {
          console.error('Error handling signal:', err);
        }
      };

      // Join the room with appointmentId
      logEvent('Joining room', appointmentId);
      socket.emit('join-room', appointmentId);
      setRoomJoined(true);

      // Set up event listeners
      socket.on('existing-users', handleExistingUsers);
      socket.on('user-connected', handleUserConnected);
      socket.on('peer-ready', handlePeerReady);
      socket.on('user-disconnected', handleUserDisconnected);
      socket.on('signal', handleReceiveSignal);

      // Signal that we're ready to connect after a short delay
      // This ensures the join-room event is processed first
      const readyTimeout = setTimeout(() => {
        if (mounted) {
          socket.emit('ready-to-connect', appointmentId);
        }
      }, 1000);

      // Clean up on unmount or when dependencies change
      return () => {
        mounted = false;
        clearTimeout(readyTimeout);
        
        socket.off('existing-users', handleExistingUsers);
        socket.off('user-connected', handleUserConnected);
        socket.off('peer-ready', handlePeerReady);
        socket.off('user-disconnected', handleUserDisconnected);
        socket.off('signal', handleReceiveSignal);
        
        // Clean up all peer connections
        [...peersRef.current].forEach(({ peerID }) => {
          safeDestroyPeer(peerID);
        });
        
        // Leave the room
        if (roomJoined) {
          socket.emit('leave-room', appointmentId);
          setRoomJoined(false);
        }
      };
    } catch (err) {
      console.error('Error setting up socket connection:', err);
      setError(`WebRTC setup error: ${err.message}`);
      return () => {
        mounted = false;
      };
    }
  }, [stream, appointmentId]);

  // Function to create a peer connection as the initiator
  const createPeer = (userToSignal, callerID, stream) => {
    try {
      logEvent('Creating peer as initiator', { userToSignal, callerID });
      setConnectionStatus('Creating connection as initiator...');
      
      // Check if this peer already exists
      if (activePeers.has(userToSignal)) {
        logEvent('Peer already exists, destroying first', userToSignal);
        const existingPeer = activePeers.get(userToSignal);
        if (existingPeer && existingPeer.destroy) {
          existingPeer._destroyed = true;
          existingPeer.destroy();
        }
        activePeers.delete(userToSignal);
      }
      
      const peer = new Peer({
        initiator: true,
        trickle: false,
        stream,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ]
        }
      });
      
      // Mark as not destroyed
      peer._destroyed = false;
      
      // Add to global tracking
      activePeers.set(userToSignal, peer);

      peer.on('signal', signal => {
        // Only emit signal if peer is still active
        if (!peer._destroyed) {
          logEvent('Initiator signaling', { userToSignal, type: signal.type });
          socket.emit('signal', { userID: userToSignal, callerID, signal });
        }
      });

      peer.on('connect', () => {
        logEvent('Peer connection established as initiator', userToSignal);
        setConnectionStatus('Connected');
        setCallActive(true);
      });

      peer.on('stream', remoteStream => {
        logEvent('Received remote stream as initiator', userToSignal);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          
          // Make sure the video plays
          remoteVideoRef.current.play().catch(err => {
            logEvent('Error playing remote video, retrying...', err.message);
            setTimeout(() => {
              if (remoteVideoRef.current) {
                remoteVideoRef.current.play().catch(e => {});
              }
            }, 1000);
          });
        }
      });

      peer.on('error', err => {
        console.error('Peer error as initiator:', err);
        logEvent('Peer error as initiator', err.message);
        
        // Don't set error status if peer was destroyed intentionally
        if (!peer._destroyed) {
          setConnectionStatus(`Error: ${err.message}`);
        }
      });

      peer.on('close', () => {
        logEvent('Peer connection closed as initiator', userToSignal);
        peer._destroyed = true;
        activePeers.delete(userToSignal);
        
        // Only update UI if this wasn't a forced destroy
        if (!peer._explicitlyDestroyed) {
          setConnectionStatus('Disconnected');
          
          // Check if we have any active peers left
          if (peersRef.current.filter(p => !p.peer._destroyed).length === 0) {
            setCallActive(false);
          }
        }
      });

      return peer;
    } catch (err) {
      console.error('Error creating peer:', err);
      return null;
    }
  };

  // Function to create a peer connection as the receiver
  const addPeer = (incomingSignal, callerID, stream) => {
    try {
      logEvent('Adding peer as receiver', { callerID });
      setConnectionStatus('Accepting incoming connection...');
      
      // Check if this peer already exists
      if (activePeers.has(callerID)) {
        logEvent('Receiver peer already exists, destroying first', callerID);
        const existingPeer = activePeers.get(callerID);
        if (existingPeer && existingPeer.destroy) {
          existingPeer._destroyed = true;
          existingPeer.destroy();
        }
        activePeers.delete(callerID);
      }
      
      const peer = new Peer({
        initiator: false,
        trickle: false,
        stream,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ]
        }
      });
      
      // Mark as not destroyed
      peer._destroyed = false;
      
      // Add to global tracking
      activePeers.set(callerID, peer);

      peer.on('signal', signal => {
        // Only emit signal if peer is still active
        if (!peer._destroyed) {
          logEvent('Receiver signaling', { callerID, type: signal.type });
          socket.emit('signal', { userID: callerID, callerID: socket.id, signal });
        }
      });

      peer.on('connect', () => {
        logEvent('Peer connection established as receiver', callerID);
        setConnectionStatus('Connected');
        setCallActive(true);
      });

      peer.on('stream', remoteStream => {
        logEvent('Received remote stream as receiver', callerID);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          
          // Make sure the video plays
          remoteVideoRef.current.play().catch(err => {
            logEvent('Error playing remote video, retrying...', err.message);
            setTimeout(() => {
              if (remoteVideoRef.current) {
                remoteVideoRef.current.play().catch(e => {});
              }
            }, 1000);
          });
        }
      });

      peer.on('error', err => {
        console.error('Peer error as receiver:', err);
        logEvent('Peer error as receiver', err.message);
        
        // Don't set error status if peer was destroyed intentionally
        if (!peer._destroyed) {
          setConnectionStatus(`Error: ${err.message}`);
        }
      });

      peer.on('close', () => {
        logEvent('Peer connection closed as receiver', callerID);
        peer._destroyed = true;
        activePeers.delete(callerID);
        
        // Only update UI if this wasn't a forced destroy
        if (!peer._explicitlyDestroyed) {
          setConnectionStatus('Disconnected');
          
          // Check if we have any active peers left
          if (peersRef.current.filter(p => !p.peer._destroyed).length === 0) {
            setCallActive(false);
          }
        }
      });

      // Signal the peer with the incoming signal data if not destroyed
      if (!peer._destroyed) {
        try {
          logEvent('Receiving initial signal as receiver', { type: incomingSignal.type });
          peer.signal(incomingSignal);
        } catch (err) {
          console.error('Error signaling to peer:', err);
          peer._destroyed = true;
          return null;
        }
      }

      return peer;
    } catch (err) {
      console.error('Error creating receiver peer:', err);
      return null;
    }
  };

  const startCall = () => {
    setCallActive(true);
    setConnectionStatus('Call active, waiting for other participant...');
    
    // Re-emit ready-to-connect to make sure peers are established
    socket.emit('ready-to-connect', appointmentId);
  };

  const endCall = () => {
    // Save peers to a local variable to avoid issues during iteration
    const peersToDestroy = [...peersRef.current];
    
    // Clear peers state first
    setPeers([]);
    peersRef.current = [];
    
    // Then destroy each peer
    peersToDestroy.forEach(({ peerID }) => {
      safeDestroyPeer(peerID);
    });
    
    setCallActive(false);
    setConnectionStatus('Call ended');
    
    // Clear remote video
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  };

  const goBack = () => {
    // End call and navigate back
    endCall();
    navigate('/dashboard');
  };

  // Debug function to print camera info
  const debugCameraInfo = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      logEvent('Available video devices', videoDevices);
      
      if (stream) {
        const videoTracks = stream.getVideoTracks();
        logEvent('Active video tracks', videoTracks.map(track => ({
          label: track.label,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          contentHint: track.contentHint
        })));
      } else {
        logEvent('No active stream', null);
      }
      
      if (userVideo.current) {
        logEvent('Video element ready state', userVideo.current.readyState);
        logEvent('Video dimensions', {
          videoWidth: userVideo.current.videoWidth,
          videoHeight: userVideo.current.videoHeight,
          offsetWidth: userVideo.current.offsetWidth,
          offsetHeight: userVideo.current.offsetHeight
        });
      } else {
        logEvent('Video ref not available', null);
      }
      
      // Log active peers
      logEvent('Active peers', {
        peersRefCount: peersRef.current.length,
        peersStateCount: peers.length,
        activePeersMapSize: activePeers.size
      });
      
      setConnectionStatus('Camera debug info in console');
    } catch (err) {
      console.error('Failed to get camera info:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4">Setting up video call...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center bg-white p-8 rounded-lg shadow-md max-w-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={goBack}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Video Consultation</h2>
            {otherUser && <p className="text-sm">With {otherUser.name}</p>}
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-sm bg-blue-700 px-3 py-1 rounded">
              {connectionStatus}
            </div>
            <button 
              onClick={debugCameraInfo} 
              className="text-xs bg-blue-800 hover:bg-blue-900 px-2 py-1 rounded"
              title="Print camera debug info to console"
            >
              Debug
            </button>
          </div>
        </div>
        
        {/* Video container */}
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Local video */}
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              <video
                ref={userVideo}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover mirror-mode"
                style={{ transform: 'scaleX(-1)' }} // Mirror effect
              />
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                You
              </div>
              
              {/* Overlay if video isn't showing */}
              {stream && (
                <div 
                  className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-xs cursor-pointer"
                  onClick={() => {
                    // Force video redraw
                    if (userVideo.current && stream) {
                      userVideo.current.srcObject = null;
                      setTimeout(() => {
                        if (userVideo.current) {
                          userVideo.current.srcObject = stream;
                          userVideo.current.play().catch(e => console.error("Error replaying video:", e));
                        }
                      }, 100);
                    }
                  }}
                >
                  Click if video not visible
                </div>
              )}
              
              {!stream && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 text-white text-center">
                  <div>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p>Camera access required</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Remote video */}
            <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                {otherUser ? otherUser.name : 'Remote User'}
              </div>
              
              {!peers.length && (
                <div className="absolute inset-0 flex items-center justify-center text-white text-center">
                  <div>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                    </svg>
                    <p>Waiting for the other participant to join...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Connection status display */}
          <div className="mt-3 text-center text-sm">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100">
              <span className={`h-2 w-2 rounded-full mr-2 ${
                peers.length > 0 ? 'bg-green-500' : 'bg-gray-400'
              }`}></span>
              {peers.length > 0 ? 'Connected' : 'Waiting for connection...'}
            </span>
          </div>
          
          {/* Control buttons */}
          <div className="mt-6 flex justify-center space-x-4">
            {!callActive ? (
              <button
                onClick={startCall}
                className="px-6 py-3 bg-green-500 text-white rounded-full hover:bg-green-600 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                Start Call
              </button>
            ) : (
              <button
                onClick={endCall}
                className="px-6 py-3 bg-red-500 text-white rounded-full hover:bg-red-600 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                End Call
              </button>
            )}
            
            <button
              onClick={goBack}
              className="px-6 py-3 bg-gray-500 text-white rounded-full hover:bg-gray-600 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Back to Dashboard
            </button>
          </div>
          
          {/* Debug information */}
          <div className="mt-4 text-xs text-gray-500 text-center">
            <p>Peers: {peers.length} | Connect Status: {connectionStatus}</p>
            <p>If you're having trouble connecting, try refreshing the page or check your camera permissions.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoCall;