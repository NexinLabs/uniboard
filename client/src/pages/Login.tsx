import { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';

import { useNavigate } from 'react-router-dom';

import api from '../utils/api';

const Login = () => {
    const [credentials, setCredentials] = useState({ email: "", password: "" });
    const { loading, error, dispatch } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCredentials((prev) => ({ ...prev, [e.target.id]: e.target.value }));
    };

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        dispatch({ type: "LOGIN_START" });
        try {
            const res = await api.post("/api/auth/login", credentials);
            dispatch({ type: "LOGIN_SUCCESS", payload: res.data });
            navigate("/dashboard");
        } catch (err: any) {
            dispatch({ type: "LOGIN_FAILURE", payload: err.response?.data || "Login failed" });
        }
    };

    return (
        <div className="flex items-center justify-center h-[80vh]">
            <div className="w-full max-w-md p-8 bg-card rounded-lg border border-border shadow-lg">
                <h2 className="text-2xl font-bold mb-6 text-center">Login to Uniboard</h2>
                <form className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Email</label>
                        <input
                            type="email"
                            id="email"
                            onChange={handleChange}
                            className="w-full p-2 rounded bg-input border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Enter your email"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Password</label>
                        <input
                            type="password"
                            id="password"
                            onChange={handleChange}
                            className="w-full p-2 rounded bg-input border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Enter your password"
                        />
                    </div>
                    {error && <span className="text-red-500 text-sm">{String(error)}</span>}
                    <button
                        onClick={handleClick}
                        disabled={loading}
                        className="w-full py-2 bg-primary text-primary-foreground rounded font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {loading ? "Loading..." : "Login"}
                    </button>
                </form>
            </div>
        </div>
    );
};
export default Login;
