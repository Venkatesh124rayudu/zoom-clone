import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "@mui/material/Button";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import { AuthContext } from "../context/AuthContext";
import withAuth from "../utils/withAuth";

function History() {
    const navigate = useNavigate();
    const { getHistoryOfUser } = useContext(AuthContext);
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        getHistoryOfUser()
            .then(setMeetings)
            .catch(() => setError("Could not load your meeting history"))
            .finally(() => setLoading(false));
        // Load once when the page opens.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="container py-5" style={{ maxWidth: 760 }}>
            <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/home")}>Back</Button>
            <h1 className="fs-2 fw-bold mt-3 mb-4">Meeting history</h1>

            {loading && <p className="text-secondary">Loading…</p>}
            {error && <p className="text-danger">{error}</p>}
            {!loading && !error && meetings.length === 0 && (
                <p className="text-secondary">You haven't joined any meetings yet.</p>
            )}

            <ul className="list-group">
                {meetings.map((meeting) => (
                    <li key={meeting._id} className="list-group-item d-flex justify-content-between align-items-center py-3">
                        <div>
                            <div className="fw-semibold">{meeting.meetingCode}</div>
                            <small className="text-secondary">{new Date(meeting.date).toLocaleString()}</small>
                        </div>
                        <Button variant="outlined" size="small" onClick={() => navigate(`/${meeting.meetingCode}`)}>
                            Rejoin
                        </Button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default withAuth(History);
