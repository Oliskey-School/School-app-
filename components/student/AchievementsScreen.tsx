
import React from 'react';
import { mockBadges, mockCertificates, mockAwards } from '../../data';
import { CertificateIcon, AwardIcon } from '../../constants';

const AchievementsScreen: React.FC = () => {

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <main className="flex-grow p-4 space-y-6 overflow-y-auto">
                {/* Badges Section */}
                <div>
                    <h2 className="text-xl font-bold text-gray-800 mb-3">My Badges</h2>
                    <div className="grid grid-cols-3 gap-4">
                        {mockBadges.map(badge => {
                            const Icon = badge.icon;
                            return (
                                <div key={badge.id} className="bg-white p-4 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center space-y-2">
                                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${badge.color}`}>
                                        <Icon className="h-8 w-8" />
                                    </div>
                                    <p className="font-bold text-xs text-gray-700 leading-tight">{badge.name}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Certificates Section */}
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 mb-3">My Certificates</h2>
                        <div className="space-y-3">
                            {mockCertificates.map(cert => (
                                <div key={cert.id} className="bg-white p-4 rounded-xl shadow-sm flex items-center space-x-4">
                                    <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center bg-blue-100">
                                        <CertificateIcon className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div className="flex-grow">
                                        <p className="font-bold text-gray-800">{cert.name}</p>
                                        <p className="text-sm text-gray-500">Issued: {cert.issuedDate}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Awards Section */}
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 mb-3">My Awards</h2>
                        <div className="space-y-3">
                            {mockAwards.map(award => (
                                <div key={award.id} className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-yellow-400">
                                    <div className="flex items-center space-x-4">
                                        <div className="flex-shrink-0 text-yellow-500">
                                            <AwardIcon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-800">{award.name}</p>
                                            <p className="text-sm text-gray-500">{award.date}</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-2 pl-10">{award.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AchievementsScreen;