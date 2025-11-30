import { useContext, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

const Board = () => {
    const { id } = useParams();
    const { user } = useContext(AuthContext);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [elements, setElements] = useState<any[]>([]);
    const [startPos, setStartPos] = useState<{ x: number, y: number } | null>(null);
    const [currentPos, setCurrentPos] = useState<{ x: number, y: number } | null>(null);

    useEffect(() => {
        const fetchBoard = async () => {
            if (!user) return;
            try {
                const res = await axios.get(`http://localhost:5000/api/boards/${id}`, {
                    headers: { token: "Bearer " + user.token },
                });
                setElements(res.data.elements || []);
            } catch (err) {
                console.log(err);
            }
        };
        fetchBoard();
    }, [id, user]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw saved elements
        elements.forEach(el => {
            if (el.type === 'rect') {
                ctx.strokeStyle = 'white';
                ctx.strokeRect(el.x, el.y, el.w, el.h);
            }
        });

        // Draw current drawing element
        if (isDrawing && startPos && currentPos) {
            const w = currentPos.x - startPos.x;
            const h = currentPos.y - startPos.y;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.strokeRect(startPos.x, startPos.y, w, h);
        }
    }, [elements, isDrawing, startPos, currentPos]);

    const startDrawing = (e: React.MouseEvent) => {
        setIsDrawing(true);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setStartPos({ x, y });
        setCurrentPos({ x, y });
    };

    const draw = (e: React.MouseEvent) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setCurrentPos({ x, y });
    };

    const stopDrawing = async () => {
        if (!isDrawing || !startPos || !currentPos || !user) return;
        setIsDrawing(false);

        const w = currentPos.x - startPos.x;
        const h = currentPos.y - startPos.y;

        // Don't add if too small
        if (Math.abs(w) < 5 || Math.abs(h) < 5) return;

        const newElement = { type: 'rect', x: startPos.x, y: startPos.y, w, h };
        const newElements = [...elements, newElement];
        setElements(newElements);
        setStartPos(null);
        setCurrentPos(null);

        try {
            await axios.put(`http://localhost:5000/api/boards/${id}`, { elements: newElements }, {
                headers: { token: "Bearer " + user.token },
            });
        } catch (err) {
            console.log(err);
        }
    };

    return (
        <div className="h-[calc(100vh-80px)] bg-gray-950 rounded-lg border border-border relative overflow-hidden">
            <div className="absolute top-4 left-4 bg-card p-2 rounded border border-border z-10 flex gap-2">
                <h2 className="font-semibold mr-4">Board: {id}</h2>
                <div className="text-xs text-muted-foreground">Drag to draw rectangles</div>
            </div>
            <canvas
                ref={canvasRef}
                width={window.innerWidth}
                height={window.innerHeight}
                className="cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
            />
        </div>
    );
};
export default Board;
