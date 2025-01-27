const Sidebar = () => {
    const menuItems = [
        // Add new elements to the Sidebar using the template below:
        { id: 'files', label: 'Document Management', icon: '📁', path: '/files', active: true }, // Are emojis allowed?
    ];

    return React.createElement('aside', {
        id: 'sidebar',
        style: { pointerEvents: 'all' },
        className: 'bg-tn-navy text-white h-screen fixed left-0 top-0 w-0 transition-all duration-300 ease-in-out overflow-hidden'
    }, 
        React.createElement('div', {
            className: 'w-64 h-full'
        }, [
            // Sidebar Header
            React.createElement('div', {
                key: 'header',
                className: 'py-4 px-4 text-lg font-semibold whitespace-nowrap mt-16 border-b border-tn-dark-blue'
            }, 'Server Configuration'),

            // Navigation Menu
            React.createElement('nav', {
                key: 'nav',
                className: 'py-4' // Removed mt-16 since we have the header now
            }, 
                React.createElement('ul', {
                    className: 'space-y-2'
                }, menuItems.map(item => 
                    React.createElement('li', {
                        key: item.id,
                        className: `px-4 py-2 cursor-pointer whitespace-nowrap ${
                            item.active 
                                ? 'bg-tn-dark-blue text-tn-gold' 
                                : 'hover:bg-tn-dark-blue hover:text-tn-gold'
                        }`
                    }, [
                        React.createElement('span', {
                            key: 'icon',
                            className: 'inline-block w-6 text-center'
                        }, item.icon),
                        React.createElement('span', {
                            key: 'label',
                            className: 'ml-2 inline-block'
                        }, item.label)
                    ])
                ))
            ),

            // Bottom Section
            React.createElement('div', {
                key: 'bottom',
                className: 'absolute bottom-0 left-0 right-0 p-4 border-t border-tn-dark-blue'
            }, 
                React.createElement('div', {
                    className: 'flex items-center space-x-2'
                }, [
                    React.createElement('span', {
                        key: 'status',
                        className: 'inline-block w-2 h-2 bg-green-500 rounded-full'
                    }),
                    React.createElement('span', {
                        key: 'text',
                        className: 'text-sm whitespace-nowrap'
                    }, 'Server Connected')
                ])
            )
        ])
    );
};