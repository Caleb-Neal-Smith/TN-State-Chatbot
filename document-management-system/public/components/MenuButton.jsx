const MenuButton = () => {
    const [isOpen, setIsOpen] = React.useState(false);

    const handleToggle = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(!isOpen);
        
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.style.width = !isOpen ? '256px' : '0';
        }
        
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.style.marginLeft = !isOpen ? '256px' : '0';
        }
    };

    return React.createElement('button', {
        onClick: handleToggle,
        className: 'p-2 hover:bg-tn-dark-blue rounded-lg cursor-pointer text-white relative'
    }, 
        React.createElement('svg', {
            width: '24',
            height: '24',
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: '2',
            strokeLinecap: 'round',
            strokeLinejoin: 'round'
        }, [
            React.createElement('line', {
                key: 'line1',
                x1: '3',
                y1: '12',
                x2: '21',
                y2: '12'
            }),
            React.createElement('line', {
                key: 'line2',
                x1: '3',
                y1: '6',
                x2: '21',
                y2: '6'
            }),
            React.createElement('line', {
                key: 'line3',
                x1: '3',
                y1: '18',
                x2: '21',
                y2: '18'
            })
        ])
    );
};