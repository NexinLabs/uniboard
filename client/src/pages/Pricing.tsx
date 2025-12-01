import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
    Check,
    Zap,
    Crown,
    Sparkles,
    Users,
    Cloud,
    Shield,
    Headphones
} from 'lucide-react';

const Pricing = () => {
    const plans = [
        {
            name: 'Hobby',
            price: 'Free',
            priceAmount: 0,
            description: 'Perfect for personal projects and learning',
            icon: Zap,
            gradient: 'from-blue-400 to-cyan-400',
            features: [
                '3 boards',
                'Basic drawing tools',
                'Export to PNG',
                'Community support',
                '100 MB storage',
                'Basic collaboration'
            ],
            cta: 'Get Started',
            popular: false
        },
        {
            name: 'Pro',
            price: '₹79',
            priceAmount: 79,
            description: 'For professionals and growing teams',
            icon: Crown,
            gradient: 'from-purple-400 to-pink-400',
            features: [
                'Unlimited boards',
                'Advanced drawing tools',
                'Export to PNG, SVG, JSON',
                'Priority support',
                '10 GB storage',
                'Real-time collaboration',
                'Custom templates',
                'Version history',
                'Team workspace',
                'Advanced permissions'
            ],
            cta: 'Upgrade to Pro',
            popular: true
        }
    ];

    const additionalFeatures = [
        {
            icon: Users,
            title: 'Team Collaboration',
            description: 'Work together in real-time with your team members'
        },
        {
            icon: Cloud,
            title: 'Cloud Storage',
            description: 'All your boards safely stored in the cloud'
        },
        {
            icon: Shield,
            title: 'Secure & Private',
            description: 'Enterprise-grade security for your data'
        },
        {
            icon: Headphones,
            title: '24/7 Support',
            description: 'Get help whenever you need it'
        }
    ];

    return (
        <div className="min-h-screen bg-background py-16 px-4">
            {/* Background Gradients */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 container mx-auto max-w-7xl">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-16"
                >
                    <div className="inline-flex items-center px-3 py-1 rounded-full border border-border bg-secondary/50 backdrop-blur-sm text-sm text-muted-foreground mb-6">
                        <Sparkles className="w-4 h-4 mr-2 text-yellow-400" />
                        Simple, transparent pricing
                    </div>
                    <h1 className="text-5xl md:text-6xl font-bold mb-6">
                        Choose Your{' '}
                        <span className="bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
                            Perfect Plan
                        </span>
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Start for free and upgrade as you grow. No hidden fees, cancel anytime.
                    </p>
                </motion.div>

                {/* Pricing Cards */}
                <div className="grid md:grid-cols-2 gap-8 mb-16 max-w-5xl mx-auto">
                    {plans.map((plan, index) => (
                        <motion.div
                            key={plan.name}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`relative rounded-3xl p-8 border transition-all duration-300 hover:scale-105 ${plan.popular
                                    ? 'bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/50 shadow-xl shadow-purple-500/20'
                                    : 'bg-card border-border hover:border-primary/50'
                                }`}
                        >
                            {plan.popular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold rounded-full">
                                    Most Popular
                                </div>
                            )}

                            <div className="mb-6">
                                <div className={`inline-flex p-3 rounded-2xl bg-gradient-to-br ${plan.gradient} mb-4`}>
                                    <plan.icon className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                                <p className="text-muted-foreground text-sm">{plan.description}</p>
                            </div>

                            <div className="mb-6">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-bold">{plan.price}</span>
                                    {plan.priceAmount > 0 && (
                                        <span className="text-muted-foreground">/month</span>
                                    )}
                                </div>
                            </div>

                            <Link
                                to={plan.priceAmount === 0 ? '/register' : '/register'}
                                className={`block w-full py-3 px-6 rounded-xl font-semibold text-center transition-all mb-6 ${plan.popular
                                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 shadow-lg hover:shadow-purple-500/50'
                                        : 'bg-secondary text-foreground hover:bg-secondary/80'
                                    }`}
                            >
                                {plan.cta}
                            </Link>

                            <div className="space-y-3">
                                {plan.features.map((feature, idx) => (
                                    <div key={idx} className="flex items-start gap-3">
                                        <div className={`p-1 rounded-full bg-gradient-to-br ${plan.gradient} mt-0.5`}>
                                            <Check className="w-3 h-3 text-white" />
                                        </div>
                                        <span className="text-sm">{feature}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Additional Features */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mb-16"
                >
                    <h2 className="text-3xl font-bold text-center mb-12">
                        Everything you need to{' '}
                        <span className="bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
                            create amazing boards
                        </span>
                    </h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {additionalFeatures.map((feature, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 + index * 0.1 }}
                                className="p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-colors"
                            >
                                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-400 to-purple-600 w-fit mb-4">
                                    <feature.icon className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="font-semibold mb-2">{feature.title}</h3>
                                <p className="text-sm text-muted-foreground">{feature.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* FAQ Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="max-w-3xl mx-auto"
                >
                    <h2 className="text-3xl font-bold text-center mb-12">
                        Frequently Asked Questions
                    </h2>
                    <div className="space-y-4">
                        {[
                            {
                                q: 'Can I switch plans later?',
                                a: 'Yes! You can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle.'
                            },
                            {
                                q: 'What payment methods do you accept?',
                                a: 'We accept all major credit cards, debit cards, and UPI payments for Indian customers.'
                            },
                            {
                                q: 'Is there a refund policy?',
                                a: 'Yes, we offer a 30-day money-back guarantee. If you\'re not satisfied, contact us for a full refund.'
                            },
                            {
                                q: 'Can I cancel my subscription?',
                                a: 'Absolutely. You can cancel your subscription at any time from your account settings. You\'ll retain access until the end of your billing period.'
                            }
                        ].map((faq, index) => (
                            <div
                                key={index}
                                className="p-6 rounded-2xl bg-card border border-border"
                            >
                                <h3 className="font-semibold mb-2">{faq.q}</h3>
                                <p className="text-sm text-muted-foreground">{faq.a}</p>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* CTA Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="mt-16 p-12 rounded-3xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-border text-center"
                >
                    <h2 className="text-3xl font-bold mb-4">
                        Still have questions?
                    </h2>
                    <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                        Our team is here to help. Get in touch and we'll respond as soon as possible.
                    </p>
                    <Link
                        to="/contact"
                        className="inline-flex items-center justify-center px-8 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
                    >
                        Contact Us
                    </Link>
                </motion.div>
            </div>
        </div>
    );
};

export default Pricing;
