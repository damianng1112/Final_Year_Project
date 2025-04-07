import React, { useState, useEffect } from 'react';

const WebRTCDiagnostic = () => {
  const [diagnosticResults, setDiagnosticResults] = useState({
    browserSupport: null,
    mediaDevices: null,
    iceServers: null,
    socketConnection: null,
    networkConnectivity: null
  });
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState([]);

  const addToLog = (message, type = 'info') => {
    setLog(prev => [...prev, { message, type, timestamp: new Date() }]);
  };

  const runDiagnostics = async () => {
    setRunning(true);
    setDiagnosticResults({
      browserSupport: null,
      mediaDevices: null,
      iceServers: null,
      socketConnection: null,
      networkConnectivity: null
    });
    setLog([]);

    addToLog('Starting WebRTC diagnostics...', 'info');
    
    // Check browser support
    try {
      const rtcSupport = !!window.RTCPeerConnection;
      const mediaSupport = !!navigator.mediaDevices?.getUserMedia;
      
      if (rtcSupport && mediaSupport) {
        setDiagnosticResults(prev => ({ ...prev, browserSupport: true }));
        addToLog('Browser supports WebRTC ✅', 'success');
      } else {
        setDiagnosticResults(prev => ({ ...prev, browserSupport: false }));
        addToLog(`Browser WebRTC support issues: ${rtcSupport ? '' : 'No RTCPeerConnection'} ${mediaSupport ? '' : 'No mediaDevices'}`, 'error');
      }
    } catch (err) {
      setDiagnosticResults(prev => ({ ...prev, browserSupport: false }));
      addToLog(`Error checking browser support: ${err.message}`, 'error');
    }

    // Check available media devices
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      const audioDevices = devices.filter(device => device.kind === 'audioinput');
      
      if (videoDevices.length > 0 && audioDevices.length > 0) {
        setDiagnosticResults(prev => ({ ...prev, mediaDevices: true }));
        addToLog(`Found ${videoDevices.length} video and ${audioDevices.length} audio devices ✅`, 'success');
        
        // Log device details
        videoDevices.forEach((device, i) => {
          addToLog(`Video Device ${i+1}: ${device.label || 'Unnamed device'}`, 'info');
        });
        
        audioDevices.forEach((device, i) => {
          addToLog(`Audio Device ${i+1}: ${device.label || 'Unnamed device'}`, 'info');
        });
      } else {
        setDiagnosticResults(prev => ({ ...prev, mediaDevices: false }));
        addToLog(`Media device issues: Video: ${videoDevices.length}, Audio: ${audioDevices.length}`, 'error');
      }
    } catch (err) {
      setDiagnosticResults(prev => ({ ...prev, mediaDevices: false }));
      addToLog(`Error checking media devices: ${err.message}`, 'error');
    }

    // Check ICE servers connectivity
    try {
      addToLog('Testing STUN server connectivity...', 'info');
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      });
      
      let iceSuccess = false;
      let iceTimeout = false;
      
      pc.addEventListener('icegatheringstatechange', () => {
        if (pc.iceGatheringState === 'complete' && !iceTimeout) {
          const candidates = pc.localDescription.sdp.match(/a=candidate:.*/g) || [];
          const hasPublicCandidate = candidates.some(c => c.includes('typ srflx'));
          
          iceSuccess = hasPublicCandidate;
          
          if (hasPublicCandidate) {
            setDiagnosticResults(prev => ({ ...prev, iceServers: true }));
            addToLog('Successfully connected to STUN server ✅', 'success');
          } else {
            setDiagnosticResults(prev => ({ ...prev, iceServers: false }));
            addToLog('Failed to gather public IP candidates', 'error');
          }
          
          pc.close();
        }
      });
      
      // Create data channel to trigger ICE gathering
      pc.createDataChannel('test');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      // Set timeout for ICE gathering
      setTimeout(() => {
        if (!iceSuccess) {
          iceTimeout = true;
          setDiagnosticResults(prev => ({ ...prev, iceServers: false }));
          addToLog('ICE gathering timed out - STUN server may be blocked', 'error');
          pc.close();
        }
      }, 5000);
      
    } catch (err) {
      setDiagnosticResults(prev => ({ ...prev, iceServers: false }));
      addToLog(`Error checking ICE servers: ${err.message}`, 'error');
    }

    // Socket.io connection check
    try {
      const socketUrl = process.env.REACT_APP_SOCKET_URL || window.location.origin;
      addToLog(`Testing socket connection to ${socketUrl}...`, 'info');
      
      // Load socket.io client dynamically
      const io = await import('socket.io-client').then(m => m.default || m);
      const socket = io(socketUrl, { timeout: 5000 });
      
      let connected = false;
      
      socket.on('connect', () => {
        connected = true;
        setDiagnosticResults(prev => ({ ...prev, socketConnection: true }));
        addToLog('Socket.io connected successfully ✅', 'success');
        socket.disconnect();
      });
      
      socket.on('connect_error', (err) => {
        setDiagnosticResults(prev => ({ ...prev, socketConnection: false }));
        addToLog(`Socket.io connection error: ${err.message}`, 'error');
        socket.disconnect();
      });
      
      setTimeout(() => {
        if (!connected) {
          setDiagnosticResults(prev => ({ ...prev, socketConnection: false }));
          addToLog('Socket.io connection timed out', 'error');
          socket.disconnect();
        }
      }, 5000);
      
    } catch (err) {
      setDiagnosticResults(prev => ({ ...prev, socketConnection: false }));
      addToLog(`Error checking socket connection: ${err.message}`, 'error');
    }
    
    // Network connectivity check
    try {
      addToLog('Testing network connectivity...', 'info');
      const response = await fetch('https://www.google.com', { 
        mode: 'no-cors',
        cache: 'no-cache'
      });
      
      setDiagnosticResults(prev => ({ ...prev, networkConnectivity: true }));
      addToLog('Network connectivity check passed ✅', 'success');
    } catch (err) {
      setDiagnosticResults(prev => ({ ...prev, networkConnectivity: false }));
      addToLog(`Network connectivity error: ${err.message}`, 'error');
    }
    
    setRunning(false);
    addToLog('Diagnostics complete', 'info');
  };

  return (
    <div className="max-w-3xl mx-auto p-4 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">WebRTC Diagnostic Tool</h2>
      
      <button
        onClick={runDiagnostics}
        disabled={running}
        className="mb-6 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
      >
        {running ? 'Running Diagnostics...' : 'Run Diagnostics'}
      </button>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="border p-3 rounded">
          <h3 className="font-semibold mb-2">Browser Support</h3>
          <div className="flex items-center">
            <div 
              className={`h-4 w-4 rounded-full mr-2 ${
                diagnosticResults.browserSupport === null ? 'bg-gray-300' :
                diagnosticResults.browserSupport ? 'bg-green-500' : 'bg-red-500'
              }`}
            ></div>
            <span>{
              diagnosticResults.browserSupport === null ? 'Not tested' :
              diagnosticResults.browserSupport ? 'Supported' : 'Not supported'
            }</span>
          </div>
        </div>
        
        <div className="border p-3 rounded">
          <h3 className="font-semibold mb-2">Media Devices</h3>
          <div className="flex items-center">
            <div 
              className={`h-4 w-4 rounded-full mr-2 ${
                diagnosticResults.mediaDevices === null ? 'bg-gray-300' :
                diagnosticResults.mediaDevices ? 'bg-green-500' : 'bg-red-500'
              }`}
            ></div>
            <span>{
              diagnosticResults.mediaDevices === null ? 'Not tested' :
              diagnosticResults.mediaDevices ? 'Available' : 'Not available'
            }</span>
          </div>
        </div>
        
        <div className="border p-3 rounded">
          <h3 className="font-semibold mb-2">STUN Servers</h3>
          <div className="flex items-center">
            <div 
              className={`h-4 w-4 rounded-full mr-2 ${
                diagnosticResults.iceServers === null ? 'bg-gray-300' :
                diagnosticResults.iceServers ? 'bg-green-500' : 'bg-red-500'
              }`}
            ></div>
            <span>{
              diagnosticResults.iceServers === null ? 'Not tested' :
              diagnosticResults.iceServers ? 'Connected' : 'Connection failed'
            }</span>
          </div>
        </div>
        
        <div className="border p-3 rounded">
          <h3 className="font-semibold mb-2">Socket.io Connection</h3>
          <div className="flex items-center">
            <div 
              className={`h-4 w-4 rounded-full mr-2 ${
                diagnosticResults.socketConnection === null ? 'bg-gray-300' :
                diagnosticResults.socketConnection ? 'bg-green-500' : 'bg-red-500'
              }`}
            ></div>
            <span>{
              diagnosticResults.socketConnection === null ? 'Not tested' :
              diagnosticResults.socketConnection ? 'Connected' : 'Connection failed'
            }</span>
          </div>
        </div>
        
        <div className="border p-3 rounded">
          <h3 className="font-semibold mb-2">Network Connectivity</h3>
          <div className="flex items-center">
            <div 
              className={`h-4 w-4 rounded-full mr-2 ${
                diagnosticResults.networkConnectivity === null ? 'bg-gray-300' :
                diagnosticResults.networkConnectivity ? 'bg-green-500' : 'bg-red-500'
              }`}
            ></div>
            <span>{
              diagnosticResults.networkConnectivity === null ? 'Not tested' :
              diagnosticResults.networkConnectivity ? 'Working' : 'Issues detected'
            }</span>
          </div>
        </div>
      </div>
      
      <div className="border rounded p-4 overflow-auto" style={{ maxHeight: '300px' }}>
        <h3 className="font-semibold mb-2">Diagnostic Log</h3>
        {log.length === 0 ? (
          <p className="text-gray-500">Run diagnostics to see the log</p>
        ) : (
          <div className="space-y-1">
            {log.map((entry, i) => (
              <div 
                key={i}
                className={`p-1 text-sm rounded ${
                  entry.type === 'success' ? 'bg-green-50 text-green-800' :
                  entry.type === 'error' ? 'bg-red-50 text-red-800' :
                  'bg-blue-50 text-blue-800'
                }`}
              >
                <span className="text-xs opacity-75">
                  {entry.timestamp.toLocaleTimeString()}
                </span>
                {' '}
                {entry.message}
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="mt-6 text-sm text-gray-600">
        <h3 className="font-semibold mb-2">Troubleshooting Tips</h3>
        <ul className="list-disc ml-5 space-y-1">
          <li>Make sure your camera and microphone are not being used by another application</li>
          <li>Check camera permissions in your browser settings</li>
          <li>Try using a different browser (Chrome works best for WebRTC)</li>
          <li>Check if your firewall or network is blocking WebRTC connections</li>
          <li>If on a corporate network, STUN/TURN servers might be blocked</li>
          <li>Try using a wired connection instead of Wi-Fi</li>
        </ul>
      </div>
    </div>
  );
};

export default WebRTCDiagnostic;