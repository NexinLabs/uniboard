import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

const Layout = () => {
    return (
        <div className="min-h-screen bg-background text-foreground font-sans antialiased">
            <Navbar />
            <main className="p-4">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
