const FileList = () => {
    const [files, setFiles] = React.useState([]);
    const [error, setError] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [deleteStatus, setDeleteStatus] = React.useState(null);

    const fetchFiles = async () => {
        try {
            setLoading(true);
            const response = await fetch('http://localhost:3000/api/files');
            if (!response.ok) {
                throw new Error('Failed to fetch files');
            }
            const data = await response.json();
            setFiles(data.files);
            setError(null);
        } catch (err) {
            setError('Failed to load files');
            console.error('Error fetching files:', err);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchFiles();
    }, []);

    const handleDelete = async (filename) => {
        if (!confirm(`Are you sure you want to delete ${filename}?`)) {
            return;
        }

        try {
            const response = await fetch(`http://localhost:3000/api/files/${encodeURIComponent(filename)}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Failed to delete file');
            }

            setDeleteStatus({ type: 'success', message: 'File deleted successfully' });
            fetchFiles(); // Refresh the file list
        } catch (err) {
            setDeleteStatus({ type: 'error', message: 'Failed to delete file' });
            console.error('Error deleting file:', err);
        }

        // Clear status message after 3 seconds
        setTimeout(() => setDeleteStatus(null), 3000);
    };

    const formatFileSize = (bytes) => {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(1)} ${units[unitIndex]}`;
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    if (loading) {
        return React.createElement('div', {
            className: 'text-center py-4'
        }, 'Loading files...');
    }

    if (error) {
        return React.createElement('div', {
            className: 'text-red-600 py-4'
        }, error);
    }

    return React.createElement('div', {
        className: 'mt-8'
    }, [
        // Header
        React.createElement('div', {
            key: 'header',
            className: 'flex justify-between items-center mb-4'
        }, [
            React.createElement('h3', {
                className: 'text-lg font-semibold text-tn-navy'
            }, 'Uploaded Files'),
            React.createElement('button', {
                onClick: fetchFiles,
                className: 'text-sm text-tn-navy hover:text-tn-dark-blue'
            }, 'Refresh')
        ]),

        // Status Message
        deleteStatus && React.createElement('div', {
            key: 'status',
            className: `p-4 mb-4 rounded-md ${
                deleteStatus.type === 'success' 
                    ? 'bg-green-50 text-green-600' 
                    : 'bg-red-50 text-red-600'
            }`
        }, deleteStatus.message),

        // Files table
        files.length === 0 
            ? React.createElement('p', {
                key: 'no-files',
                className: 'text-gray-500 text-center py-4'
            }, 'No files uploaded yet')
            : React.createElement('div', {
                key: 'files-table',
                className: 'bg-white rounded-lg shadow overflow-hidden'
            }, [
                React.createElement('table', {
                    className: 'min-w-full divide-y divide-gray-200'
                }, [
                    // Table header
                    React.createElement('thead', {
                        className: 'bg-gray-50'
                    }, 
                        React.createElement('tr', {}, [
                            React.createElement('th', {
                                className: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                            }, 'Name'),
                            React.createElement('th', {
                                className: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                            }, 'Size'),
                            React.createElement('th', {
                                className: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                            }, 'Upload Date'),
                            React.createElement('th', {
                                className: 'px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'
                            }, 'Actions')
                        ])
                    ),
                    // Table body
                    React.createElement('tbody', {
                        className: 'bg-white divide-y divide-gray-200'
                    }, files.map((file, index) =>
                        React.createElement('tr', {
                            key: file.name,
                            className: index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }, [
                            React.createElement('td', {
                                className: 'px-6 py-4 whitespace-nowrap text-sm text-gray-900'
                            }, file.name),
                            React.createElement('td', {
                                className: 'px-6 py-4 whitespace-nowrap text-sm text-gray-500'
                            }, formatFileSize(file.size)),
                            React.createElement('td', {
                                className: 'px-6 py-4 whitespace-nowrap text-sm text-gray-500'
                            }, formatDate(file.uploadDate)),
                            React.createElement('td', {
                                className: 'px-6 py-4 whitespace-nowrap text-sm text-right'
                            }, 
                                React.createElement('div', {
                                    className: 'flex justify-end space-x-3'
                                }, [
                                    React.createElement('a', {
                                        key: 'download',
                                        href: `http://localhost:3000/download/${encodeURIComponent(file.name)}`,
                                        className: 'text-tn-navy hover:text-tn-dark-blue',
                                        download: true
                                    }, 'Download'),
                                    React.createElement('button', {
                                        key: 'delete',
                                        onClick: () => handleDelete(file.name),
                                        className: 'text-red-600 hover:text-red-800'
                                    }, 'Delete')
                                ])
                            )
                        ])
                    ))
                ])
            ])
    ]);
};