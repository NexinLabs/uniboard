import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Register = () => {
    const [info, setInfo] = useState({ username: "", email: "", password: "" });
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInfo((prev) => ({ ...prev, [e.target.id]: e.target.value }));
    };

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post("http://localhost:5000/api/auth/register", info);
            navigate("/login");
        } catch (err: any) {
            setError(err.response?.data || "Registration failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center h-[80vh]">
            <div className="w-full max-w-md p-8 bg-card rounded-lg border border-border shadow-lg">
                <h2 className="text-2xl font-bold mb-6 text-center">Create an Account</h2>
                <form className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Username</label>
                        <input
                            type="text"
                            id="username"
                            onChange={handleChange}
                            className="w-full p-2 rounded bg-input border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Choose a username"
                        />
                    </div>
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
                            placeholder="Choose a password"
                        />
                    </div>
                    {error && <span className="text-red-500 text-sm">{String(error)}</span>}
                    <button
                        onClick={handleClick}
                        disabled={loading}
                        className="w-full py-2 bg-primary text-primary-foreground rounded font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {loading ? "Loading..." : "Register"}
                    </button>
                </form>
            </div>
        </div>
    );
};
export default Register;
