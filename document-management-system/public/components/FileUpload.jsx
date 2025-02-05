const FileUpload = () => {
    const [selectedFiles, setSelectedFiles] = React.useState([]);
    const [uploadStatus, setUploadStatus] = React.useState('idle');
    const [errorMessage, setErrorMessage] = React.useState('');
    const fileInputRef = React.useRef(null);
  
    const validateFile = (file) => {
      if (file.size > 10 * 1024 * 1024) {
        return 'File size exceeds 10MB limit';
      }
  
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png'
      ];
  
      if (!allowedTypes.includes(file.type)) {
        return 'Invalid file type. Only PDF, DOC, DOCX, JPG, and PNG files are allowed.';
      }
  
      return null;
    };
  
    const handleFileSelect = (event) => {
      const files = Array.from(event.target.files);
      const validFiles = [];
      const errors = [];
  
      files.forEach(file => {
        const error = validateFile(file);
        if (error) {
          errors.push(`${file.name}: ${error}`);
        } else {
          validFiles.push(file);
        }
      });
  
      if (errors.length > 0) {
        setErrorMessage(errors.join('\n'));
      } else {
        setErrorMessage('');
      }
  
      setSelectedFiles(prevFiles => [...prevFiles, ...validFiles]);
      setUploadStatus('idle');
    };
  
    const handleUpload = async () => {
      if (selectedFiles.length === 0) {
        setErrorMessage('Please select files first');
        return;
      }
  
      setUploadStatus('uploading');
      
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });
  
      try {
        const response = await fetch('http://localhost:3000/api/upload', {
          method: 'POST',
          body: formData,
        });
  
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Upload failed');
        }
  
        const result = await response.json();
        setUploadStatus('success');
        setSelectedFiles([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        setUploadStatus('error');
        setErrorMessage(error.message || 'Failed to upload files. Please try again.');
      }
    };
  
    const removeFile = (index) => {
      setSelectedFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
      setErrorMessage('');
    };
  
    const clearFiles = () => {
      setSelectedFiles([]);
      setErrorMessage('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
  
    return React.createElement('form', {
      className: "space-y-4",
      onSubmit: (e) => {
        e.preventDefault();
        handleUpload();
      }
    }, [
      // Dropzone
      React.createElement('div', {
        key: "dropzone",
        className: "flex items-center justify-center w-full"
      }, 
        React.createElement('label', {
          className: "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 border-tn-navy"
        }, [
          React.createElement('div', {
            key: "label-content",
            className: "flex flex-col items-center justify-center pt-5 pb-6"
          }, [
            React.createElement('p', {
              key: "dropzone-text",
              className: "mb-2 text-sm text-gray-500"
            }, [
              React.createElement('span', {
                key: "click-text",
                className: "font-semibold"
              }, "Click to upload"),
              " or drag and drop"
            ]),
            React.createElement('p', {
              key: "file-types",
              className: "text-xs text-gray-500"
            }, "Multiple files supported: PDF, DOC, DOCX, JPG, PNG (max 10MB each)")
          ]),
          React.createElement('input', {
            key: "file-input",
            ref: fileInputRef,
            type: "file",
            multiple: true,
            className: "hidden",
            onChange: handleFileSelect,
            accept: ".pdf,.doc,.docx,.jpg,.jpeg,.png"
          })
        ])
      ),
  
      // Selected Files List
      selectedFiles.length > 0 && React.createElement('div', {
        key: "files-list",
        className: "space-y-2"
      }, [
        // Files header
        React.createElement('div', {
          key: "files-header",
          className: "flex justify-between items-center"
        }, [
          React.createElement('span', {
            className: "text-sm font-medium text-gray-700"
          }, `Selected Files (${selectedFiles.length})`),
          React.createElement('button', {
            type: "button",
            onClick: clearFiles,
            className: "text-sm text-red-600 hover:text-red-800"
          }, "Clear All")
        ]),
        // Individual files
        ...selectedFiles.map((file, index) => 
          React.createElement('div', {
            key: `file-${index}`,
            className: "flex items-center justify-between p-2 bg-gray-50 rounded"
          }, [
            React.createElement('span', {
              key: "filename",
              className: "text-sm text-gray-600 truncate"
            }, file.name),
            React.createElement('button', {
              key: "remove-button",
              type: "button",
              onClick: () => removeFile(index),
              className: "p-1 hover:bg-gray-200 rounded"
            }, "Remove")
          ])
        )
      ]),
  
      // Upload Button
      React.createElement('button', {
        key: "upload-button",
        type: "submit",
        disabled: selectedFiles.length === 0 || uploadStatus === 'uploading',
        className: "w-full py-2 px-4 bg-" + (selectedFiles.length === 0 ? "gray-300" : "tn-navy") + 
                  " text-white rounded-md " + (selectedFiles.length === 0 ? "cursor-not-allowed" : "hover:bg-tn-dark-blue")
      }, uploadStatus === 'uploading' ? `Uploading ${selectedFiles.length} files...` : "Upload"),
  
      // Success Message
      uploadStatus === 'success' && React.createElement('div', {
        key: "success-message",
        className: "p-4 bg-green-50 border-green-200 rounded-md text-green-600"
      }, "Files uploaded successfully!"),
  
      // Error Message
      errorMessage && React.createElement('div', {
        key: "error-message",
        className: "p-4 bg-red-50 border-red-200 rounded-md text-red-600 whitespace-pre-line"
      }, errorMessage)
    ]);
  };