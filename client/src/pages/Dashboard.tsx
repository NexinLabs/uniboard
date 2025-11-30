import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const Dashboard = () => {
    const { user } = useContext(AuthContext);
    const [boards, setBoards] = useState<any[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) {
            navigate("/login");
            return;
        }
        const fetchBoards = async () => {
            try {
                const res = await axios.get("http://localhost:5000/api/boards", {
                    headers: { token: "Bearer " + user.token },
                });
                setBoards(res.data);
            } catch (err) {
                console.error("Error fetching boards:", err);
            }
        };
        fetchBoards();
    }, [user, navigate]);

    const handleCreate = async () => {
        console.log("New Board button clicked");
        if (!user) {
            console.log("User is not logged in");
            alert("You must be logged in to create a board.");
            navigate("/login");
            return;
        }

        // Use a default title instead of prompt to avoid browser blocking issues
        const title = "Untitled Board " + new Date().toLocaleTimeString();

        try {
            console.log("Sending create request...");
            const res = await axios.post("http://localhost:5000/api/boards", { title }, {
                headers: { token: "Bearer " + user.token },
            });
            console.log("Board created:", res.data);
            setBoards((prev) => [res.data, ...prev]);
            navigate(`/board/${res.data._id}`);
        } catch (err) {
            console.error("Error creating board:", err);
            alert("Failed to create board. Check console for details.");
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold">My Boards</h1>
                <button
                    onClick={handleCreate}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity"
                >
                    + New Board
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {boards.map((board: any) => (
                    <Link to={`/board/${board._id}`} key={board._id}>
                        <div className="p-6 bg-card border border-border rounded-lg hover:border-primary transition-colors cursor-pointer h-32 flex flex-col justify-between">
                            <h3 className="text-xl font-semibold mb-2 truncate">{board.title}</h3>
                            <p className="text-sm text-muted-foreground">
                                {new Date(board.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};
export default Dashboard;
