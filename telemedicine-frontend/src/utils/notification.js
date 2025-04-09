
// Request notification permissions
export const requestNotificationPermission = async () => {
    // Check if the browser supports notifications
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }
    
    // Check if permission is already granted
    if (Notification.permission === 'granted') {
      return true;
    }
    
    // Request permission if not denied
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    
    return false;
  };
  
  // Send a notification
  export const sendNotification = (title, options = {}) => {
    // Check if notifications are supported and permitted
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      console.log('Notifications not supported or permission not granted');
      return false;
    }
    
    // Default options
    const defaultOptions = {
      icon: '/logo192.png', // Path to your notification icon
      badge: '/logo192.png',
      vibrate: [200, 100, 200],
      requireInteraction: false
    };
    
    // Create and show notification
    try {
      const notification = new Notification(title, { ...defaultOptions, ...options });
      
      // Handle notification click
      notification.onclick = function() {
        // Focus on the window/tab
        window.focus();
        
        // Execute custom click handler if provided
        if (options.onClick) {
          options.onClick();
        }
        
        // Close the notification
        this.close();
      };
      
      return notification;
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  };
  
  // Create a notification for appointment reminders
  export const sendAppointmentReminder = (appointment) => {
    if (!appointment) return;
    
    const { doctor, date, time } = appointment;
    const doctorName = doctor?.name || 'your doctor';
    const formattedDate = new Date(date).toLocaleDateString();
    
    return sendNotification(
      'Appointment Reminder',
      {
        body: `Your appointment with Dr. ${doctorName} is scheduled for ${formattedDate} at ${time}.`,
        tag: `appointment-${appointment._id}`, // Ensures only one notification per appointment
        data: {
          appointmentId: appointment._id,
          type: 'appointment-reminder'
        },
        onClick: () => {
          // Navigate to appointment details
          window.location.href = `/appointment/${appointment._id}`;
        }
      }
    );
  };
  
  // Create a notification for new messages
  export const sendMessageNotification = (message) => {
    if (!message) return;
    
    const { sender, content } = message;
    const senderName = sender?.name || 'Someone';
    
    // Truncate message if too long
    const truncatedContent = content.length > 50 
      ? content.substring(0, 47) + '...' 
      : content;
    
    return sendNotification(
      `New Message from ${senderName}`,
      {
        body: truncatedContent,
        tag: `message-${message._id}`, // Ensures only one notification per message
        data: {
          messageId: message._id,
          appointmentId: message.appointmentId,
          type: 'new-message'
        },
        onClick: () => {
          // Navigate to chat
          window.location.href = `/chat/${message.appointmentId}`;
        }
      }
    );
  };
  
  // Schedule a notification for a future time
  export const scheduleNotification = (title, options = {}, delayInMinutes = 0) => {
    if (delayInMinutes <= 0) {
      return sendNotification(title, options);
    }
    
    const delayInMs = delayInMinutes * 60 * 1000;
    
    // Store the scheduled notification in localStorage
    const scheduledTime = Date.now() + delayInMs;
    const notification = {
      title,
      options,
      scheduledTime
    };
    
    // Get existing scheduled notifications
    const scheduledNotifications = JSON.parse(localStorage.getItem('scheduledNotifications') || '[]');
    scheduledNotifications.push(notification);
    localStorage.setItem('scheduledNotifications', JSON.stringify(scheduledNotifications));
    
    // Set up timeout to send the notification
    const timeoutId = setTimeout(() => {
      sendNotification(title, options);
      
      // Remove from localStorage
      removeScheduledNotification(scheduledTime);
    }, delayInMs);
    
    // Return the timeout ID for potential cancellation
    return timeoutId;
  };
  
  // Remove a scheduled notification
  export const removeScheduledNotification = (scheduledTime) => {
    // Get existing scheduled notifications
    const scheduledNotifications = JSON.parse(localStorage.getItem('scheduledNotifications') || '[]');
    
    // Filter out the notification with the specified scheduledTime
    const updatedNotifications = scheduledNotifications.filter(
      notification => notification.scheduledTime !== scheduledTime
    );
    
    // Update localStorage
    localStorage.setItem('scheduledNotifications', JSON.stringify(updatedNotifications));
  };
  
  // Check for any pending scheduled notifications on application start
  export const checkScheduledNotifications = () => {
    const scheduledNotifications = JSON.parse(localStorage.getItem('scheduledNotifications') || '[]');
    const now = Date.now();
    
    // Process each scheduled notification
    scheduledNotifications.forEach(notification => {
      const { title, options, scheduledTime } = notification;
      
      if (scheduledTime <= now) {
        // Send immediately if it's already past the scheduled time
        sendNotification(title, options);
        removeScheduledNotification(scheduledTime);
      } else {
        // Schedule for the future
        const delayInMs = scheduledTime - now;
        setTimeout(() => {
          sendNotification(title, options);
          removeScheduledNotification(scheduledTime);
        }, delayInMs);
      }
    });
  };