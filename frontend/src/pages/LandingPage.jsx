import React from 'react'
import "../App.css"
import { Link, useNavigate } from 'react-router-dom'

import { generateMeetingCode } from "../utils/meetingCode";

export default function LandingPage() {
    const navigate = useNavigate();
    const isLoggedIn = Boolean(localStorage.getItem("token"));

    return (
        <div className='landingPageContainer'>
            <nav className="navbar navbar-expand-lg p-3 bg-transparent border-bottom  px-3">
                <h2 className="navbar-brand ms-5 m-0">Video Call</h2>

                <div className="ms-auto me-5 d-flex align-items-center gap-4">
                    <button type="button" className="btn btn-link text-dark text-decoration-none p-0"
                        onClick={() => navigate(`/${generateMeetingCode()}`)}>
                        Join as Guest
                    </button>
                    {isLoggedIn ? (
                        <Link to="/home" className="text-dark text-decoration-none">My meetings</Link>
                    ) : (
                        <>
                            <Link to="/auth" className="text-dark text-decoration-none">Register</Link>
                            <Link to="/auth" className="text-dark text-decoration-none">Login</Link>
                        </>
                    )}
                </div>
            </nav>


            <div className="container d-flex align-items-center" style={{ height: "80vh" }}>
                <div className='row'>
                    <div className='col-6 d-flex flex-column align-items-start justify-content-center text-start'>
                        <h1 className='fs-1 fw-bold'><span style={{ color: "#FF9839" }}>Connect</span> with your loved Ones</h1>

                        <p className='mb-4 fs-4'>Cover a distance by Video Call</p>
                        <div>
                            <Link to={isLoggedIn ? "/home" : "/auth"} className='btn  btn-lg btn-primary' style={{ textDecoration: "none", }}>Get Started</Link>
                        </div>
                    </div>

                    <div className='col-6 ms-auto landingImage '>
                        <img src="/Landing.jpg" className="img-fluid shadow-lg" alt="" />
                    </div>
                </div>

            </div>

        </div>
    )
}
