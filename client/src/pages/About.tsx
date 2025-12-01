import { motion } from 'framer-motion';
import {
    Target,
    Eye,
    Heart,
    Users,
    Zap,
    Shield,
    Sparkles,
    TrendingUp,
    Award,
    Globe
} from 'lucide-react';

const About = () => {
    const stats = [
        { label: 'Active Users', value: '10K+', icon: Users },
        { label: 'Boards Created', value: '50K+', icon: TrendingUp },
        { label: 'Countries', value: '25+', icon: Globe },
        { label: 'Uptime', value: '99.9%', icon: Award }
    ];

    const values = [
        {
            icon: Target,
            title: 'Our Mission',
            description: 'To empower teams and individuals with the best collaborative whiteboard experience, making creativity and productivity accessible to everyone.',
            gradient: 'from-blue-400 to-cyan-400'
        },
        {
            icon: Eye,
            title: 'Our Vision',
            description: 'To become the world\'s most loved platform for visual collaboration, where ideas come to life and teams work seamlessly together.',
            gradient: 'from-purple-400 to-pink-400'
        },
        {
            icon: Heart,
            title: 'Our Values',
            description: 'We believe in simplicity, innovation, and putting our users first. Every feature we build is designed with your needs in mind.',
            gradient: 'from-orange-400 to-red-400'
        }
    ];

    const features = [
        {
            icon: Zap,
            title: 'Lightning Fast',
            description: 'Optimized performance for smooth, lag-free collaboration'
        },
        {
            icon: Shield,
            title: 'Secure & Private',
            description: 'Your data is encrypted and protected with enterprise-grade security'
        },
        {
            icon: Users,
            title: 'Team Focused',
            description: 'Built for teams of all sizes, from startups to enterprises'
        },
        {
            icon: Sparkles,
            title: 'Always Improving',
            description: 'Regular updates with new features based on user feedback'
        }
    ];

    const team = [
        {
            name: 'Alex Johnson',
            role: 'Founder & CEO',
            avatar: 'AJ',
            gradient: 'from-blue-400 to-purple-600'
        },
        {
            name: 'Sarah Chen',
            role: 'Head of Design',
            avatar: 'SC',
            gradient: 'from-purple-400 to-pink-600'
        },
        {
            name: 'Michael Brown',
            role: 'Lead Engineer',
            avatar: 'MB',
            gradient: 'from-cyan-400 to-blue-600'
        },
        {
            name: 'Emily Davis',
            role: 'Product Manager',
            avatar: 'ED',
            gradient: 'from-pink-400 to-red-600'
        }
    ];

    return (
        <div className="min-h-screen bg-background py-16 px-4">
            {/* Background Gradients */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 container mx-auto max-w-6xl">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-16"
                >
                    <div className="inline-flex items-center px-3 py-1 rounded-full border border-border bg-secondary/50 backdrop-blur-sm text-sm text-muted-foreground mb-6">
                        <Sparkles className="w-4 h-4 mr-2 text-yellow-400" />
                        About Uniboard
                    </div>
                    <h1 className="text-5xl md:text-6xl font-bold mb-6">
                        Building the Future of{' '}
                        <span className="bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
                            Collaboration
                        </span>
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                        Uniboard is more than just a whiteboard. It's a canvas for your ideas,
                        a space for your team, and a platform that grows with you.
                    </p>
                </motion.div>

                {/* Stats */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16"
                >
                    {stats.map((stat, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 + index * 0.1 }}
                            className="p-6 rounded-2xl bg-card border border-border text-center hover:border-primary/50 transition-colors"
                        >
                            <stat.icon className="w-8 h-8 mx-auto mb-3 text-primary" />
                            <div className="text-3xl font-bold mb-1">{stat.value}</div>
                            <div className="text-sm text-muted-foreground">{stat.label}</div>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Mission, Vision, Values */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="grid md:grid-cols-3 gap-6 mb-16"
                >
                    {values.map((value, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 + index * 0.1 }}
                            className="p-8 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all hover:scale-105"
                        >
                            <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${value.gradient} mb-4`}>
                                <value.icon className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-xl font-bold mb-3">{value.title}</h3>
                            <p className="text-muted-foreground leading-relaxed">{value.description}</p>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Story Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mb-16 p-12 rounded-3xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-border"
                >
                    <h2 className="text-3xl font-bold mb-6 text-center">Our Story</h2>
                    <div className="max-w-3xl mx-auto space-y-4 text-muted-foreground leading-relaxed">
                        <p>
                            Uniboard was born from a simple frustration: existing collaboration tools were either
                            too complex or too limited. We wanted something that just worked – intuitive enough
                            for anyone to use, yet powerful enough for professional teams.
                        </p>
                        <p>
                            In 2024, we set out to build the whiteboard we wished existed. A place where ideas
                            could flow freely, where teams could collaborate in real-time without friction, and
                            where creativity had no bounds.
                        </p>
                        <p>
                            Today, Uniboard is used by thousands of teams worldwide, from startups to enterprises,
                            helping them brainstorm, plan, and create together. But we're just getting started.
                        </p>
                    </div>
                </motion.div>

                {/* Features Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="mb-16"
                >
                    <h2 className="text-3xl font-bold text-center mb-12">
                        Why Choose{' '}
                        <span className="bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
                            Uniboard
                        </span>
                    </h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        {features.map((feature, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.7 + index * 0.1 }}
                                className="p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-colors"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="p-3 rounded-xl bg-gradient-to-br from-blue-400 to-purple-600">
                                        <feature.icon className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold mb-2">{feature.title}</h3>
                                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Team Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="mb-16"
                >
                    <h2 className="text-3xl font-bold text-center mb-12">Meet Our Team</h2>
                    <div className="grid md:grid-cols-4 gap-6">
                        {team.map((member, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.9 + index * 0.1 }}
                                className="text-center group"
                            >
                                <div className={`w-32 h-32 mx-auto mb-4 rounded-full bg-gradient-to-br ${member.gradient} flex items-center justify-center text-white text-2xl font-bold group-hover:scale-110 transition-transform`}>
                                    {member.avatar}
                                </div>
                                <h3 className="font-semibold mb-1">{member.name}</h3>
                                <p className="text-sm text-muted-foreground">{member.role}</p>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* CTA Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 }}
                    className="p-12 rounded-3xl bg-card border border-border text-center"
                >
                    <h2 className="text-3xl font-bold mb-4">Join Us on This Journey</h2>
                    <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                        We're constantly evolving and improving Uniboard based on feedback from our amazing community.
                        Be part of shaping the future of collaboration.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <a
                            href="/register"
                            className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
                        >
                            Get Started Free
                        </a>
                        <a
                            href="/contact"
                            className="px-8 py-3 bg-secondary text-foreground rounded-xl font-semibold hover:bg-secondary/80 transition-colors"
                        >
                            Contact Us
                        </a>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default About;
