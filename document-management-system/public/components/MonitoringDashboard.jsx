const { useState, useEffect, useCallback } = React;
const e = React.createElement;

function MonitoringDashboard() {
    const [logs, setLogs] = useState([]);
    const [filteredLogs, setFilteredLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showColumnSelector, setShowColumnSelector] = useState(false);

    // Define all possible columns
    const allColumns = [
        { id: 'timestamp', label: 'Time', show: true },
        { id: 'model_name', label: 'Model', show: true },
        { id: 'user_query', label: 'Query', show: true },
        { id: 'response_time_ms', label: 'Response Time', show: true },
        { id: 'error_occurred', label: 'Status', show: true },
        { id: 'token_count', label: 'Tokens', show: false },
        { id: 'error_message', label: 'Error Details', show: false }
    ];

    const [visibleColumns, setVisibleColumns] = useState(allColumns);
    const [filters, setFilters] = useState({
        timeRange: 'all',
        model: '',
        query: '',
        status: 'all'
    });

    const fetchLogs = async () => {
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
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const applyFilters = useCallback(() => {
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

        if (filters.model) {
            filtered = filtered.filter(log => 
                log.model_name.toLowerCase().includes(filters.model.toLowerCase())
            );
        }

        if (filters.query) {
            filtered = filtered.filter(log => 
                log.user_query.toLowerCase().includes(filters.query.toLowerCase())
            );
        }

        if (filters.status !== 'all') {
            filtered = filtered.filter(log => 
                filters.status === 'error' ? log.error_occurred : !log.error_occurred
            );
        }

        setFilteredLogs(filtered);
    }, [logs, filters]);

    useEffect(() => {
        applyFilters();
    }, [applyFilters]);

    // Separate Filter Controls Component
    const FilterControls = ({ filters, onFilterChange, onReset }) => {
        // Handle individual filter changes
        const handleChange = (field, value) => {
            onFilterChange({ ...filters, [field]: value });
        };

        return e('div', { className: 'mb-6 space-y-4' }, [
            // Time Range Filter
            e('div', { key: 'time-filter', className: 'flex items-center space-x-4' }, [
                e('label', { className: 'text-sm font-medium text-gray-700' }, 'Time Range:'),
                e('select', {
                    value: filters.timeRange,
                    onChange: (e) => handleChange('timeRange', e.target.value),
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
                        onChange: (e) => handleChange('model', e.target.value),
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
                        onChange: (e) => handleChange('query', e.target.value),
                        placeholder: 'Search in queries...',
                        className: 'w-full rounded-md border-gray-300 shadow-sm focus:border-tn-navy focus:ring-tn-navy'
                    })
                ]),

                // Status Filter
                e('div', { className: 'flex-1' }, [
                    e('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Status:'),
                    e('select', {
                        value: filters.status,
                        onChange: (e) => handleChange('status', e.target.value),
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
                    onClick: onReset,
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

    const resetFilters = () => {
        setFilters({
            timeRange: 'all',
            model: '',
            query: '',
            status: 'all'
        });
    };

    return e('div', { className: 'p-6' }, [
        // Header with Column Selector and Export
        e('div', { 
            key: 'header',
            className: 'flex justify-between items-center mb-6' 
        }, [
            e('h2', { className: 'text-xl font-semibold text-tn-navy' }, 'System Logs'),
            e('div', { className: 'flex space-x-4' }, [
                // Export Button
                e('button', {
                    onClick: () => {
                        // Create CSV content from filtered logs using visible columns
                        const headers = visibleColumns
                            .filter(col => col.show)
                            .map(col => col.label);
                        
                        const csvContent = [
                            headers.join(','),
                            ...filteredLogs.map(log => 
                                visibleColumns
                                    .filter(col => col.show)
                                    .map(col => {
                                        let value = '';
                                        switch (col.id) {
                                            case 'timestamp':
                                                value = new Date(log.timestamp).toLocaleString();
                                                break;
                                            case 'model_name':
                                                value = log.model_name;
                                                break;
                                            case 'user_query':
                                                value = log.user_query;
                                                break;
                                            case 'response_time_ms':
                                                value = log.response_time_ms;
                                                break;
                                            case 'token_count':
                                                value = log.token_count || '';
                                                break;
                                            case 'error_occurred':
                                                value = log.error_occurred ? 'Error' : 'Success';
                                                break;
                                            case 'error_message':
                                                value = log.error_message || '';
                                                break;
                                            default:
                                                value = '';
                                        }
                                        // Escape quotes and wrap in quotes if contains comma
                                        value = String(value).replace(/"/g, '""');
                                        if (value.includes(',')) {
                                            value = `"${value}"`;
                                        }
                                        return value;
                                    })
                                    .join(',')
                            )
                        ].join('\n');

                        // Create and trigger download
                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                        const link = document.createElement('a');
                        const url = URL.createObjectURL(blob);
                        link.setAttribute('href', url);
                        link.setAttribute('download', `logs_export_${new Date().toISOString().split('T')[0]}.csv`);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    },
                    className: 'px-4 py-2 bg-white text-tn-navy border border-tn-navy rounded hover:bg-tn-light-blue flex items-center space-x-2'
                }, [
                    e('span', { key: 'icon', className: 'text-sm' }, '📥'),
                    e('span', { key: 'text' }, 'Export CSV')
                ]),
                // Column Selector Button
                e('div', { className: 'relative' }, [
                    e('button', {
                        onClick: () => setShowColumnSelector(!showColumnSelector),
                        className: 'px-4 py-2 bg-white text-tn-navy border border-tn-navy rounded hover:bg-tn-light-blue'
                    }, 'Columns'),
                    // Column Selector Dropdown
                    showColumnSelector && e('div', {
                        className: 'absolute right-0 mt-2 w-64 bg-white border rounded-lg shadow-lg z-50 p-4'
                    }, [
                        e('h3', { 
                            key: 'title',
                            className: 'text-sm font-semibold text-gray-700 mb-2' 
                        }, 'Show/Hide Columns'),
                        ...visibleColumns.map(col => 
                            e('div', {
                                key: col.id,
                                className: 'flex items-center space-x-2 py-1'
                            }, [
                                e('input', {
                                    type: 'checkbox',
                                    id: col.id,
                                    checked: col.show,
                                    onChange: () => {
                                        setVisibleColumns(prev => 
                                            prev.map(c => 
                                                c.id === col.id ? {...c, show: !c.show} : c
                                            )
                                        );
                                    },
                                    className: 'text-tn-navy rounded focus:ring-tn-navy'
                                }),
                                e('label', {
                                    htmlFor: col.id,
                                    className: 'text-sm text-gray-700'
                                }, col.label)
                            ])
                        ),
                        e('div', {
                            key: 'buttons',
                            className: 'mt-4 pt-2 border-t flex justify-between'
                        }, [
                            e('button', {
                                onClick: () => {
                                    setVisibleColumns(prev => 
                                        prev.map(c => ({...c, show: true}))
                                    );
                                },
                                className: 'text-xs text-gray-600 hover:text-tn-navy'
                            }, 'Show All'),
                            e('button', {
                                onClick: () => {
                                    setVisibleColumns(prev => 
                                        prev.map(c => ({...c, show: false}))
                                    );
                                },
                                className: 'text-xs text-gray-600 hover:text-tn-navy'
                            }, 'Hide All')
                        ])
                    ])
                ]),
                // Refresh Button
                e('button', {
                    onClick: fetchLogs,
                    className: 'px-4 py-2 bg-tn-navy text-white rounded hover:bg-opacity-90'
                }, 'Refresh')
            ])
        ]),

        // Filter Controls
        e(FilterControls, { 
            key: 'filters',
            filters: filters,
            onFilterChange: setFilters,
            onReset: resetFilters
        }),

        // Results Count
        e('div', {
            key: 'results-count',
            className: 'mb-4 text-sm text-gray-600'
        }, `Showing ${filteredLogs.length} of ${logs.length} logs`),

        // Table
        e('div', { key: 'table', className: 'overflow-x-auto' }, [
            e('table', { className: 'min-w-full divide-y divide-gray-200' }, [
                e('thead', { className: 'bg-gray-50' },
                    e('tr', {}, 
                        visibleColumns
                            .filter(col => col.show)
                            .map(col =>
                                e('th', {
                                    key: col.id,
                                    className: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'
                                }, col.label)
                            )
                    )
                ),
                e('tbody', { className: 'bg-white divide-y divide-gray-200' },
                    filteredLogs.length > 0 
                        ? filteredLogs.map(log =>
                            e('tr', { key: log.id, className: 'hover:bg-gray-50' },
                                visibleColumns
                                    .filter(col => col.show)
                                    .map(col => {
                                        const cellContent = (() => {
                                            switch (col.id) {
                                                case 'timestamp':
                                                    return new Date(log.timestamp).toLocaleString();
                                                case 'model_name':
                                                    return log.model_name;
                                                case 'user_query':
                                                    return e('div', { className: 'max-w-xs truncate' }, log.user_query);
                                                case 'response_time_ms':
                                                    return `${log.response_time_ms}ms`;
                                                case 'token_count':
                                                    return log.token_count || 'N/A';
                                                case 'error_occurred':
                                                    return e('span', {
                                                        className: `px-2 py-1 rounded-full text-xs font-medium ${
                                                            log.error_occurred 
                                                                ? 'bg-red-100 text-red-800' 
                                                                : 'bg-green-100 text-green-800'
                                                        }`
                                                    }, log.error_occurred ? 'Error' : 'Success');
                                                case 'error_message':
                                                    return log.error_message || '-';
                                                default:
                                                    return 'N/A';
                                            }
                                        })();

                                        return e('td', {
                                            key: col.id,
                                            className: 'px-6 py-4 text-sm'
                                        }, cellContent);
                                    })
                            )
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