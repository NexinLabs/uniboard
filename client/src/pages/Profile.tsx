import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
    User,
    Mail,
    MapPin,
    Calendar,
    Camera,
    Save,
    Loader2,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';
import axios from 'axios';
import { appConfig } from '../config';

interface UserProfile {
    _id: string;
    username: string;
    email: string;
    displayName: string;
    bio: string;
    avatar: string;
    location: string;
    createdAt: string;
}

const Profile = () => {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        displayName: '',
        bio: '',
        location: ''
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${appConfig.API_URL}/api/users/me`, {
                headers: { token: `Bearer ${token}` }
            });
            setProfile(res.data);
            setFormData({
                displayName: res.data.displayName || '',
                bio: res.data.bio || '',
                location: res.data.location || ''
            });
        } catch (err) {
            console.error('Error fetching profile:', err);
            showMessage('error', 'Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.put(
                `${appConfig.API_URL}/api/users/profile`,
                formData,
                { headers: { token: `Bearer ${token}` } }
            );
            setProfile(res.data);
            showMessage('success', 'Profile updated successfully!');
        } catch (err) {
            console.error('Error updating profile:', err);
            showMessage('error', 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file size (512KB max)
        if (file.size > 512 * 1024) {
            showMessage('error', 'File size must be less than 512KB');
            return;
        }

        // Validate file type
        if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
            showMessage('error', 'Only JPG and PNG files are allowed');
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('avatar', file);

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(
                `${appConfig.API_URL}/api/users/avatar`,
                formData,
                {
                    headers: {
                        token: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );
            setProfile(res.data.user);
            showMessage('success', 'Avatar updated successfully!');
        } catch (err) {
            console.error('Error uploading avatar:', err);
            showMessage('error', 'Failed to upload avatar');
        } finally {
            setUploading(false);
        }
    };

    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 5000);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-muted-foreground">Failed to load profile</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background py-12 px-4">
            {/* Background Gradients */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 container mx-auto max-w-4xl">
                {/* Message Alert */}
                {message && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`mb-6 p-4 rounded-xl border flex items-center gap-3 ${message.type === 'success'
                                ? 'bg-green-500/10 border-green-500/50 text-green-500'
                                : 'bg-red-500/10 border-red-500/50 text-red-500'
                            }`}
                    >
                        {message.type === 'success' ? (
                            <CheckCircle2 className="w-5 h-5" />
                        ) : (
                            <AlertCircle className="w-5 h-5" />
                        )}
                        <p>{message.text}</p>
                    </motion.div>
                )}

                {/* Profile Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card border border-border rounded-2xl p-8 mb-6"
                >
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        {/* Avatar */}
                        <div className="relative group">
                            <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-white text-4xl font-bold">
                                {profile.avatar ? (
                                    <img
                                        src={profile.avatar}
                                        alt={profile.username}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    profile.username.charAt(0).toUpperCase()
                                )}
                            </div>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="absolute bottom-0 right-0 p-3 bg-primary text-primary-foreground rounded-full hover:opacity-90 transition-opacity shadow-lg disabled:opacity-50"
                            >
                                {uploading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Camera className="w-5 h-5" />
                                )}
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/jpg,image/png"
                                onChange={handleAvatarUpload}
                                className="hidden"
                            />
                        </div>

                        {/* User Info */}
                        <div className="flex-1 text-center md:text-left">
                            <h1 className="text-3xl font-bold mb-2">
                                {profile.displayName || profile.username}
                            </h1>
                            <div className="flex flex-col md:flex-row gap-4 text-muted-foreground">
                                <div className="flex items-center gap-2 justify-center md:justify-start">
                                    <User className="w-4 h-4" />
                                    <span className="text-sm">@{profile.username}</span>
                                </div>
                                <div className="flex items-center gap-2 justify-center md:justify-start">
                                    <Mail className="w-4 h-4" />
                                    <span className="text-sm">{profile.email}</span>
                                </div>
                                {profile.location && (
                                    <div className="flex items-center gap-2 justify-center md:justify-start">
                                        <MapPin className="w-4 h-4" />
                                        <span className="text-sm">{profile.location}</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2 mt-3 text-muted-foreground justify-center md:justify-start">
                                <Calendar className="w-4 h-4" />
                                <span className="text-sm">
                                    Joined {new Date(profile.createdAt).toLocaleDateString('en-US', {
                                        month: 'long',
                                        year: 'numeric'
                                    })}
                                </span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Edit Profile Form */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-card border border-border rounded-2xl p-8"
                >
                    <h2 className="text-2xl font-bold mb-6">Edit Profile</h2>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="displayName" className="block text-sm font-medium mb-2">
                                Display Name
                            </label>
                            <input
                                type="text"
                                id="displayName"
                                name="displayName"
                                value={formData.displayName}
                                onChange={handleInputChange}
                                placeholder="Your display name"
                                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                            />
                        </div>

                        <div>
                            <label htmlFor="location" className="block text-sm font-medium mb-2">
                                Location
                            </label>
                            <input
                                type="text"
                                id="location"
                                name="location"
                                value={formData.location}
                                onChange={handleInputChange}
                                placeholder="Your location"
                                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                            />
                        </div>

                        <div>
                            <label htmlFor="bio" className="block text-sm font-medium mb-2">
                                Bio
                            </label>
                            <textarea
                                id="bio"
                                name="bio"
                                value={formData.bio}
                                onChange={handleInputChange}
                                placeholder="Tell us about yourself..."
                                rows={4}
                                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full md:w-auto px-8 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </form>
                </motion.div>

                {/* Additional Info */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mt-6 p-4 bg-blue-500/10 border border-blue-500/50 rounded-xl"
                >
                    <p className="text-sm text-blue-400">
                        <strong>Note:</strong> Avatar images must be JPG or PNG format and less than 512KB in size.
                    </p>
                </motion.div>
            </div>
        </div>
    );
};

export default Profile;
