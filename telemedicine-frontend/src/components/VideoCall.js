import React, { useRef, useState, useEffect } from 'react';
import Peer from 'simple-peer';
import io from 'socket.io-client';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';

const socket = io.connect(process.env.REACT_APP_SOCKET_URL);

const VideoCall = ({ appointmentId }) => {
  const [stream, setStream] = useState(null);
  const [callActive, setCallActive] = useState(false);
  const [peers, setPeers] = useState([]);
  const [appointment, setAppointment] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('Not connected');
  
  const userVideo = useRef();
  const peersRef = useRef([]);
  const remoteVideoRef = useRef();
  const navigate = useNavigate();

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
          console.log("Requesting media access...");
          const mediaStream = await navigator.mediaDevices.getUserMedia({ 
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: "user"
            }, 
            audio: true 
          });
          
          console.log("Media access granted:", mediaStream.getTracks().map(t => t.kind));
          setStream(mediaStream);
          
          // Ensure the video element is properly set up
          if (userVideo.current) {
            userVideo.current.srcObject = mediaStream;
            userVideo.current.onloadedmetadata = () => {
              console.log("Video metadata loaded, playing...");
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
            
            console.log("Basic media access granted");
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
      if (stream) {
        stream.getTracks().forEach(track => {
          track.stop();
          console.log(`Stopped ${track.kind} track`);
        });
      }
    };
  }, [appointmentId, navigate]);

  // Force video element redraw when stream changes
  useEffect(() => {
    if (stream && userVideo.current) {
      console.log("Setting video source with stream");
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
    if (!stream || !appointmentId) return;

    // Socket event handlers
    const handleUserConnected = (userId) => {
      console.log('User connected to room:', userId);
      setConnectionStatus('User connected, establishing peer connection...');
      
      // Create a peer connection as the initiator
      const peer = createPeer(userId, socket.id, stream);
      
      peersRef.current.push({
        peerID: userId,
        peer,
      });

      setPeers(prevPeers => [...prevPeers, { id: userId, peer }]);
    };

    const handleUserDisconnected = (userId) => {
      console.log('User disconnected:', userId);
      setConnectionStatus('Other user disconnected');
      
      // Find and destroy the peer connection
      const peerObj = peersRef.current.find(p => p.peerID === userId);
      if (peerObj) {
        peerObj.peer.destroy();
      }

      // Remove the peer from the list
      peersRef.current = peersRef.current.filter(p => p.peerID !== userId);
      setPeers(prevPeers => prevPeers.filter(p => p.id !== userId));
      
      if (callActive) {
        setCallActive(false);
      }
    };

    const handleReceiveSignal = (payload) => {
      console.log('Received signal:', payload.id);
      
      // Check if we already have a peer connection with this user
      const item = peersRef.current.find(p => p.peerID === payload.id);
      
      if (item) {
        // If we have a connection, pass the signal to the peer
        item.peer.signal(payload.signal);
      } else {
        // If we don't have a connection yet, create one as the receiver
        setConnectionStatus('Receiving call connection...');
        const peer = addPeer(payload.signal, payload.id, stream);
        
        peersRef.current.push({
          peerID: payload.id,
          peer,
        });

        setPeers(prevPeers => [...prevPeers, { id: payload.id, peer }]);
      }
    };

    // Join the room with appointmentId
    console.log('Joining room:', appointmentId);
    socket.emit('join-room', appointmentId);

    // Set up event listeners
    socket.on('user-connected', handleUserConnected);
    socket.on('user-disconnected', handleUserDisconnected);
    socket.on('signal', handleReceiveSignal);

    // Clean up on unmount or when dependencies change
    return () => {
      socket.off('user-connected', handleUserConnected);
      socket.off('user-disconnected', handleUserDisconnected);
      socket.off('signal', handleReceiveSignal);
      socket.emit('leave-room', appointmentId);
    };
  }, [stream, appointmentId]);

  // Function to create a peer connection as the initiator
  const createPeer = (userToSignal, callerID, stream) => {
    console.log('Creating peer as initiator');
    setConnectionStatus('Creating connection as initiator...');
    
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
    });

    peer.on('signal', signal => {
      socket.emit('signal', { userID: userToSignal, callerID, signal });
    });

    peer.on('connect', () => {
      console.log('Peer connection established');
      setConnectionStatus('Connected');
      setCallActive(true);
    });

    peer.on('stream', remoteStream => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    });

    peer.on('error', err => {
      console.error('Peer error:', err);
      setConnectionStatus(`Error: ${err.message}`);
    });

    peer.on('close', () => {
      console.log('Peer connection closed');
      setConnectionStatus('Disconnected');
      setCallActive(false);
    });

    return peer;
  };

  // Function to create a peer connection as the receiver
  const addPeer = (incomingSignal, callerID, stream) => {
    console.log('Adding peer as receiver');
    setConnectionStatus('Accepting incoming connection...');
    
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream,
    });

    peer.on('signal', signal => {
      socket.emit('signal', { userID: callerID, callerID: socket.id, signal });
    });

    peer.on('connect', () => {
      console.log('Peer connection established');
      setConnectionStatus('Connected');
      setCallActive(true);
    });

    peer.on('stream', remoteStream => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    });

    peer.on('error', err => {
      console.error('Peer error:', err);
      setConnectionStatus(`Error: ${err.message}`);
    });

    peer.on('close', () => {
      console.log('Peer connection closed');
      setConnectionStatus('Disconnected');
      setCallActive(false);
    });

    // Signal the peer with the incoming signal data
    peer.signal(incomingSignal);

    return peer;
  };

  const startCall = () => {
    setCallActive(true);
    setConnectionStatus('Call active, waiting for other participant...');
    // The actual connection is handled by the peer connection
  };

  const endCall = () => {
    // Destroy all peer connections
    peersRef.current.forEach(({ peer }) => {
      if (peer) {
        peer.destroy();
      }
    });
    
    setPeers([]);
    peersRef.current = [];
    setCallActive(false);
    setConnectionStatus('Call ended');
  };

  const goBack = () => {
    // End call and navigate back
    endCall();
    navigate('/dashboard');
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

  // Debug function to print camera info
  const debugCameraInfo = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      console.log('Available video devices:', videoDevices);
      
      if (stream) {
        const videoTracks = stream.getVideoTracks();
        console.log('Active video tracks:', videoTracks.map(track => ({
          label: track.label,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          contentHint: track.contentHint
        })));
      } else {
        console.log('No active stream');
      }
      
      if (userVideo.current) {
        console.log('Video element ready state:', userVideo.current.readyState);
        console.log('Video dimensions:', {
          videoWidth: userVideo.current.videoWidth,
          videoHeight: userVideo.current.videoHeight,
          offsetWidth: userVideo.current.offsetWidth,
          offsetHeight: userVideo.current.offsetHeight
        });
      } else {
        console.log('Video ref not available');
      }
      
      setConnectionStatus('Camera debug info in console');
    } catch (err) {
      console.error('Failed to get camera info:', err);
    }
  };

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
        </div>
      </div>
    </div>
  );
};

export default VideoCall;