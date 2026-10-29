// Backend address: set VITE_SERVER_URL in .env for deployment.
const server = import.meta.env.VITE_SERVER_URL || "http://localhost:8000";

export default server;
