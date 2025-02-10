const ChatInterface = () => {
    const [messages, setMessages] = React.useState([]);
    const [inputValue, setInputValue] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [selectedModel, setSelectedModel] = React.useState('llama3.2');
    const messagesEndRef = React.useRef(null);

    // Available Ollama models
    const availableModels = [
        { id: 'llama3.2', name: 'Llama 3.2' }
    ];

    // Auto-scroll to bottom of chat
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    React.useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Initialize highlight.js for code blocks
    React.useEffect(() => {
        // Highlight all code blocks after render
        document.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightBlock(block);
        });
    }, [messages]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        const userMessage = {
            role: 'user',
            content: inputValue.trim()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            const response = await fetch('http://localhost:3000/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: selectedModel,
                    message: userMessage.content,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to get response from Ollama');
            }

            const data = await response.json();
            
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.response
            }]);
        } catch (error) {
            console.error('Error:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, there was an error processing your request. Please try again.'
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    // Helper function to process text formatting
    const processTextFormatting = (text) => {
        // Handle bold text (both ** and __ syntax)
        let processed = text;
        
        // Replace **text** with bold elements
        processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Replace __text__ with bold elements (alternative syntax)
        processed = processed.replace(/__(.*?)__/g, '<strong>$1</strong>');
        
        return processed;
    };

    // Function to format message content with code highlighting and text formatting
    const formatMessage = (content) => {
        // Split content into code and non-code parts
        const parts = content.split(/(```[\s\S]*?```)/g);
        
        return parts.map((part, index) => {
            if (part.startsWith('```') && part.endsWith('```')) {
                // Handle code blocks
                const [firstLine, ...rest] = part.slice(3, -3).split('\n');
                const language = firstLine.trim() || 'plaintext';
                const code = rest.join('\n');
                
                return React.createElement('pre', { key: index },
                    React.createElement('code', {
                        className: `language-${language}`,
                    }, code)
                );
            } else {
                // Handle regular text with formatting
                const formattedText = processTextFormatting(part);
                return React.createElement('p', { 
                    key: index,
                    className: 'whitespace-pre-wrap',
                    dangerouslySetInnerHTML: { __html: formattedText }
                });
            }
        });
    };

    return React.createElement('div', {
        className: 'flex flex-col h-full'
    }, [
        // Model selector
        React.createElement('div', {
            key: 'model-selector',
            className: 'mb-4'
        }, [
            React.createElement('label', {
                className: 'block text-sm font-medium text-gray-700 mb-1'
            }, 'Select Model:'),
            React.createElement('select', {
                value: selectedModel,
                onChange: (e) => setSelectedModel(e.target.value),
                className: 'block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-tn-navy focus:border-tn-navy sm:text-sm'
            }, availableModels.map(model => 
                React.createElement('option', {
                    key: model.id,
                    value: model.id
                }, model.name)
            ))
        ]),

        // Chat messages container
        React.createElement('div', {
            key: 'messages',
            className: 'flex-1 overflow-y-auto mb-4 space-y-4 border rounded-lg p-4'
        }, [
            ...messages.map((message, index) => 
                React.createElement('div', {
                    key: index,
                    className: `flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`
                },
                    React.createElement('div', {
                        className: `max-w-[80%] rounded-lg p-3 ${
                            message.role === 'user' 
                                ? 'bg-tn-navy text-white' 
                                : 'bg-gray-100 text-gray-900'
                        }`
                    }, formatMessage(message.content))
                )
            ),
            // Loading indicator
            isLoading && React.createElement('div', {
                key: 'loading',
                className: 'flex items-center space-x-2 text-gray-500'
            }, [
                React.createElement('div', {
                    key: 'spinner',
                    className: 'animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500'
                }),
                React.createElement('span', {}, 'Thinking...')
            ]),
            // Invisible element for auto-scroll
            React.createElement('div', {
                key: 'scroll-anchor',
                ref: messagesEndRef
            })
        ]),

        // Input form
        React.createElement('form', {
            key: 'input-form',
            onSubmit: handleSubmit,
            className: 'flex space-x-4'
        }, [
            React.createElement('input', {
                type: 'text',
                value: inputValue,
                onChange: (e) => setInputValue(e.target.value),
                disabled: isLoading,
                className: 'flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-tn-navy',
                placeholder: 'Type your message...'
            }),
            React.createElement('button', {
                type: 'submit',
                disabled: isLoading || !inputValue.trim(),
                className: `px-4 py-2 bg-tn-navy text-white rounded-lg 
                    ${(isLoading || !inputValue.trim()) 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'hover:bg-tn-dark-blue'}`
            }, 'Send')
        ])
    ]);
};