// Get React methods from global scope
const { useState, useEffect } = React;
const { createElement: e } = React; 

// Define monitoring dashboard component
function MonitoringDashboard() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        console.log('Component mounted, fetching logs...');
        fetchLogs();
    }, []);

    async function fetchLogs() {
        try {
            setLoading(true);
            const response = await fetch('http://localhost:3000/api/logs');
            if (!response.ok) {
                throw new Error('Failed to fetch logs');
            }
            const data = await response.json();
            console.log('Received logs:', data);
            setLogs(data.logs);
            setError(null);
        } catch (err) {
            console.error('Error fetching logs:', err);
            setError('Failed to load logs. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    // Loading state
    if (loading) {
        return e('div', { className: 'flex justify-center items-center p-8' },
            e('div', { className: 'animate-spin rounded-full h-8 w-8 border-b-2 border-tn-navy' })
        );
    }

    // Error state
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

    // Main component render
    return e('div', { className: 'p-6' }, [
        // Header section
        e('div', { 
            key: 'header',
            className: 'flex justify-between items-center mb-6' 
        }, [
            e('h2', { 
                className: 'text-xl font-semibold text-tn-navy' 
            }, 'System Logs'),
            e('button', {
                onClick: fetchLogs,
                className: 'px-4 py-2 bg-tn-navy text-white rounded hover:bg-opacity-90'
            }, 'Refresh')
        ]),

        // Table section
        e('div', { 
            key: 'table-container',
            className: 'overflow-x-auto' 
        }, [
            e('table', { className: 'min-w-full divide-y divide-gray-200' }, [
                // Table header
                e('thead', {}, e('tr', { className: 'bg-gray-50' }, [
                    // Define headers
                    [
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
                    )
                ])),
                // Table body
                e('tbody', { className: 'divide-y divide-gray-200' },
                    logs.length ? logs.map(log =>
                        e('tr', { key: log.id, className: 'hover:bg-gray-50' }, [
                            e('td', { className: 'px-6 py-4 text-sm text-gray-500' },
                                new Date(log.timestamp).toLocaleString()
                            ),
                            e('td', { className: 'px-6 py-4 text-sm' },
                                log.model_name
                            ),
                            e('td', { className: 'px-6 py-4 text-sm' },
                                e('div', { className: 'max-w-xs truncate' },
                                    log.user_query
                                )
                            ),
                            e('td', { className: 'px-6 py-4 text-sm' },
                                e('div', { className: 'max-w-xs truncate' },
                                    log.model_response
                                )
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
                    ) : e('tr', {}, 
                        e('td', { 
                            colSpan: 5,
                            className: 'px-6 py-8 text-center text-gray-500'
                        }, 'No logs found. Try making some queries in the chat interface.')
                    )
                )
            ])
        ])
    ]);
}
window.MonitoringDashboard = MonitoringDashboard;
console.log('MonitoringDashboard component has been registered');