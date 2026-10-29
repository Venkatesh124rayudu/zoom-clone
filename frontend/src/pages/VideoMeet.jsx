import React, { useContext, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Badge from "@mui/material/Badge";
import Tooltip from "@mui/material/Tooltip";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
import CallEndIcon from "@mui/icons-material/CallEnd";
import ChatIcon from "@mui/icons-material/Chat";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

import server from "../environment";
import { AuthContext } from "../context/AuthContext";
import "../styles/VideoMeet.css";

// ICE (Interactive Connectivity Establishment): the STUN server tells each browser its public
// address so two peers can find a direct path to each other.
const peerConfig = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

// Asks for camera + mic, falling back to whichever one is available.
const getLocalMedia = async () => {
    const attempts = [{ video: true, audio: true }, { video: false, audio: true }, { video: true, audio: false }];
    for (const constraints of attempts) {
        try {
            return await navigator.mediaDevices.getUserMedia(constraints);
        } catch {
            // try the next combination
        }
    }
    return null;
};

function RemoteVideo({ stream }) {
    const ref = useRef(null);
    useEffect(() => {
        if (ref.current) ref.current.srcObject = stream;
    }, [stream]);
    return (
        <div className="meet-tile">
            {stream ? <video ref={ref} autoPlay playsInline /> : <div className="meet-tile-empty">Camera off</div>}
            <span className="meet-tile-label">Participant</span>
        </div>
    );
}

function VideoMeetComponent() {
    const { id: roomId } = useParams();
    const navigate = useNavigate();
    const { userData } = useContext(AuthContext);

    const socketRef = useRef(null);
    const localVideoRef = useRef(null);
    const localStreamRef = useRef(null);       // camera + mic
    const screenTrackRef = useRef(null);       // active screen-share track
    const connectionsRef = useRef({});         // socketId -> RTCPeerConnection
    const pendingIceRef = useRef({});          // ICE candidates that arrived before the SDP
    const showChatRef = useRef(false);

    const [askForUsername, setAskForUsername] = useState(true);
    const [username, setUsername] = useState(userData?.name ?? "");
    const [mediaError, setMediaError] = useState("");
    const [videoOn, setVideoOn] = useState(false);
    const [audioOn, setAudioOn] = useState(false);
    const [screenOn, setScreenOn] = useState(false);
    const [videos, setVideos] = useState([]);  // [{ socketId, stream }]
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState("");
    const [showChat, setShowChat] = useState(false);
    const [newMessages, setNewMessages] = useState(0);
    const [copied, setCopied] = useState(false);

    const canShareScreen = Boolean(navigator.mediaDevices?.getDisplayMedia);

    const showLocalPreview = (stream) => {
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    };

    const stopEverything = () => {
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
        screenTrackRef.current?.stop();
        Object.values(connectionsRef.current).forEach((pc) => pc.close());
        connectionsRef.current = {};
        socketRef.current?.disconnect();
    };

    // Ask for camera/mic when the page opens; release everything when it closes.
    useEffect(() => {
        let cancelled = false;
        getLocalMedia().then((stream) => {
            if (cancelled) {
                stream?.getTracks().forEach((t) => t.stop());
                return;
            }
            if (!stream) {
                setMediaError("No camera or microphone access. You can still join and chat.");
                return;
            }
            localStreamRef.current = stream;
            setVideoOn(stream.getVideoTracks().length > 0);
            setAudioOn(stream.getAudioTracks().length > 0);
            showLocalPreview(stream);
        });
        return () => {
            cancelled = true;
            stopEverything();
        };
    }, []);

    // The lobby and the meeting use different <video> elements; re-attach the stream after switching.
    useEffect(() => {
        if (!screenOn) showLocalPreview(localStreamRef.current);
    }, [askForUsername, screenOn]);

    // ---------- WebRTC ----------

    const sendSignal = (toId, payload) => {
        socketRef.current?.emit("signal", toId, JSON.stringify(payload));
    };

    const createPeer = (remoteId) => {
        if (connectionsRef.current[remoteId]) return connectionsRef.current[remoteId];

        const pc = new RTCPeerConnection(peerConfig);

        pc.onicecandidate = (event) => {
            if (event.candidate) sendSignal(remoteId, { ice: event.candidate });
        };

        pc.ontrack = (event) => {
            const [stream] = event.streams;
            setVideos((prev) =>
                prev.some((v) => v.socketId === remoteId)
                    ? prev.map((v) => (v.socketId === remoteId ? { ...v, stream } : v))
                    : [...prev, { socketId: remoteId, stream }]
            );
        };

        const stream = localStreamRef.current;
        stream?.getTracks().forEach((track) => pc.addTrack(track, stream));

        // A newcomer should see our shared screen, not our camera.
        if (screenTrackRef.current) {
            pc.getSenders().find((s) => s.track?.kind === "video")?.replaceTrack(screenTrackRef.current);
        }

        connectionsRef.current[remoteId] = pc;
        return pc;
    };

    const handleSignal = async (fromId, raw) => {
        const signal = JSON.parse(raw);
        const pc = createPeer(fromId);

        try {
            if (signal.sdp) {
                await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));

                for (const candidate of pendingIceRef.current[fromId] ?? []) {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                }
                delete pendingIceRef.current[fromId];

                if (signal.sdp.type === "offer") {
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    sendSignal(fromId, { sdp: pc.localDescription });
                }
            }

            if (signal.ice) {
                if (pc.remoteDescription) {
                    await pc.addIceCandidate(new RTCIceCandidate(signal.ice));
                } else {
                    (pendingIceRef.current[fromId] ??= []).push(signal.ice);
                }
            }
        } catch (e) {
            console.error("Signalling error", e);
        }
    };

    const addMessage = (data, sender, senderId) => {
        const mine = senderId === socketRef.current?.id;
        setMessages((prev) => [...prev, { sender, data, mine }]);
        if (!mine && !showChatRef.current) setNewMessages((n) => n + 1);
    };

    const connectToSocketServer = () => {
        const socket = io(server);
        socketRef.current = socket;

        socket.on("connect", () => socket.emit("join-call", roomId));
        socket.on("signal", handleSignal);
        socket.on("chat-message", addMessage);

        socket.on("user-joined", async (joinedId, clients) => {
            // Show a tile for every participant right away, even before (or without) their video.
            setVideos((prev) => {
                const known = new Set(prev.map((v) => v.socketId));
                const added = clients
                    .filter((id) => id !== socket.id && !known.has(id))
                    .map((id) => ({ socketId: id, stream: null }));
                return added.length ? [...prev, ...added] : prev;
            });

            // Only the newcomer sends offers; everyone else answers in handleSignal.
            if (joinedId !== socket.id) return;
            for (const clientId of clients) {
                if (clientId === socket.id) continue;
                const pc = createPeer(clientId);
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                sendSignal(clientId, { sdp: pc.localDescription });
            }
        });

        socket.on("user-left", (leftId) => {
            connectionsRef.current[leftId]?.close();
            delete connectionsRef.current[leftId];
            setVideos((prev) => prev.filter((v) => v.socketId !== leftId));
        });
    };

    const connect = () => {
        if (!username.trim()) return;
        setAskForUsername(false);
        connectToSocketServer();
    };

    // ---------- Controls ----------

    const toggleVideo = () => {
        const track = localStreamRef.current?.getVideoTracks()[0];
        if (!track) return;
        track.enabled = !track.enabled;
        setVideoOn(track.enabled);
    };

    const toggleAudio = () => {
        const track = localStreamRef.current?.getAudioTracks()[0];
        if (!track) return;
        track.enabled = !track.enabled;
        setAudioOn(track.enabled);
    };

    // Swap the video we send to every peer (camera <-> screen) without renegotiating.
    const replaceOutgoingVideo = (track) => {
        if (!track) return;
        Object.values(connectionsRef.current).forEach((pc) => {
            pc.getSenders().find((s) => s.track?.kind === "video")?.replaceTrack(track);
        });
    };

    const stopScreenShare = () => {
        screenTrackRef.current?.stop();
        screenTrackRef.current = null;
        replaceOutgoingVideo(localStreamRef.current?.getVideoTracks()[0] ?? null);
        showLocalPreview(localStreamRef.current);
        setScreenOn(false);
    };

    const toggleScreenShare = async () => {
        if (screenOn) {
            stopScreenShare();
            return;
        }
        try {
            const display = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const screenTrack = display.getVideoTracks()[0];
            screenTrackRef.current = screenTrack;
            replaceOutgoingVideo(screenTrack);
            showLocalPreview(display);
            setScreenOn(true);
            screenTrack.onended = stopScreenShare; // user clicked the browser's "Stop sharing"
        } catch {
            // user cancelled the screen picker
        }
    };

    const endCall = () => {
        stopEverything();
        navigate(userData ? "/home" : "/");
    };

    const toggleChat = () => {
        const next = !showChat;
        setShowChat(next);
        showChatRef.current = next;
        if (next) setNewMessages(0);
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if (!message.trim()) return;
        socketRef.current?.emit("chat-message", message.trim(), username);
        setMessage("");
    };

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // clipboard blocked; the code is visible on screen anyway
        }
    };

    // ---------- UI ----------

    if (askForUsername) {
        return (
            <div className="meet-lobby">
                <div className="meet-lobby-card">
                    <h1>Enter the Lobby</h1>
                    <p className="meet-muted">Meeting code: <strong>{roomId}</strong></p>
                    <div className="meet-lobby-preview">
                        <video ref={localVideoRef} autoPlay muted playsInline />
                    </div>
                    {mediaError && <p className="meet-warning">{mediaError}</p>}
                    <form
                        className="meet-lobby-form"
                        onSubmit={(e) => {
                            e.preventDefault();
                            connect();
                        }}
                    >
                        <TextField
                            label="Your name"
                            variant="outlined"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            fullWidth
                        />
                        <Button type="submit" variant="contained" size="large" disabled={!username.trim()}>
                            Join
                        </Button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="meet-room">
            <div className="meet-main">
                <div className={`meet-grid ${videos.length === 0 ? "meet-grid-empty" : ""}`}>
                    {videos.length === 0 ? (
                        <div className="meet-waiting">
                            <p>Waiting for others to join…</p>
                            <Button variant="outlined" startIcon={<ContentCopyIcon />} onClick={copyLink}>
                                {copied ? "Link copied" : "Copy invite link"}
                            </Button>
                            <p className="meet-muted">Meeting code: {roomId}</p>
                        </div>
                    ) : (
                        videos.map((v) => <RemoteVideo key={v.socketId} stream={v.stream} />)
                    )}
                </div>

                <div className="meet-self">
                    <video ref={localVideoRef} autoPlay muted playsInline />
                    <span className="meet-tile-label">{screenOn ? "You (screen)" : "You"}</span>
                </div>

                <div className="meet-controls">
                    <Tooltip title={videoOn ? "Turn camera off" : "Turn camera on"}>
                        <span>
                            <IconButton onClick={toggleVideo} className="meet-btn" aria-label="Toggle camera"
                                disabled={!localStreamRef.current?.getVideoTracks().length}>
                                {videoOn ? <VideocamIcon /> : <VideocamOffIcon />}
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title={audioOn ? "Mute" : "Unmute"}>
                        <span>
                            <IconButton onClick={toggleAudio} className="meet-btn" aria-label="Toggle microphone"
                                disabled={!localStreamRef.current?.getAudioTracks().length}>
                                {audioOn ? <MicIcon /> : <MicOffIcon />}
                            </IconButton>
                        </span>
                    </Tooltip>
                    {canShareScreen && (
                        <Tooltip title={screenOn ? "Stop sharing" : "Share screen"}>
                            <IconButton onClick={toggleScreenShare} className={`meet-btn ${screenOn ? "meet-btn-active" : ""}`}
                                aria-label="Toggle screen share">
                                {screenOn ? <StopScreenShareIcon /> : <ScreenShareIcon />}
                            </IconButton>
                        </Tooltip>
                    )}
                    <Tooltip title="Chat">
                        <IconButton onClick={toggleChat} className={`meet-btn ${showChat ? "meet-btn-active" : ""}`} aria-label="Toggle chat">
                            <Badge badgeContent={newMessages} color="warning" max={99}>
                                <ChatIcon />
                            </Badge>
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Leave call">
                        <IconButton onClick={endCall} className="meet-btn meet-btn-end" aria-label="Leave call">
                            <CallEndIcon />
                        </IconButton>
                    </Tooltip>
                </div>
            </div>

            {showChat && (
                <aside className="meet-chat">
                    <div className="meet-chat-header">
                        <h2>Chat</h2>
                        <IconButton onClick={toggleChat} aria-label="Close chat" size="small" sx={{ color: "inherit" }}>
                            <CloseIcon />
                        </IconButton>
                    </div>
                    <div className="meet-chat-messages">
                        {messages.length === 0 ? (
                            <p className="meet-muted">No messages yet</p>
                        ) : (
                            messages.map((m, i) => (
                                <div key={i} className={`meet-msg ${m.mine ? "meet-msg-mine" : ""}`}>
                                    <span className="meet-msg-sender">{m.mine ? "You" : m.sender}</span>
                                    <p>{m.data}</p>
                                </div>
                            ))
                        )}
                    </div>
                    <form className="meet-chat-form" onSubmit={sendMessage}>
                        <input
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Send a message"
                            aria-label="Chat message"
                        />
                        <IconButton type="submit" aria-label="Send" sx={{ color: "inherit" }}>
                            <SendIcon />
                        </IconButton>
                    </form>
                </aside>
            )}
        </div>
    );
}

export default VideoMeetComponent;
