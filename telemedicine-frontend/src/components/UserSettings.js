import React, { useState, useEffect } from 'react';
import { applyTheme } from '../utils/theme';

const UserSettings = ({ user }) => {
  // State for user settings
  const [settings, setSettings] = useState({
    notifications: {
      appointmentReminders: true,
      messageNotifications: true,
    },
    videoCall: {
      autoEnableCamera: true,
      autoEnableMicrophone: true,
    },
    appearance: {
      theme: 'light',
    }
  });
  
  // Loading and saving states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  
  useEffect(() => {
    // Only check localStorage
    const loadSettings = () => {
      try {
        const storedSettings = localStorage.getItem('userSettings');
        
        if (storedSettings) {
          const parsedSettings = JSON.parse(storedSettings);
          setSettings(parsedSettings);
          
          // Apply the saved theme immediately
          if (parsedSettings.appearance && parsedSettings.appearance.theme) {
            applyTheme(parsedSettings.appearance.theme);
          }
        }
      } catch (err) {
        console.error('Error loading settings:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadSettings();
  }, []);
  
  // Handle notifications changes
  const handleNotificationChange = (e) => {
    const { name, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [name]: checked
      }
    }));
    
    // Show immediate feedback
    setSavedMessage('Changes will be saved when you click "Save Settings"');
  };
  
  // Handle video call settings changes
  const handleVideoCallChange = (e) => {
    const { name, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      videoCall: {
        ...prev.videoCall,
        [name]: checked
      }
    }));
    
    // Show immediate feedback
    setSavedMessage('Changes will be saved when you click "Save Settings"');
  };
  
  // Handle appearance changes
  const handleAppearanceChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      appearance: {
        ...prev.appearance,
        [name]: value
      }
    }));
    
    // Apply theme change immediately
    if (name === 'theme') {
      applyTheme(value);
      // Show immediate feedback about applied theme
      setSavedMessage(`${value.charAt(0).toUpperCase() + value.slice(1)} theme applied! Click "Save Settings" to save this preference.`);
    }
  };
  
  // Save settings
  const saveSettings = () => {
    setSaving(true);
    
    try {
      // Save to localStorage only
      localStorage.setItem('userSettings', JSON.stringify(settings));
      
      setSavedMessage('Settings saved successfully! Your preferences will be remembered next time you visit.');
      
      // Clear saved message after 5 seconds
      setTimeout(() => {
        setSavedMessage('');
      }, 5000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setSavedMessage('Error saving settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="bg-white p-6 rounded-lg shadow mb-6">
      <h3 className="text-xl font-semibold mb-4">Settings</h3>
      <p className="text-gray-600 mb-4">Manage your account settings and preferences.</p>
      
      <div className="space-y-6">
        {/* Account Settings */}
        <div>
          <h4 className="text-lg font-medium mb-2">Account Settings</h4>
          <div className="border rounded-lg p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Notifications</label>
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="appointmentReminders"
                  name="appointmentReminders"
                  checked={settings.notifications.appointmentReminders}
                  onChange={handleNotificationChange}
                  className="h-4 w-4 text-blue-600 rounded" 
                />
                <span className="ml-2 text-sm text-gray-600">Receive appointment reminders</span>
              </div>
              <div className="flex items-center mt-2">
                <input 
                  type="checkbox" 
                  id="messageNotifications"
                  name="messageNotifications"
                  checked={settings.notifications.messageNotifications}
                  onChange={handleNotificationChange}
                  className="h-4 w-4 text-blue-600 rounded" 
                />
                <span className="ml-2 text-sm text-gray-600">Receive message notifications</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Video Call Settings</label>
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="autoEnableCamera"
                  name="autoEnableCamera"
                  checked={settings.videoCall.autoEnableCamera}
                  onChange={handleVideoCallChange}
                  className="h-4 w-4 text-blue-600 rounded" 
                />
                <span className="ml-2 text-sm text-gray-600">Auto-enable camera when joining</span>
              </div>
              <div className="flex items-center mt-2">
                <input 
                  type="checkbox" 
                  id="autoEnableMicrophone"
                  name="autoEnableMicrophone"
                  checked={settings.videoCall.autoEnableMicrophone}
                  onChange={handleVideoCallChange}
                  className="h-4 w-4 text-blue-600 rounded" 
                />
                <span className="ml-2 text-sm text-gray-600">Auto-enable microphone when joining</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Appearance */}
        <div>
          <h4 className="text-lg font-medium mb-2">Appearance</h4>
          <div className="border rounded-lg p-4">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Theme</label>
              <select 
                name="theme"
                value={settings.appearance.theme}
                onChange={handleAppearanceChange}
                className="block w-full p-2 border rounded-md"
              >
                <option value="light">Light (Default)</option>
                <option value="dark">Dark</option>
                <option value="system">System Preference</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Changes are applied immediately but not saved until you click "Save Settings"
              </p>
            </div>
            
            <button 
              onClick={saveSettings}
              disabled={saving}
              className={`px-4 py-2 ${saving ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-md transition`}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            
            {savedMessage && (
              <div className={`mt-2 p-2 rounded text-sm ${
                savedMessage.includes('Error') 
                  ? 'bg-red-100 text-red-700'
                  : savedMessage.includes('save')
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-green-100 text-green-700'
              }`}>
                {savedMessage}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSettings;