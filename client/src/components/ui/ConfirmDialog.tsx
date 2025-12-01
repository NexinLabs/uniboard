import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Info } from 'lucide-react';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm?: () => void;
    title: string;
    message: string;
    type?: 'danger' | 'info' | 'warning';
    confirmText?: string;
    cancelText?: string;
    showCancel?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    type = 'danger',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    showCancel = true
}) => {
    // Close on escape key
    React.useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    const getIcon = () => {
        switch (type) {
            case 'danger':
                return <AlertTriangle className="w-6 h-6 text-red-500" />;
            case 'warning':
                return <AlertTriangle className="w-6 h-6 text-amber-500" />;
            case 'info':
            default:
                return <Info className="w-6 h-6 text-blue-500" />;
        }
    };

    const getConfirmButtonClass = () => {
        switch (type) {
            case 'danger':
                return 'bg-red-500 hover:bg-red-600 focus:ring-red-500';
            case 'warning':
                return 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-500';
            case 'info':
            default:
                return 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500';
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Dialog */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", duration: 0.3 }}
                        className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-10"
                    >
                        <div className="p-6">
                            <div className="flex items-start gap-4">
                                <div className={`p-3 rounded-full ${type === 'danger' ? 'bg-red-500/10' :
                                    type === 'warning' ? 'bg-amber-500/10' : 'bg-blue-500/10'
                                    }`}>
                                    {getIcon()}
                                </div>
                                <div className="flex-1 pt-1">
                                    <h3 className="text-lg font-semibold text-foreground mb-2">
                                        {title}
                                    </h3>
                                    <p className="text-muted-foreground text-sm leading-relaxed">
                                        {message}
                                    </p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="text-muted-foreground hover:text-foreground transition-colors p-1 hover:bg-secondary rounded-lg"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="bg-secondary/30 px-6 py-4 flex items-center justify-end gap-3 border-t border-border/50">
                            {showCancel && (
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 text-sm font-medium text-foreground bg-transparent hover:bg-secondary rounded-lg transition-colors"
                                >
                                    {cancelText}
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    if (onConfirm) onConfirm();
                                    onClose();
                                }}
                                className={`px-4 py-2 text-sm font-medium text-white rounded-lg shadow-lg hover:shadow-xl transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background flex items-center gap-2 ${getConfirmButtonClass()}`}
                            >
                                {type === 'danger' && <Trash2Icon className="w-4 h-4" />}
                                {confirmText}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

// Helper component for the icon to avoid circular dependency or import issues if not needed elsewhere
const Trash2Icon = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M3 6h18"></path>
        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
        <line x1="10" y1="11" x2="10" y2="17"></line>
        <line x1="14" y1="11" x2="14" y2="17"></line>
    </svg>
);

export default ConfirmDialog;
