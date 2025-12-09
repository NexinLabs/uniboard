import { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight } from 'lucide-react';

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
        <div className="min-h-[80vh] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
                    <div className="p-8">
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-bold bg-linear-to-r from-primary to-blue-400 bg-clip-text text-transparent mb-2">
                                Welcome Back
                            </h2>
                            <p className="text-muted-foreground">
                                Enter your credentials to access your workspace
                            </p>
                        </div>

                        <form className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground ml-1">Email</label>
                                <div className="relative group">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    <input
                                        type="email"
                                        id="email"
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-2.5 bg-secondary/50 border border-transparent focus:border-primary focus:bg-background rounded-xl outline-none transition-all"
                                        placeholder="name@example.com"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center ml-1">
                                    <label className="text-sm font-medium text-foreground">Password</label>
                                    <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                                        Forgot password?
                                    </Link>
                                </div>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    <input
                                        type="password"
                                        id="password"
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-2.5 bg-secondary/50 border border-transparent focus:border-primary focus:bg-background rounded-xl outline-none transition-all"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm text-center"
                                >
                                    {String(error)}
                                </motion.div>
                            )}

                            <button
                                onClick={handleClick}
                                disabled={loading}
                                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-all shadow-lg hover:shadow-primary/25 flex items-center justify-center gap-2 group"
                            >
                                {loading ? (
                                    "Loading..."
                                ) : (
                                    <>
                                        Sign In <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    <div className="p-4 bg-secondary/30 border-t border-border text-center text-sm text-muted-foreground">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-primary font-medium hover:underline">
                            Create account
                        </Link>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
