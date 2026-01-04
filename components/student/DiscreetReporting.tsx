import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface Request {
    id: number;
    request_type: string;
    quantity_needed: number;
    requested_at: string;
    fulfilled: boolean;
    pickup_location: string;
}

const DiscreetReporting: React.FC = () => {
    const [requests, setRequests] = useState<Request[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        request_type: 'Pads',
        quantity_needed: 1,
        notes: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const locations = ['Nurse Office', 'Female Restroom', 'Counselor Office'];
            const randomLocation = locations[Math.floor(Math.random() * locations.length)];

            const { error } = await supabase.from('menstrual_support_requests').insert({
                ...formData,
                is_anonymous: true,
                pickup_location: randomLocation
            });

            if (error) throw error;

            toast.success(`Request submitted! Pick up from: ${randomLocation}`);
            setShowForm(false);
            setFormData({ request_type: 'Pads', quantity_needed: 1, notes: '' });
        } catch (error: any) {
            toast.error('Failed to submit request');
        }
    };

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Discreet Support Request</h2>

                <div className="bg-pink-50 border border-pink-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-pink-800">
                        <strong>Your privacy matters:</strong> All requests are completely anonymous.
                        You'll receive a pickup location where you can collect items discreetly.
                    </p>
                </div>

                {!showForm ? (
                    <button
                        onClick={() => setShowForm(true)}
                        className="w-full px-4 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors font-bold"
                    >
                        Request Support
                    </button>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                What do you need? *
                            </label>
                            <select
                                value={formData.request_type}
                                onChange={(e) => setFormData({ ...formData, request_type: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                            >
                                <option>Pads</option>
                                <option>Tampons</option>
                                <option>Pain Relief</option>
                                <option>Privacy Space</option>
                                <option>Clean Clothes</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Quantity
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="10"
                                value={formData.quantity_needed}
                                onChange={(e) => setFormData({ ...formData, quantity_needed: Number(e.target.value) })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                            />
                        </div>

                        <div className="flex space-x-3">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="flex-1 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 font-medium"
                            >
                                Submit Request
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default DiscreetReporting;
