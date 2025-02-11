const { useState, useEffect } = React;
const e = React.createElement;

function MonitoringDashboard() {
    const [logs, setLogs] = useState([]);
    const [filteredLogs, setFilteredLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({
        timeRange: 'all',  // 'all', 'hour', 'day', 'week'
        model: '',         // model name filter
        query: '',         // query text filter
        status: 'all'      // 'all', 'success', 'error'
    });

    useEffect(() => {
        fetchLogs();
    }, []);

    // Apply filters whenever logs or filters change
    useEffect(() => {
        applyFilters();
    }, [logs, filters]);

    async function fetchLogs() {
        try {
            setLoading(true);
            const response = await fetch('http://localhost:3000/api/logs');
            if (!response.ok) {
                throw new Error('Failed to fetch logs');
            }
            const data = await response.json();
            setLogs(data.logs);
            setError(null);
        } catch (err) {
            console.error('Error fetching logs:', err);
            setError('Failed to load logs. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    function applyFilters() {
        let filtered = [...logs];

        // Time range filter
        if (filters.timeRange !== 'all') {
            const now = new Date();
            const cutoff = new Date();
            switch (filters.timeRange) {
                case 'hour':
                    cutoff.setHours(now.getHours() - 1);
                    break;
                case 'day':
                    cutoff.setDate(now.getDate() - 1);
                    break;
                case 'week':
                    cutoff.setDate(now.getDate() - 7);
                    break;
            }
            filtered = filtered.filter(log => new Date(log.timestamp) >= cutoff);
        }

        // Model filter
        if (filters.model) {
            filtered = filtered.filter(log => 
                log.model_name.toLowerCase().includes(filters.model.toLowerCase())
            );
        }

        // Query text filter
        if (filters.query) {
            filtered = filtered.filter(log => 
                log.user_query.toLowerCase().includes(filters.query.toLowerCase())
            );
        }

        // Status filter
        if (filters.status !== 'all') {
            filtered = filtered.filter(log => 
                filters.status === 'error' ? log.error_occurred : !log.error_occurred
            );
        }

        setFilteredLogs(filtered);
    }

    // Filter control component
    const FilterControls = () => {
        return e('div', { className: 'mb-6 space-y-4' }, [
            // Time Range Filter
            e('div', { key: 'time-filter', className: 'flex items-center space-x-4' }, [
                e('label', { className: 'text-sm font-medium text-gray-700' }, 'Time Range:'),
                e('select', {
                    value: filters.timeRange,
                    onChange: (e) => setFilters(prev => ({ ...prev, timeRange: e.target.value })),
                    className: 'rounded-md border-gray-300 shadow-sm focus:border-tn-navy focus:ring-tn-navy'
                }, [
                    e('option', { value: 'all' }, 'All Time'),
                    e('option', { value: 'hour' }, 'Last Hour'),
                    e('option', { value: 'day' }, 'Last 24 Hours'),
                    e('option', { value: 'week' }, 'Last Week')
                ])
            ]),

            // Search Filters Row
            e('div', { key: 'search-filters', className: 'flex space-x-4' }, [
                // Model Filter
                e('div', { className: 'flex-1' }, [
                    e('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Model:'),
                    e('input', {
                        type: 'text',
                        value: filters.model,
                        onChange: (e) => setFilters(prev => ({ ...prev, model: e.target.value })),
                        placeholder: 'Filter by model...',
                        className: 'w-full rounded-md border-gray-300 shadow-sm focus:border-tn-navy focus:ring-tn-navy'
                    })
                ]),

                // Query Filter
                e('div', { className: 'flex-1' }, [
                    e('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Query:'),
                    e('input', {
                        type: 'text',
                        value: filters.query,
                        onChange: (e) => setFilters(prev => ({ ...prev, query: e.target.value })),
                        placeholder: 'Search in queries...',
                        className: 'w-full rounded-md border-gray-300 shadow-sm focus:border-tn-navy focus:ring-tn-navy'
                    })
                ]),

                // Status Filter
                e('div', { className: 'flex-1' }, [
                    e('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Status:'),
                    e('select', {
                        value: filters.status,
                        onChange: (e) => setFilters(prev => ({ ...prev, status: e.target.value })),
                        className: 'w-full rounded-md border-gray-300 shadow-sm focus:border-tn-navy focus:ring-tn-navy'
                    }, [
                        e('option', { value: 'all' }, 'All Status'),
                        e('option', { value: 'success' }, 'Success'),
                        e('option', { value: 'error' }, 'Error')
                    ])
                ])
            ]),

            // Reset Filters Button
            e('div', { key: 'reset', className: 'flex justify-end' },
                e('button', {
                    onClick: () => setFilters({
                        timeRange: 'all',
                        model: '',
                        query: '',
                        status: 'all'
                    }),
                    className: 'text-sm text-gray-600 hover:text-tn-navy'
                }, 'Reset Filters')
            )
        ]);
    };

    if (loading && !logs.length) {
        return e('div', { className: 'flex justify-center items-center p-8' },
            e('div', { className: 'animate-spin rounded-full h-8 w-8 border-b-2 border-tn-navy' })
        );
    }

    if (error) {
        return e('div', { className: 'p-4 text-red-600 bg-red-50 rounded' }, [
            e('p', { key: 'error-message' }, error),
            e('button', {
                key: 'retry-button',
                onClick: fetchLogs,
                className: 'mt-2 text-sm text-red-600 hover:text-red-800 underline'
            }, 'Try Again')
        ]);
    }

    return e('div', { className: 'p-6' }, [
        // Header
        e('div', { 
            key: 'header',
            className: 'flex justify-between items-center mb-6' 
        }, [
            e('h2', { className: 'text-xl font-semibold text-tn-navy' }, 'System Logs'),
            e('button', {
                onClick: fetchLogs,
                className: 'px-4 py-2 bg-tn-navy text-white rounded hover:bg-opacity-90'
            }, 'Refresh')
        ]),

        // Filter Controls
        e(FilterControls, { key: 'filters' }),

        // Results Count
        e('div', {
            key: 'results-count',
            className: 'mb-4 text-sm text-gray-600'
        }, `Showing ${filteredLogs.length} of ${logs.length} logs`),

        // Table
        e('div', { key: 'table', className: 'overflow-x-auto' }, [
            e('table', { className: 'min-w-full divide-y divide-gray-200' }, [
                e('thead', { className: 'bg-gray-50' },
                    e('tr', {}, [
                        { id: 'time', label: 'Time' },
                        { id: 'model', label: 'Model' },
                        { id: 'query', label: 'Query' },
                        { id: 'response-time', label: 'Response Time' },
                        { id: 'status', label: 'Status' }
                    ].map(header =>
                        e('th', {
                            key: header.id,
                            className: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'
                        }, header.label)
                    ))
                ),
                e('tbody', { className: 'bg-white divide-y divide-gray-200' },
                    filteredLogs.length > 0 
                        ? filteredLogs.map(log =>
                            e('tr', { key: log.id, className: 'hover:bg-gray-50' }, [
                                e('td', { className: 'px-6 py-4 whitespace-nowrap text-sm text-gray-500' },
                                    new Date(log.timestamp).toLocaleString()
                                ),
                                e('td', { className: 'px-6 py-4 text-sm' }, log.model_name),
                                e('td', { className: 'px-6 py-4 text-sm' },
                                    e('div', { className: 'max-w-xs truncate' }, log.user_query)
                                ),
                                e('td', { className: 'px-6 py-4 text-sm' },
                                    `${log.response_time_ms}ms`
                                ),
                                e('td', { className: 'px-6 py-4 text-sm' },
                                    e('span', {
                                        className: `px-2 py-1 rounded-full text-xs font-medium ${
                                            log.error_occurred 
                                                ? 'bg-red-100 text-red-800' 
                                                : 'bg-green-100 text-green-800'
                                        }`
                                    }, log.error_occurred ? 'Error' : 'Success')
                                )
                            ])
                        )
                        : e('tr', {},
                            e('td', { 
                                colSpan: 5,
                                className: 'px-6 py-8 text-center text-gray-500'
                            }, 'No matching logs found')
                        )
                )
            ])
        ])
    ]);
}

// Make the component available globally
window.MonitoringDashboard = MonitoringDashboard;