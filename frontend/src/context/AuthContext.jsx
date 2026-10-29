import axios from 'axios';
import React, { createContext, useState } from 'react';
import { useNavigate } from "react-router-dom";
import httpStatus from "http-status";

import server from "../environment";

export const AuthContext = createContext(null);

const client = axios.create({
    baseURL: `${server}/api/v1/users`,
});

// Send the session token with every request.
client.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

const readStoredUser = () => {
    try {
        return JSON.parse(localStorage.getItem("user"));
    } catch {
        return null;
    }
};

export const AuthProvider = ({ children }) => {

    const [userData, setUserData] = useState(readStoredUser);

    const navigate = useNavigate();

    const handleRegister = async (name, username, password) => {
        const request = await client.post("/register", {
            name,
            username,
            password,
        });

        if (request.status === httpStatus.CREATED) {
            return request.data.message;
        }
    };

    const handleLogin = async (username, password) => {
        const request = await client.post("/login", {
            username,
            password,
        });

        if (request.status === httpStatus.OK) {
            const user = { name: request.data.name, username: request.data.username };
            localStorage.setItem("token", request.data.token);
            localStorage.setItem("user", JSON.stringify(user));
            setUserData(user);
            navigate("/home");
        }
    };

    const handleLogout = async () => {
        try {
            await client.post("/logout");
        } catch {
            // Token may already be invalid; clear local session anyway.
        }
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUserData(null);
        navigate("/auth");
    };

    const getHistoryOfUser = async () => {
        const request = await client.get("/get_all_activity");
        return request.data;
    };

    const addToUserHistory = async (meetingCode) => {
        const request = await client.post("/add_to_activity", { meeting_code: meetingCode });
        return request.data;
    };

    const value = {
        userData,
        setUserData,
        handleRegister,
        handleLogin,
        handleLogout,
        getHistoryOfUser,
        addToUserHistory,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
