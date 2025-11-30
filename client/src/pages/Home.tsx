import { Link } from 'react-router-dom';

const Home = () => {
    return (
        <div className="flex flex-col items-center justify-center h-[80vh] text-center">
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                Welcome to Uniboard
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl">
                The ultimate collaborative whiteboard for developers and designers.
                Sketch, plan, and share your ideas in real-time.
            </p>
            <div className="flex gap-4">
                <Link to="/register" className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity">
                    Get Started
                </Link>
                <Link to="/login" className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity">
                    Login
                </Link>
            </div>
        </div>
    );
};
export default Home;
