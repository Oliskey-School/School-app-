import React from 'react';

const DashboardSkeletonLoader: React.FC<{ 
  type?: 'overview' | 'stats' | 'list' | 'chart';
  title?: string;
  showActions?: boolean;
}> = ({ type = 'overview', title, showActions = false }) => {
  return (
    <div className="p-4 lg:p-6 bg-gray-50 min-h-full animate-pulse">
      {type === 'overview' && (
        <>
          <div className="bg-gradient-to-br from-indigo-700 to-indigo-900 p-6 rounded-3xl mb-6">
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-32"></div>
              <div className="h-2 bg-gray-200 rounded w-24"></div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1,2,3,4].map((_, i) => (
                    <div key={i} className="bg-white p-4 rounded-3xl">
                      <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
                      <div className="h-2 bg-gray-200 rounded w-20"></div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="mt-8">
                <h2 className="text-xl font-bold text-gray-700 mb-3 px-1">
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                </h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-4">
                  {[1,2,3,4,5,6,7,8,9,10].map((_, i) => (
                    <div key={i} className="bg-white p-3 sm:p-4 rounded-xl">
                      <div className="flex flex-col items-center justify-center space-y-1">
                        <div className="h-6 w-6 bg-gray-200 rounded-full mb-1"></div>
                        <div className="h-2 bg-gray-200 rounded w-16"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Content Management Section */}
              <div className="mt-8">
                <h2 className="text-xl font-bold text-gray-700 mb-3 px-1">
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                </h2>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                  {[1,2,3,4,5,6,7,8].map((_, i) => (
                    <div key={i} className="bg-white p-3 sm:p-4 rounded-xl">
                      <div className="flex flex-col items-center justify-center space-y-1">
                        <div className="h-6 w-6 bg-gray-200 rounded-full mb-1"></div>
                        <div className="h-2 bg-gray-200 rounded w-16"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-4 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                    <div className="h-2 bg-gray-200 rounded w-8"></div>
                  </div>
                  <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                </div>
                <div className="mt-4">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-2 bg-gray-200 rounded w-3/4 mt-2"></div>
                </div>
              </div>
              
              <div>
                <h2 className="text-lg font-bold text-gray-700 mb-3 px-1">
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                </h2>
                <div className="space-y-3">
                  {[1,2,3].map((_, i) => (
                    <div key={i} className="bg-white p-4 rounded-xl shadow-sm">
                      <div className="flex items-center space-x-4">
                        <div className="h-4 w-4 bg-gray-200 rounded-full"></div>
                        <div className="flex-1 space-y-1">
                          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                        </div>
                        <div className="h-4 w-4 bg-gray-200 rounded-full"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h2 className="text-lg font-bold text-gray-700 mb-3 px-1">
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                </h2>
                <div className="bg-white p-4 rounded-2xl shadow-sm space-y-4">
                  {[1,2,3].map((_, i) => (
                    <div key={i} className="relative pl-12">
                      <div className="absolute left-4 top-2 w-0.5 h-full bg-gray-200"></div>
                      <div className="absolute left-0 top-0 w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-gray-100 ring-4 ring-gray-50">
                        <div className="h-6 w-6 bg-gray-200 rounded-full"></div>
                      </div>
                      <div className="text-sm">
                        <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
                        <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                  <div className="mt-2 text-sm w-full text-center font-semibold text-indigo-600">
                    <div className="h-3 bg-gray-200 rounded w-32"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      
      {type === 'stats' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1,2,3,4].map((_, i) => (
                  <div key={i} className="bg-white p-4 rounded-3xl">
                    <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
                    <div className="h-2 bg-gray-200 rounded w-20"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-4 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                  <div className="h-2 bg-gray-200 rounded w-8"></div>
                </div>
                <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
              </div>
              <div className="mt-4">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-2 bg-gray-200 rounded w-3/4 mt-2"></div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {type === 'list' && (
        <div className="space-y-4 w-full">
          {[1,2,3,4,5].map((_, i) => (
            <div key={i} className="flex items-center space-x-4 p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="rounded-full bg-gray-200 h-12 w-12"></div>
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                <div className="h-2 bg-gray-200 rounded w-1/2"></div>
              </div>
              <div className="h-4 w-4 bg-gray-200 rounded-full"></div>
            </div>
          ))}
        </div>
      )}
      
      {type === 'chart' && (
        <div className="bg-white p-4 rounded-xl shadow-sm h-96">
          <div className="h-32 bg-gray-100 rounded-xl mb-4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            <div className="h-2 bg-gray-200 rounded w-full"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardSkeletonLoader;