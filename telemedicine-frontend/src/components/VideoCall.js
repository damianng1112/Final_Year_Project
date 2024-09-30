import React, { useRef, useState } from 'react';
import Peer from 'simple-peer';
import io from 'socket.io-client';

const socket = io.connect('http://localhost:5000');

const VideoCall = () => {
  const [stream, setStream] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callInitiated, setCallInitiated] = useState(false);
  const [peer, setPeer] = useState(null);
  
  const userVideo = useRef();
  const partnerVideo = useRef();

  const startCall = () => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      setStream(stream);
      if (userVideo.current) {
        userVideo.current.srcObject = stream;
      }

      const p = new Peer({ initiator: true, trickle: false, stream });
      setPeer(p);

      p.on('signal', (data) => {
        socket.emit('signal', data);
      });

      p.on('stream', (partnerStream) => {
        partnerVideo.current.srcObject = partnerStream;
      });

      setCallInitiated(true);
    });
  };

  const acceptCall = (incomingSignal) => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      setStream(stream);
      if (userVideo.current) {
        userVideo.current.srcObject = stream;
      }

      const p = new Peer({ initiator: false, trickle: false, stream });
      setPeer(p);

      p.on('signal', (data) => {
        socket.emit('signal', data);
      });

      p.on('stream', (partnerStream) => {
        partnerVideo.current.srcObject = partnerStream;
      });

      p.signal(incomingSignal);
      setCallAccepted(true);
    });
  };

  socket.on('signal', (data) => {
    if (!callInitiated) {
      acceptCall(data);
    }
  });

  return (
    <div>
      <h2>Video Call</h2>
      <div>
        <video ref={userVideo} autoPlay playsInline />
        <video ref={partnerVideo} autoPlay playsInline />
      </div>
      {!callInitiated && <button onClick={startCall}>Start Call</button>}
    </div>
  );
};

export default VideoCall;
