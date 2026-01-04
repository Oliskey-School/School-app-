import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { MapPin, Phone, Mail, Globe, Clock, Heart, Utensils, Briefcase, Scale, Users as UsersIcon, Brain, Home, HelpCircle } from 'lucide-react';

interface CommunityResource {
    id: number;
    resource_name: string;
    resource_category: string;
    description: string;
    address: string;
    lga: string;
    state: string;
    phone_number: string;
    email: string;
    website_url: string;
    operating_hours: string;
    eligibility_criteria: string;
    services_offered: string[];
    languages_spoken: string[];
    is_free: boolean;
    cost_details: string;
    verified: boolean;
}

const CommunityResourceDirectory: React.FC = () => {
    const [resources, setResources] = useState<CommunityResource[]>([]);
    const [filteredResources, setFilteredResources] = useState<CommunityResource[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedResource, setSelectedResource] = useState<CommunityResource | null>(null);
    const [loading, setLoading] = useState(true);

    const categories = [
        { name: 'All', icon: HelpCircle, color: 'bg-gray-500' },
        { name: 'Health', icon: Heart, color: 'bg-red-500' },
        { name: 'Food Support', icon: Utensils, color: 'bg-orange-500' },
        { name: 'Vocational Training', icon: Briefcase, color: 'bg-blue-500' },
        { name: 'Legal Aid', icon: Scale, color: 'bg-purple-500' },
        { name: 'Youth Programs', icon: UsersIcon, color: 'bg-green-500' },
        { name: 'Mental Health', icon: Brain, color: 'bg-pink-500' },
        { name: 'Emergency Shelter', icon: Home, color: 'bg-indigo-500' }
    ];

    useEffect(() => {
        fetchResources();
    }, []);

    useEffect(() => {
        filterResources();
    }, [selectedCategory, searchQuery, resources]);

    const fetchResources = async () => {
        try {
            const { data, error } = await supabase
                .from('community_resources')
                .select('*')
                .eq('is_active', true)
                .order('resource_name', { ascending: true });

            if (error) throw error;
            setResources(data || []);
            setFilteredResources(data || []);
        } catch (error: any) {
            console.error('Error fetching resources:', error);
        } finally {
            setLoading(false);
        }
    };

    const filterResources = () => {
        let filtered = resources;

        // Filter by category
        if (selectedCategory !== 'All') {
            filtered = filtered.filter(r => r.resource_category === selectedCategory);
        }

        // Filter by search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(r =>
                r.resource_name.toLowerCase().includes(query) ||
                r.description.toLowerCase().includes(query) ||
                r.lga.toLowerCase().includes(query) ||
                r.services_offered.some(s => s.toLowerCase().includes(query))
            );
        }

        setFilteredResources(filtered);
    };

    const getCategoryIcon = (category: string) => {
        const cat = categories.find(c => c.name === category);
        return cat ? cat.icon : HelpCircle;
    };

    const getCategoryColor = (category: string) => {
        const cat = categories.find(c => c.name === category);
        return cat ? cat.color : 'bg-gray-500';
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64"><div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div></div>;
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-600 to-green-600 rounded-xl p-6 text-white mb-6">
                <h1 className="text-3xl font-bold mb-2">🗺️ Community Resource Directory</h1>
                <p className="text-teal-100">Find support services near you - health, food, training & more</p>
            </div>

            {/* Search */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, location, or service..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                />
            </div>

            {/* Category Filters */}
            <div className="mb-6">
                <h2 className="text-lg font-bold text-gray-900 mb-3">Filter by Category</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                    {categories.map(category => {
                        const Icon = category.icon;
                        return (
                            <button
                                key={category.name}
                                onClick={() => setSelectedCategory(category.name)}
                                className={`p-4 rounded-xl transition-all ${selectedCategory === category.name
                                        ? `${category.color} text-white shadow-lg scale-105`
                                        : 'bg-white text-gray-700 hover:bg-gray-100 shadow-sm'
                                    }`}
                            >
                                <Icon className="h-6 w-6 mx-auto mb-2" />
                                <p className="text-xs font-semibold text-center">{category.name}</p>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Results Count */}
            <div className="mb-4">
                <p className="text-gray-600">
                    Showing <strong>{filteredResources.length}</strong> resource{filteredResources.length !== 1 ? 's' : ''}
                    {selectedCategory !== 'All' && ` in ${selectedCategory}`}
                </p>
            </div>

            {/* Resources Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredResources.length === 0 ? (
                    <div className="col-span-full bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
                        <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-lg">No resources found</p>
                        <p className="text-sm">Try a different search or category</p>
                    </div>
                ) : (
                    filteredResources.map(resource => {
                        const Icon = getCategoryIcon(resource.resource_category);
                        return (
                            <div
                                key={resource.id}
                                className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-shadow overflow-hidden cursor-pointer"
                                onClick={() => setSelectedResource(resource)}
                            >
                                <div className={`h-2 ${getCategoryColor(resource.resource_category)}`}></div>
                                <div className="p-6">
                                    <div className="flex items-start justify-between mb-3">
                                        <h3 className="text-lg font-bold text-gray-900 flex-1">{resource.resource_name}</h3>
                                        <div className={`p-2 rounded-lg ${getCategoryColor(resource.resource_category)} bg-opacity-10`}>
                                            <Icon className={`h-5 w-5 ${getCategoryColor(resource.resource_category).replace('bg-', 'text-')}`} />
                                        </div>
                                    </div>

                                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{resource.description}</p>

                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                                            <MapPin className="h-4 w-4 flex-shrink-0" />
                                            <span className="line-clamp-1">{resource.address}, {resource.lga}</span>
                                        </div>
                                        {resource.phone_number && (
                                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                                                <Phone className="h-4 w-4 flex-shrink-0" />
                                                <span>{resource.phone_number}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {resource.is_free && (
                                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                                                Free Service
                                            </span>
                                        )}
                                        {resource.verified && (
                                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                                                ✓ Verified
                                            </span>
                                        )}
                                    </div>

                                    <button className="w-full px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-semibold text-sm transition-colors">
                                        View Details
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Resource Detail Modal */}
            {selectedResource && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-xl max-w-2xl w-full my-8">
                        <div className={`h-2 ${getCategoryColor(selectedResource.resource_category)}`}></div>
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 mb-1">{selectedResource.resource_name}</h2>
                                    <p className="text-sm text-gray-600">{selectedResource.resource_category}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedResource(null)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <p className="text-gray-600 mb-6">{selectedResource.description}</p>

                            <div className="space-y-4 mb-6">
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                                        <MapPin className="h-5 w-5 mr-2 text-teal-600" />
                                        Location
                                    </h3>
                                    <p className="text-gray-700">{selectedResource.address}</p>
                                    <p className="text-sm text-gray-600">{selectedResource.lga}, {selectedResource.state}</p>
                                </div>

                                {selectedResource.phone_number && (
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                                            <Phone className="h-5 w-5 mr-2 text-teal-600" />
                                            Phone
                                        </h3>
                                        <a href={`tel:${selectedResource.phone_number}`} className="text-teal-600 hover:underline">
                                            {selectedResource.phone_number}
                                        </a>
                                    </div>
                                )}

                                {selectedResource.email && (
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                                            <Mail className="h-5 w-5 mr-2 text-teal-600" />
                                            Email
                                        </h3>
                                        <a href={`mailto:${selectedResource.email}`} className="text-teal-600 hover:underline">
                                            {selectedResource.email}
                                        </a>
                                    </div>
                                )}

                                {selectedResource.website_url && (
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                                            <Globe className="h-5 w-5 mr-2 text-teal-600" />
                                            Website
                                        </h3>
                                        <a href={selectedResource.website_url} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">
                                            {selectedResource.website_url}
                                        </a>
                                    </div>
                                )}

                                {selectedResource.operating_hours && (
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                                            <Clock className="h-5 w-5 mr-2 text-teal-600" />
                                            Operating Hours
                                        </h3>
                                        <p className="text-gray-700">{selectedResource.operating_hours}</p>
                                    </div>
                                )}

                                {selectedResource.services_offered && selectedResource.services_offered.length > 0 && (
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-2">Services Offered</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedResource.services_offered.map((service, index) => (
                                                <span key={index} className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm">
                                                    {service}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {selectedResource.languages_spoken && selectedResource.languages_spoken.length > 0 && (
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-2">Languages</h3>
                                        <p className="text-gray-700">{selectedResource.languages_spoken.join(', ')}</p>
                                    </div>
                                )}

                                {selectedResource.eligibility_criteria && (
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-2">Eligibility</h3>
                                        <p className="text-gray-700">{selectedResource.eligibility_criteria}</p>
                                    </div>
                                )}

                                {selectedResource.cost_details && !selectedResource.is_free && (
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-2">Cost</h3>
                                        <p className="text-gray-700">{selectedResource.cost_details}</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex space-x-3">
                                <button
                                    onClick={() => setSelectedResource(null)}
                                    className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
                                >
                                    Close
                                </button>
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedResource.resource_name + ' ' + selectedResource.address)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-semibold text-center"
                                >
                                    <MapPin className="h-5 w-5 inline mr-2" />
                                    Get Directions
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CommunityResourceDirectory;
