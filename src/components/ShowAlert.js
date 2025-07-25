import React from 'react';
import { Platform, Alert, Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createRoot } from 'react-dom/client';

// Imperative Alert Component
const ImperativeAlert = ({ title, message, buttons, onClose }) => {
  const handleButtonPress = (button) => {
    onClose();
    if (button.onPress) {
      button.onPress();
    }
  };

  return (
    <Modal
      transparent
      visible={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.alertContainer}>
          {title && <Text style={styles.title}>{title}</Text>}
          {message && <Text style={styles.message}>{message}</Text>}
          
          <View style={styles.buttonContainer}>
            {buttons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.button,
                  button.style === 'destructive' && styles.destructiveButton,
                  button.style === 'cancel' && styles.cancelButton,
                  buttons.length === 1 && styles.singleButton
                ]}
                onPress={() => handleButtonPress(button)}
              >
                <Text style={[
                  styles.buttonText,
                  button.style === 'destructive' && styles.destructiveText,
                  button.style === 'cancel' && styles.cancelText
                ]}>
                  {button.text || 'OK'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

// The main function - drop-in replacement for Alert.alert
export const showAlert = (title, message, buttons = [{ text: 'OK' }]) => {
  if (Platform.OS === 'web') {
    showWebAlert(title, message, buttons);
  } else {
    Alert.alert(title, message, buttons);
  }
};

// Web-specific imperative alert function
const showWebAlert = (title, message, buttons) => {
  // Create a container div
  const alertContainer = document.createElement('div');
  document.body.appendChild(alertContainer);
  
  // Create React root
  const root = createRoot(alertContainer);
  
  const handleClose = () => {
    // Clean up: unmount and remove from DOM
    root.unmount();
    document.body.removeChild(alertContainer);
  };
  
  // Limit to 2 buttons and render the alert
  const limitedButtons = buttons.slice(0, 2);
  
  root.render(
    <WebAlertComponent 
      title={title}
      message={message}
      buttons={limitedButtons}
      onClose={handleClose}
    />
  );
};

// Web Alert Component (since we can't use React Native Modal on web)
const WebAlertComponent = ({ title, message, buttons, onClose }) => {
  const handleButtonPress = (button) => {
    onClose();
    if (button.onPress) {
      button.onPress();
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}
      onClick={handleOverlayClick}
    >
      <div style={{
        backgroundColor: 'white',
        borderRadius: '14px',
        padding: '20px',
        minWidth: '280px',
        maxWidth: '320px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.25)'
      }}>
        {title && (
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            textAlign: 'left',
            marginBottom: '10px',
            margin: 0,
            color: '#000'
          }}>
            {title}
          </h3>
        )}
        {message && (
          <p style={{
            fontSize: '16px',
            textAlign: 'center',
            marginBottom: '20px',
            margin: '0 0 20px 0',
            color: '#333',
            lineHeight: '22px'
          }}>
            {message}
          </p>
        )}
        
        <div style={{
          display: 'flex',
          gap: '10px',
          justifyContent: buttons.length === 1 ? 'center' : 'space-between'
        }}>
          {buttons.map((button, index) => (
            <button
              key={index}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                backgroundColor: 
                  button.style === 'destructive' ? '#FF3B30' :
                  button.style === 'cancel' ? '#8E8E93' : '#007AFF',
                color: 'white',
                maxWidth: buttons.length === 1 ? '120px' : 'none'
              }}
              onClick={() => handleButtonPress(button)}
              onMouseOver={(e) => {
                const darker = {
                  '#FF3B30': '#E6342A',
                  '#8E8E93': '#7D7D82',
                  '#007AFF': '#0056CC'
                };
                e.target.style.backgroundColor = darker[e.target.style.backgroundColor] || '#0056CC';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = 
                  button.style === 'destructive' ? '#FF3B30' :
                  button.style === 'cancel' ? '#8E8E93' : '#007AFF';
              }}
            >
              {button.text || 'OK'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// Example usage
export const AlertExample = () => {
  const handleSimpleAlert = () => {
    showAlert('Success', 'Operation completed successfully!');
  };

  const handleConfirmAlert = () => {
    showAlert(
      'Confirm Delete',
      'Are you sure you want to delete this item? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => console.log('Delete cancelled')
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => console.log('Item deleted!')
        }
      ]
    );
  };

  const handleCustomAlert = () => {
    showAlert(
      'Save Changes',
      'Do you want to save your changes before leaving?',
      [
        {
          text: 'Discard',
          style: 'cancel',
          onPress: () => console.log('Changes discarded')
        },
        {
          text: 'Save',
          onPress: () => console.log('Changes saved!')
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Imperative Alert Demo</Text>
      <Text style={styles.subtitle}>
        No need to mount anything at root! Works exactly like Alert.alert
      </Text>
      
      <TouchableOpacity style={styles.demoButton} onPress={handleSimpleAlert}>
        <Text style={styles.demoButtonText}>Simple Alert</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.demoButton} onPress={handleConfirmAlert}>
        <Text style={styles.demoButtonText}>Destructive Alert</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.demoButton} onPress={handleCustomAlert}>
        <Text style={styles.demoButtonText}>Custom Buttons</Text>
      </TouchableOpacity>

      <View style={styles.usage}>
        <Text style={styles.usageTitle}>Usage:</Text>
        <Text style={styles.usageText}>
          Just replace Alert.alert with showAlert - same exact API!
        </Text>
        <Text style={styles.usageCode}>
          showAlert('Title', 'Message', buttons);
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5'
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333'
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    maxWidth: 300
  },
  demoButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginVertical: 8,
    minWidth: 250,
    alignItems: 'center'
  },
  demoButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  usage: {
    marginTop: 30,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    maxWidth: 300
  },
  usageTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333'
  },
  usageText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10
  },
  usageCode: {
    fontSize: 12,
    fontFamily: 'monospace',
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 4,
    color: '#333'
  },
  
  // Alert styles (for React Native version)
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  alertContainer: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 20,
    minWidth: 280,
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
    color: '#000'
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
    lineHeight: 22
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 5,
    backgroundColor: '#007AFF',
    alignItems: 'center'
  },
  singleButton: {
    marginHorizontal: 0
  },
  cancelButton: {
    backgroundColor: '#8E8E93'
  },
  destructiveButton: {
    backgroundColor: '#FF3B30'
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white'
  },
  cancelText: {
    color: 'white'
  },
  destructiveText: {
    color: 'white'
  }
});

export default AlertExample;
