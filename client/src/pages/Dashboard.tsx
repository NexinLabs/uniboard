import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import {
    Plus,
    Search,
    Layout,
    Clock,
    MoreVertical,
    Star,
    Grid,
    List,
    FilePlus,
    Activity
} from 'lucide-react';
import { motion } from 'framer-motion';

const Dashboard = () => {
    const { user } = useContext(AuthContext);
    const [boards, setBoards] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) {
            navigate("/login");
            return;
        }
        const fetchBoards = async () => {
            try {
                const res = await api.get("/api/boards");
                setBoards(res.data);
            } catch (err) {
                console.error("Error fetching boards:", err);
            }
        };
        fetchBoards();
    }, [user, navigate]);

    const handleCreate = async () => {
        if (!user) {
            alert("You must be logged in to create a board.");
            navigate("/login");
            return;
        }

        const title = "Untitled Board " + new Date().toLocaleTimeString();

        try {
            const res = await api.post("/api/boards", { title });
            setBoards((prev) => [res.data, ...prev]);
            navigate(`/board/${res.data._id}`);
        } catch (err) {
            console.error("Error creating board:", err);
            alert("Failed to create board.");
        }
    };

    const filteredBoards = boards.filter(board =>
        board.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <div className="min-h-screen bg-background text-foreground p-8">
            <div className="max-w-7xl mx-auto space-y-12">

                {/* Header Section */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                            Welcome back, {user?.name || 'Creator'}
                        </h1>
                        <p className="text-muted-foreground mt-2 text-lg">
                            Ready to create something amazing today?
                        </p>
                    </div>
                    <button
                        onClick={handleCreate}
                        className="group flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-all shadow-lg hover:shadow-primary/25"
                    >
                        <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                        <span className="font-medium">New Board</span>
                    </button>
                </header>

                {/* Stats & Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="p-6 rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-md transition-all"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
                                <Layout className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground font-medium">Total Boards</p>
                                <h3 className="text-2xl font-bold">{boards.length}</h3>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="p-6 rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-md transition-all"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-500/10 rounded-xl text-purple-500">
                                <Activity className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground font-medium">Recent Activity</p>
                                <h3 className="text-2xl font-bold">Just now</h3>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="p-6 rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-md transition-all"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500">
                                <Star className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground font-medium">Favorites</p>
                                <h3 className="text-2xl font-bold">0</h3>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Templates Section */}
                <section>
                    <div className="flex items-center gap-2 mb-6">
                        <FilePlus className="w-5 h-5 text-primary" />
                        <h2 className="text-xl font-semibold">Start with a template</h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {['Blank Canvas', 'Flowchart', 'Mind Map', 'Wireframe'].map((template, i) => (
                            <motion.div
                                key={template}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.1 * i }}
                                onClick={handleCreate}
                                className="group cursor-pointer p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition-all hover:-translate-y-1"
                            >
                                <div className={`aspect-video rounded-lg mb-3 ${i === 0 ? 'bg-gradient-to-br from-gray-800 to-gray-900' :
                                        i === 1 ? 'bg-gradient-to-br from-blue-900/50 to-indigo-900/50' :
                                            i === 2 ? 'bg-gradient-to-br from-emerald-900/50 to-teal-900/50' :
                                                'bg-gradient-to-br from-purple-900/50 to-pink-900/50'
                                    } flex items-center justify-center`}>
                                    {i === 0 && <Plus className="w-8 h-8 text-muted-foreground group-hover:text-foreground transition-colors" />}
                                </div>
                                <p className="font-medium text-sm group-hover:text-primary transition-colors">{template}</p>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* Main Content */}
                <section className="space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <Layout className="w-6 h-6" />
                            Your Boards
                        </h2>

                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search boards..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 rounded-lg bg-secondary/50 border border-transparent focus:border-primary focus:bg-background transition-all outline-none"
                                />
                            </div>
                            <div className="flex bg-secondary/50 rounded-lg p-1">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    <Grid className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    <List className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {filteredBoards.length === 0 ? (
                        <div className="text-center py-20 border-2 border-dashed border-border rounded-3xl">
                            <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Layout className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">No boards found</h3>
                            <p className="text-muted-foreground mb-6">Create your first board to get started</p>
                            <button
                                onClick={handleCreate}
                                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                            >
                                Create Board
                            </button>
                        </div>
                    ) : (
                        <motion.div
                            variants={container}
                            initial="hidden"
                            animate="show"
                            className={viewMode === 'grid'
                                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                                : "space-y-4"
                            }
                        >
                            {filteredBoards.map((board: any, index) => (
                                <Link to={`/board/${board._id}`} key={board._id}>
                                    <motion.div
                                        variants={item}
                                        className={`group relative bg-card border border-border rounded-xl overflow-hidden hover:border-primary/50 hover:shadow-lg transition-all ${viewMode === 'list' ? 'flex items-center p-4 gap-6' : 'flex flex-col h-full'
                                            }`}
                                    >
                                        {/* Thumbnail/Preview Area */}
                                        <div className={`${viewMode === 'list' ? 'w-16 h-16 rounded-lg' : 'h-40 w-full'
                                            } bg-gradient-to-br from-secondary to-secondary/50 group-hover:scale-105 transition-transform duration-500 relative overflow-hidden`}>
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                                                <span className="text-white text-xs font-medium px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm">
                                                    Open Board
                                                </span>
                                            </div>
                                            {/* Random decorative element */}
                                            <div className={`absolute -bottom-4 -right-4 w-24 h-24 rounded-full blur-2xl opacity-20 ${['bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-orange-500'][index % 4]
                                                }`} />
                                        </div>

                                        {/* Content Area */}
                                        <div className={`flex-1 ${viewMode === 'grid' ? 'p-5' : ''}`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-semibold text-lg truncate pr-4 group-hover:text-primary transition-colors">
                                                    {board.title}
                                                </h3>
                                                <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-secondary rounded transition-all">
                                                    <MoreVertical className="w-4 h-4 text-muted-foreground" />
                                                </button>
                                            </div>

                                            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-auto">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(board.createdAt).toLocaleDateString()}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Activity className="w-3 h-3" />
                                                    Edited 2m ago
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                </Link>
                            ))}
                        </motion.div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default Dashboard;
