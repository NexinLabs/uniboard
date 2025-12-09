import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Mail,
    MessageSquare,
    Send,
    Loader2,
    CheckCircle2,
    Clock
} from 'lucide-react';

const Contact = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000));

        setLoading(false);
        setSubmitted(true);
        setFormData({ name: '', email: '', subject: '', message: '' });

        setTimeout(() => setSubmitted(false), 5000);
    };

    const contactInfo = [
        {
            icon: Mail,
            title: 'Email',
            content: 'support@uniboard.tech',
            link: 'mailto:support@uniboard.tech'
        },
        // {
        //     icon: Phone,
        //     title: 'Phone',
        //     content: '+91 1234567890',
        //     link: 'tel:+911234567890'
        // },
        // {
        //     icon: MapPin,
        //     title: 'Location',
        //     content: 'Kolkata, India',
        //     link: null
        // },
        {
            icon: Clock,
            title: 'Working Hours',
            content: 'Mon-Fri: 9AM - 6PM IST',
            link: null
        }
    ];

    return (
        <div className="min-h-screen bg-background py-16 px-4">
            {/* Background Gradients */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 container mx-auto max-w-6xl">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-16"
                >
                    <div className="inline-flex items-center px-3 py-1 rounded-full border border-border bg-secondary/50 backdrop-blur-sm text-sm text-muted-foreground mb-6">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Get in touch
                    </div>
                    <h1 className="text-5xl md:text-6xl font-bold mb-6">
                        We'd Love to{' '}
                        <span className="bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
                            Hear From You
                        </span>
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Have a question or feedback? Send us a message and we'll respond as soon as possible.
                    </p>
                </motion.div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Contact Form */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="lg:col-span-2"
                    >
                        <div className="bg-card border border-border rounded-2xl p-8">
                            <h2 className="text-2xl font-bold mb-6">Send us a message</h2>

                            {submitted && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mb-6 p-4 bg-green-500/10 border border-green-500/50 rounded-xl flex items-center gap-3 text-green-500"
                                >
                                    <CheckCircle2 className="w-5 h-5" />
                                    <p>Thank you! Your message has been sent successfully.</p>
                                </motion.div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <label htmlFor="name" className="block text-sm font-medium mb-2">
                                            Name
                                        </label>
                                        <input
                                            type="text"
                                            id="name"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            required
                                            placeholder="Your name"
                                            className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium mb-2">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            id="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            required
                                            placeholder="your@email.com"
                                            className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="subject" className="block text-sm font-medium mb-2">
                                        Subject
                                    </label>
                                    <input
                                        type="text"
                                        id="subject"
                                        name="subject"
                                        value={formData.subject}
                                        onChange={handleChange}
                                        required
                                        placeholder="How can we help?"
                                        className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="message" className="block text-sm font-medium mb-2">
                                        Message
                                    </label>
                                    <textarea
                                        id="message"
                                        name="message"
                                        value={formData.message}
                                        onChange={handleChange}
                                        required
                                        placeholder="Tell us more about your inquiry..."
                                        rows={6}
                                        className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full md:w-auto px-8 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-5 h-5" />
                                            Send Message
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </motion.div>

                    {/* Contact Info */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="space-y-6"
                    >
                        <div className="bg-card border border-border rounded-2xl p-8">
                            <h2 className="text-2xl font-bold mb-6">Contact Information</h2>
                            <div className="space-y-6">
                                {contactInfo.map((info, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 + index * 0.1 }}
                                        className="flex items-start gap-4"
                                    >
                                        <div className="p-3 rounded-xl bg-gradient-to-br from-blue-400 to-purple-600">
                                            <info.icon className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold mb-1">{info.title}</h3>
                                            {info.link ? (
                                                <a
                                                    href={info.link}
                                                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                                                >
                                                    {info.content}
                                                </a>
                                            ) : (
                                                <p className="text-sm text-muted-foreground">{info.content}</p>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        {/* Quick Links */}
                        <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-border rounded-2xl p-8">
                            <h3 className="font-semibold mb-4">Quick Links</h3>
                            <div className="space-y-3">
                                <a href="#" className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                                    Documentation
                                </a>
                                <a href="#" className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                                    Help Center
                                </a>
                                <a href="#" className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                                    Community Forum
                                </a>
                                <a href="#" className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                                    Status Page
                                </a>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Map or Additional Info */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mt-12 p-8 bg-card border border-border rounded-2xl text-center"
                >
                    <h3 className="text-xl font-bold mb-3">Looking for support?</h3>
                    <p className="text-muted-foreground mb-4">
                        Check out our comprehensive documentation and help center for instant answers to common questions.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <a
                            href="#"
                            className="px-6 py-3 bg-secondary text-foreground rounded-xl font-semibold hover:bg-secondary/80 transition-colors"
                        >
                            View Documentation
                        </a>
                        <a
                            href="#"
                            className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
                        >
                            Visit Help Center
                        </a>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Contact;
