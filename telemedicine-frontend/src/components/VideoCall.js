import React, { useRef, useState, useEffect } from 'react';
import Peer from 'simple-peer';
import io from 'socket.io-client';

const socket = io.connect(process.env.REACT_APP_SOCKET_URL);

const VideoCall = ({ roomId }) => {
  const [stream, setStream] = useState(null);
  const [callActive, setCallActive] = useState(false);
  const [peers, setPeers] = useState([]);
  const userVideo = useRef();
  const remoteVideoRefs = useRef({});
  const peersRef = useRef([]);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        setStream(stream);
        userVideo.current.srcObject = stream;
        
        socket.emit('join-room', roomId);

        socket.on('user-connected', userId => handleUserConnected(userId, stream));

        socket.on('user-disconnected', handleUserDisconnected);

        socket.on('signal', handleSignal);
      });

    return () => {
      socket.disconnect();
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, [roomId]);

  const handleUserConnected = (userId, stream) => {
    const peer = createPeer(userId, socket.id, stream);
    peersRef.current.push({ peerID: userId, peer });
    setPeers(users => [...users, { id: userId, peer }]);
  };

  const handleUserDisconnected = (userId) => {
    const peerObj = peersRef.current.find(p => p.peerID === userId);
    if (peerObj) peerObj.peer.destroy();

    peersRef.current = peersRef.current.filter(p => p.peerID !== userId);
    setPeers(peers => peers.filter(peer => peer.id !== userId));
  };

  const handleSignal = (payload) => {
    const item = peersRef.current.find(p => p.peerID === payload.id);
    if (item) item.peer.signal(payload.signal);
  };

  const createPeer = (userID, callerID, stream) => {
    const peer = new Peer({
      initiator: callerID === socket.id,
      trickle: false,
      stream,
    });

    peer.on('signal', signal => {
      socket.emit('signal', { userID, callerID, signal });
    });

    peer.on('stream', remoteStream => {
      remoteVideoRefs.current[userID].srcObject = remoteStream;
    });

    return peer;
  };

  return (
    <div className="video-call-container">
      <div className="video-grid">
        <video ref={userVideo} autoPlay playsInline muted className="local-video" />
        {peers.map(peer => (
          <video
            key={peer.id}
            ref={ref => (remoteVideoRefs.current[peer.id] = ref)}
            autoPlay
            playsInline
            className="remote-video"
          />
        ))}
      </div>
      <button
        onClick={() => setCallActive(!callActive)}
        className={`call-button ${callActive ? 'end-call' : 'start-call'}`}
      >
        {callActive ? 'End Call' : 'Start Call'}
      </button>
    </div>
  );
};

export default VideoCall;
