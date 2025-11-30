import { Link, useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const Navbar = () => {
    const { user, dispatch } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        dispatch({ type: "LOGOUT" });
        navigate("/login");
    };

    return (
        <nav className="flex items-center justify-between p-4 bg-card border-b border-border">
            <Link to="/" className="text-xl font-bold text-primary">Uniboard</Link>
            <div className="flex gap-4 items-center">
                {user ? (
                    <>
                        <span className="text-sm font-medium">{user.username}</span>
                        <Link to="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-primary">Dashboard</Link>
                        <button onClick={handleLogout} className="text-sm font-medium text-red-500 hover:text-red-400">Logout</button>
                    </>
                ) : (
                    <>
                        <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-primary">Login</Link>
                        <Link to="/register" className="text-sm font-medium text-muted-foreground hover:text-primary">Register</Link>
                    </>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
