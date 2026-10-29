import React, { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import HistoryIcon from "@mui/icons-material/History";
import LogoutIcon from "@mui/icons-material/Logout";
import VideoCallIcon from "@mui/icons-material/VideoCall";

import { AuthContext } from "../context/AuthContext";
import withAuth from "../utils/withAuth";
import { generateMeetingCode } from "../utils/meetingCode";

function Home() {
    const navigate = useNavigate();
    const { userData, handleLogout, addToUserHistory } = useContext(AuthContext);
    const [meetingCode, setMeetingCode] = useState("");
    const [error, setError] = useState("");

    const joinMeeting = async (code) => {
        const cleanCode = code.trim();
        if (!cleanCode) {
            setError("Enter a meeting code");
            return;
        }
        try {
            await addToUserHistory(cleanCode);
        } catch {
            // History is optional; still join the call.
        }
        navigate(`/${cleanCode}`);
    };

    return (
        <div className="landingPageContainer">
            <nav className="navbar p-3 border-bottom px-3">
                <Link to="/" className="navbar-brand ms-5 m-0 fs-3 fw-semibold text-dark text-decoration-none">Video Call</Link>
                <div className="ms-auto me-5 d-flex align-items-center gap-3">
                    <Button startIcon={<HistoryIcon />} onClick={() => navigate("/history")}>History</Button>
                    <Button startIcon={<LogoutIcon />} color="error" onClick={handleLogout}>Logout</Button>
                </div>
            </nav>

            <div className="container d-flex align-items-center" style={{ minHeight: "80vh" }}>
                <div className="row w-100 align-items-center">
                    <div className="col-md-6 d-flex flex-column align-items-start gap-3">
                        <h1 className="fs-1 fw-bold">
                            Hi {userData?.name ?? "there"}, <span style={{ color: "#FF9839" }}>ready to meet?</span>
                        </h1>
                        <p className="fs-5 text-secondary mb-2">Start a new meeting or join one with a code.</p>

                        <Button
                            variant="contained"
                            size="large"
                            startIcon={<VideoCallIcon />}
                            onClick={() => joinMeeting(generateMeetingCode())}
                        >
                            New meeting
                        </Button>

                        <form
                            className="d-flex gap-2 w-100 mt-2"
                            onSubmit={(e) => {
                                e.preventDefault();
                                joinMeeting(meetingCode);
                            }}
                        >
                            <TextField
                                label="Meeting code"
                                variant="outlined"
                                size="small"
                                value={meetingCode}
                                onChange={(e) => {
                                    setMeetingCode(e.target.value);
                                    setError("");
                                }}
                                error={Boolean(error)}
                                helperText={error || " "}
                                sx={{ flex: 1, maxWidth: 320 }}
                            />
                            <Button type="submit" variant="outlined" sx={{ height: 40 }}>Join</Button>
                        </form>
                    </div>

                    <div className="col-md-6 landingImage d-none d-md-block">
                        <img src="/Landing.jpg" className="img-fluid shadow-lg" alt="" />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default withAuth(Home);
