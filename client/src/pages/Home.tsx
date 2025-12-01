import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    PenTool,
    Users,
    Zap,
    Layout,
    Download,
    ChevronRight,
    Layers
} from 'lucide-react';

const Home = () => {
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.5
            }
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground overflow-hidden selection:bg-primary selection:text-primary-foreground">
            {/* Background Gradients */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 container mx-auto px-4 py-16 md:py-24">
                {/* Hero Section */}
                <motion.div
                    className="flex flex-col items-center justify-center text-center mb-24"
                    initial="hidden"
                    animate="visible"
                    variants={containerVariants}
                >
                    <motion.div variants={itemVariants} className="mb-6 inline-flex items-center px-3 py-1 rounded-full border border-border bg-secondary/50 backdrop-blur-sm text-sm text-muted-foreground">
                        <span className="flex h-2 w-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
                        v1.0 is now live
                    </motion.div>

                    <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-bold mb-8 tracking-tight">
                        Collaborate <br className="hidden md:block" />
                        <span className="bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
                            Without Limits
                        </span>
                    </motion.h1>

                    <motion.p variants={itemVariants} className="text-xl text-muted-foreground mb-10 max-w-2xl leading-relaxed">
                        The ultimate collaborative whiteboard for developers and designers.
                        Sketch, plan, and share your ideas in real-time with an infinite canvas.
                    </motion.p>

                    <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                        <Link to="/register" className="group relative px-8 py-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-all shadow-lg hover:shadow-primary/25 flex items-center justify-center gap-2">
                            Get Started Free
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <Link to="/login" className="px-8 py-4 bg-secondary text-secondary-foreground rounded-xl font-semibold hover:bg-secondary/80 transition-colors border border-border flex items-center justify-center">
                            Sign In
                        </Link>
                    </motion.div>
                </motion.div>

                {/* Features Grid */}
                <motion.div
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-24"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={containerVariants}
                >
                    <FeatureCard
                        icon={<Users className="w-6 h-6 text-blue-400" />}
                        title="Real-time Collaboration"
                        description="Work together with your team in real-time. See changes instantly as they happen."
                    />
                    <FeatureCard
                        icon={<Layout className="w-6 h-6 text-purple-400" />}
                        title="Infinite Canvas"
                        description="Never run out of space. Our infinite canvas lets your ideas grow without boundaries."
                    />
                    <FeatureCard
                        icon={<PenTool className="w-6 h-6 text-pink-400" />}
                        title="Vector Drawing"
                        description="Crisp, scalable vector drawings that look great at any zoom level."
                    />
                    <FeatureCard
                        icon={<Zap className="w-6 h-6 text-yellow-400" />}
                        title="Lightning Fast"
                        description="Built for performance with optimized rendering for smooth interactions."
                    />
                    <FeatureCard
                        icon={<Layers className="w-6 h-6 text-cyan-400" />}
                        title="Smart Layers"
                        description="Organize your content with an intuitive layering system."
                    />
                    <FeatureCard
                        icon={<Download className="w-6 h-6 text-green-400" />}
                        title="Easy Export"
                        description="Export your boards to PNG, SVG, or JSON to share with anyone."
                    />
                </motion.div>

                {/* Bottom CTA */}
                <motion.div
                    className="relative rounded-3xl overflow-hidden border border-border bg-card p-12 text-center"
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7 }}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5" />
                    <div className="relative z-10">
                        <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to start creating?</h2>
                        <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                            Join thousands of developers and designers who use Uniboard to bring their ideas to life.
                        </p>
                        <Link to="/register" className="inline-flex items-center justify-center px-8 py-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-all shadow-lg hover:shadow-primary/25">
                            Create Your First Board
                        </Link>
                    </div>
                </motion.div>

                {/* Footer */}
                <footer className="mt-24 pt-8 border-t border-border text-center text-muted-foreground text-sm">
                    <p>&copy; {new Date().getFullYear()} Uniboard. All rights reserved.</p>
                </footer>
            </div>
        </div>
    );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => {
    return (
        <motion.div
            variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 }
            }}
            className="p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-colors group"
        >
            <div className="mb-4 p-3 rounded-xl bg-secondary/50 w-fit group-hover:scale-110 transition-transform duration-300">
                {icon}
            </div>
            <h3 className="text-xl font-semibold mb-2">{title}</h3>
            <p className="text-muted-foreground leading-relaxed">
                {description}
            </p>
        </motion.div>
    );
};

export default Home;
