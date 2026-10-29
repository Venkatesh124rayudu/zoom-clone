import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import React, { useState } from "react";

import { AuthContext } from "../context/AuthContext";

function Authentication() {

    const [username, setUsername] = useState("");
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState();
    const [message, setMessage] = useState();


    const [formState, setFormState] = useState(0);


    const activeButtonStyle = "activebutton";
    const inactiveButtonStyle = "inActivebutton";

    const { handleRegister, handleLogin } = React.useContext(AuthContext);

    let handleAuth = async () => {
        try {
            if (formState === 0) {
                await handleLogin(username, password);
            }
            if (formState === 1) {
                let result = await handleRegister(name, username, password);
                setMessage(result);
                setError("")
                setFormState(0)
            }
        } catch (err) {
            setError(err.response?.data?.message || "Could not reach the server");
        }
    }

    React.useEffect(() => {
        if (error || message) {
            const timer = setTimeout(() => {
                setError("");
                setMessage("");
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [error, message]);

    return (
        <>
            <div className="authPage row" style={{ minHeight: "100vh" }}>

                {/* Left Image */}
                <div className="col-7 p-0">
                    <img
                        src="/auth.jpg"
                        alt="Auth"
                        className="img-fluid"
                        style={{ height: "100vh", width: "100%", objectFit: "cover" }}
                    />
                </div>

                {/* Right Form */}
                <div className="col-5 d-flex align-items-center justify-content-center">
                    <div
                        className="p-5 shadow-sm rounded text-center"
                        style={{ width: "80%", maxWidth: "400px", background: "#ffffff" }}
                    >

                        {/* Profile Icon */}
                        <AccountCircleIcon
                            style={{ fontSize: 70, color: "#4A6CF7", marginBottom: "10px" }}
                        />

                        <h2 className="mb-2" style={{ fontWeight: 600 }}>
                            {formState === 0 ? "Sign In" : "Sign Up"}
                        </h2>

                        <button className={`btn btn-style ${formState === 0 ? activeButtonStyle : inactiveButtonStyle}`} onClick={() => { setFormState(0) }}>Sign In</button>
                        <button className={`btn btn-style ${formState === 1 ? activeButtonStyle : inactiveButtonStyle}`} onClick={() => { setFormState(1) }}>Sign Up</button>
                        <form>

                            {formState === 1 ? <div className="mb-3 mt-3 text-start">
                                <label className="form-label fw-semibold">Full Name</label>
                                <input
                                    type="text"
                                    className="form-control p-2"
                                    placeholder="Enter Full Name"
                                    style={{ borderRadius: "0px" }}
                                    onChange={(e) => { setName(e.target.value) }}
                                    value={name}
                                />
                            </div> : null}

                            {/* Username */}
                            <div className="mb-3 mt-3 text-start">
                                <label className="form-label fw-semibold">Username</label>
                                <input
                                    type="text"
                                    className="form-control p-2"
                                    placeholder="Enter username"
                                    style={{ borderRadius: "0px" }}
                                    onChange={(e) => { setUsername(e.target.value) }}
                                    value={username}
                                />
                            </div>

                            {/* Password */}
                            <div className="mb-3 text-start">
                                <label className="form-label fw-semibold">Password</label>
                                <input
                                    type="password"
                                    className="form-control p-2"
                                    placeholder="Enter password"
                                    style={{ borderRadius: "0px" }}
                                    onChange={(e) => { setPassword(e.target.value) }}
                                    value={password}
                                />
                            </div>
                            {error ? <p style={{ color: "red", fontWeight: "600" }}>{error}</p> : null}
                            {message ? <p style={{ color: "green", fontWeight: "600" }}>{message}</p> : null}
                            {/* Sign In Button */}
                            <button
                                type="button"
                                onClick={handleAuth}
                                className="btn w-100 mt-3 p-2 d-flex align-items-center justify-content-center gap-2"
                                style={{
                                    background: "#4A6CF7",
                                    color: "white",
                                    borderRadius: "0px",
                                    fontWeight: "600"
                                }}
                            >
                                <LoginRoundedIcon />
                                {formState === 0 ? "Sign In" : "Sign Up"}
                            </button>
                        </form>
                    </div>
                </div>

            </div>
        </>
    );
}

export default Authentication;
