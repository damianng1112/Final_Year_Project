import React, { useRef, useState } from 'react';
import Peer from 'simple-peer';
import io from 'socket.io-client';

const socket = io.connect(process.env.REACT_APP_SOCKET_URL);

const VideoCall = () => {
  const [stream, setStream] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callInitiated, setCallInitiated] = useState(false);
  const [peer, setPeer] = useState(null);
  const [loading, setLoading] = useState(false);

  const userVideo = useRef();
  const partnerVideo = useRef();

  const startCall = () => {
    setLoading(true);
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
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
          if (partnerVideo.current) {
            partnerVideo.current.srcObject = partnerStream;
          }
        });

        setCallInitiated(true);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error accessing media devices.', error);
        setLoading(false);
      });
  };

  return (
    <div>
      <h2>Video Call</h2>
      {loading && <p>Loading...</p>}
      <button onClick={startCall} aria-label="Start video call">Start Call</button>
      <div>
        <video ref={userVideo} autoPlay playsInline muted />
        {callAccepted && <video ref={partnerVideo} autoPlay playsInline />}
      </div>
    </div>
  );
};

export default VideoCall;
